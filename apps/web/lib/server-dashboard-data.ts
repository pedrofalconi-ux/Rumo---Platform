import { db } from '@rumo/db';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { agencyLogoProxyUrl, extractAgencyLogoPath } from './agency-logo';
import {
  getAgencySettings,
  getUserById,
  listUsersForAgency,
  type AccountUser,
} from './server-account-store';
import { getCurrentSession } from './server-auth';
import { listTripSummariesForAgency, type TripSummaryRecord } from './server-trip-store';
import type { ShellSettings, ShellUser } from '../components/app-shell-context';

export interface DashboardSummary {
  counts: {
    totalTrips: number;
    totalClients: number;
    totalUsers: number;
    activeTrips: number;
  };
  recentTrips: Array<{
    id: string;
    name: string;
    status: string;
    destination: string;
    startDate: string;
    endDate: string;
    clientName: string;
  }>;
}

export interface DashboardShellData {
  user: ShellUser | null;
  settings: ShellSettings | null;
  agencyId: string;
  legacyAgencyId: string;
}

interface AgencyDashboardRow {
  id: string;
  name: string;
  logo_url?: string | null;
  settings?: Record<string, unknown> | null;
  team?: Array<{ id: string; deleted_at?: string | null }>;
  clients?: Array<{ id: string; deleted_at?: string | null }>;
  itineraries?: Array<{
    id: string;
    title?: string | null;
    destination?: string | null;
    destinations?: unknown;
    start_date?: string | null;
    end_date?: string | null;
    status?: string | null;
    client_name?: string | null;
    created_at?: string | null;
    deleted_at?: string | null;
  }>;
}

interface DashboardUserRow {
  id: string;
  agency_id: string | null;
  role: string;
  full_name: string;
  avatar_url?: string | null;
  agency?: AgencyDashboardRow | null;
}

const EMPTY_SUMMARY: DashboardSummary = {
  counts: { totalTrips: 0, totalClients: 0, totalUsers: 0, activeTrips: 0 },
  recentTrips: [],
};

const ACTIVE_STATUSES = new Set(['publicado', 'confirmado', 'active', 'confirmed']);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseServerAccess = Boolean(supabaseUrl && supabaseServiceRoleKey);
const supabaseAdmin = hasSupabaseServerAccess
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function toShellUser(user: AccountUser): ShellUser {
  const supportedRole = ['platform_admin', 'agency_admin', 'agent', 'traveler'].includes(user.role)
    ? user.role as ShellUser['role']
    : 'agent';

  return {
    fullName: user.fullName,
    role: supportedRole,
    avatarUrl: user.avatarUrl,
  };
}

function toSettings(agency?: { name?: string | null; logo_url?: string | null } | null): ShellSettings {
  const logoUrl = String(agency?.logo_url || '');
  return {
    agencyName: String(agency?.name || 'Rumo'),
    logoUrl: extractAgencyLogoPath(logoUrl) ? agencyLogoProxyUrl() : logoUrl,
  };
}

function shellFromSupabaseRow(row: DashboardUserRow): DashboardShellData {
  const role = ['platform_admin', 'agency_admin', 'agent', 'traveler'].includes(row.role)
    ? row.role as ShellUser['role']
    : 'agent';
  const agencyId = String(row.agency_id || '');
  const legacyAgencyId = String(row.agency?.settings?.legacyAgencyId || '');

  return {
    user: {
      fullName: row.full_name,
      role,
      avatarUrl: String(row.avatar_url || ''),
    },
    settings: role === 'platform_admin' ? { agencyName: 'Rumo Admin', logoUrl: '' } : toSettings(row.agency),
    agencyId,
    legacyAgencyId,
  };
}

async function loadShellFromSupabase(userId: string): Promise<DashboardShellData | null> {
  if (!supabaseAdmin || !looksLikeUuid(userId)) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, agency_id, role, full_name, email, phone, avatar_url, metadata, created_at, deleted_at, agency:agencies!users_agency_id_fkey(id, name, logo_url, settings)'
    )
    .eq('id', userId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return shellFromSupabaseRow(data as unknown as DashboardUserRow);
}

export const getDashboardShellData = cache(async (): Promise<DashboardShellData> => {
  const session = await getCurrentSession();
  if (!session) return { user: null, settings: null, agencyId: '', legacyAgencyId: '' };

  const supabaseShell = await loadShellFromSupabase(session.userId);
  if (supabaseShell) return supabaseShell;

  const user = await getUserById(session.userId);
  if (!user) return { user: null, settings: null, agencyId: '', legacyAgencyId: '' };
  if (user.role === 'platform_admin') {
    return {
      user: toShellUser(user),
      settings: { agencyName: 'Rumo Admin', logoUrl: '' },
      agencyId: user.agencyId,
      legacyAgencyId: '',
    };
  }

  const settings = await getAgencySettings(user.agencyId);
  return {
    user: toShellUser(user),
    settings: {
      agencyName: String(settings.agencyName || 'Rumo'),
      logoUrl: extractAgencyLogoPath(settings.logoUrl)
        ? agencyLogoProxyUrl()
        : String(settings.logoUrl || ''),
    },
    agencyId: user.agencyId,
    legacyAgencyId: '',
  };
});

function buildSummary(
  trips: TripSummaryRecord[],
  totalClients: number,
  totalUsers: number
): DashboardSummary {
  const activeTrips = trips.filter((trip) => ACTIVE_STATUSES.has(String(trip.status).toLowerCase()));
  const prioritizedTrips = [...trips].sort((first, second) => {
    const firstActive = ACTIVE_STATUSES.has(String(first.status).toLowerCase()) ? 1 : 0;
    const secondActive = ACTIVE_STATUSES.has(String(second.status).toLowerCase()) ? 1 : 0;
    if (firstActive !== secondActive) return secondActive - firstActive;
    return String(second.startDate || '').localeCompare(String(first.startDate || ''));
  });

  return {
    counts: {
      activeTrips: activeTrips.length,
      totalTrips: trips.length,
      totalClients,
      totalUsers,
    },
    recentTrips: prioritizedTrips.slice(0, 5).map((trip) => ({
      id: trip.id,
      name: trip.name,
      status: trip.status,
      destination: trip.destinations?.filter(Boolean).join(', ') || 'Destino a definir',
      startDate: trip.startDate,
      endDate: trip.endDate,
      clientName: trip.clientName || 'Cliente a definir',
    })),
  };
}

async function loadSummaryFallback(agencyId: string) {
  const [trips, users] = await Promise.all([
    listTripSummariesForAgency(agencyId),
    listUsersForAgency(agencyId),
  ]);
  return buildSummary(trips, db.clients.findMany(agencyId).length, users.length);
}

async function buildSummaryFromAgencyRow(
  agency: AgencyDashboardRow,
  legacyAgencyId = ''
): Promise<DashboardSummary> {
  const rowLegacyAgencyId = String(agency.settings?.legacyAgencyId || legacyAgencyId || '');
  if (rowLegacyAgencyId) return loadSummaryFallback(agency.id);

  const trips: TripSummaryRecord[] = (agency.itineraries || [])
    .filter((trip) => !trip.deleted_at)
    .map((trip) => ({
      id: String(trip.id),
      createdDate: String(trip.created_at || ''),
      name: String(trip.title || 'Viagem'),
      destinations: Array.isArray(trip.destinations)
        ? trip.destinations.map(String)
        : trip.destination
          ? [String(trip.destination)]
          : [],
      startDate: String(trip.start_date || ''),
      endDate: String(trip.end_date || ''),
      travelers: [],
      status: String(trip.status || 'Pendente'),
      clientName: String(trip.client_name || ''),
    }));
  const localClientCount = db.clients.findMany(agency.id).length;
  const supabaseClientCount = (agency.clients || []).filter((client) => !client.deleted_at).length;
  const totalUsers = (agency.team || []).filter((user) => !user.deleted_at).length;

  return buildSummary(trips, Math.max(localClientCount, supabaseClientCount), totalUsers);
}

async function loadDashboardPageFromSupabase(userId: string) {
  if (!supabaseAdmin || !looksLikeUuid(userId)) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, agency_id, role, full_name, avatar_url, agency:agencies!users_agency_id_fkey(id, name, logo_url, settings, team:users!users_agency_id_fkey(id, deleted_at), clients(id, deleted_at), itineraries(id, title, destination, destinations, start_date, end_date, status, client_name, created_at, deleted_at))'
    )
    .eq('id', userId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as unknown as DashboardUserRow;
  const shell = shellFromSupabaseRow(row);
  const summary = row.agency
    ? await buildSummaryFromAgencyRow(row.agency, shell.legacyAgencyId)
    : EMPTY_SUMMARY;

  return { ...shell, summary };
}

export async function getDashboardSummary(
  agencyId: string,
  legacyAgencyId = ''
): Promise<DashboardSummary> {
  if (!agencyId) return EMPTY_SUMMARY;
  if (!supabaseAdmin || !looksLikeUuid(agencyId)) return loadSummaryFallback(agencyId);

  const { data, error } = await supabaseAdmin
    .from('agencies')
    .select(
      'id, name, logo_url, settings, team:users!users_agency_id_fkey(id, deleted_at), clients(id, deleted_at), itineraries(id, title, destination, destinations, start_date, end_date, status, client_name, created_at, deleted_at)'
    )
    .eq('id', agencyId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (error || !data) return loadSummaryFallback(agencyId);
  const agency = data as unknown as AgencyDashboardRow;
  return buildSummaryFromAgencyRow(agency, legacyAgencyId);
}

export const getDashboardPageData = cache(async () => {
  const session = await getCurrentSession();
  if (session) {
    const supabasePage = await loadDashboardPageFromSupabase(session.userId);
    if (supabasePage) return supabasePage;
  }

  const shell = await getDashboardShellData();
  const summary = shell.user
    ? await getDashboardSummary(shell.agencyId, shell.legacyAgencyId)
    : EMPTY_SUMMARY;

  return { ...shell, summary };
});
