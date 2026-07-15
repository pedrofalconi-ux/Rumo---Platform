import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import { db } from '@rumo/db';

type JsonRecord = Record<string, unknown>;

export interface AccountUser {
  id: string;
  agencyId: string;
  role: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  createdAt: string;
  deletedAt: string | null;
  accessStatus: string;
  accessExpiresAt: string;
}

export interface AccountAgency {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  plan: string;
  credits: number;
  createdAt: string;
  deletedAt: string | null;
  subscriptionStatus: string;
  accessExpiresAt: string;
  settings: JsonRecord;
}

export interface AgencySettings {
  agencyName: string;
  logoUrl: string;
  defaultCurrency: string;
  plan: string;
  subscriptionStatus: string;
  accessExpiresAt: string;
  amadeusKey: string;
  tboKey: string;
  claudeKey: string;
  geminiKey: string;
  pixabayKey: string;
  notificationEmail: string;
}

const DEFAULT_ACCESS_EXPIRY = '2099-12-31T23:59:59.000Z';
const DEFAULT_SUBSCRIPTION_STATUS = 'active';
const AGENCY_SETTINGS_DEFAULTS: AgencySettings = {
  agencyName: 'Rumo',
  logoUrl: '',
  defaultCurrency: 'BRL',
  plan: 'starter',
  subscriptionStatus: DEFAULT_SUBSCRIPTION_STATUS,
  accessExpiresAt: DEFAULT_ACCESS_EXPIRY,
  amadeusKey: '',
  tboKey: '',
  claudeKey: '',
  geminiKey: '',
  pixabayKey: '',
  notificationEmail: '',
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_SERVER_TIMEOUT_MS = 1200;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_SERVER_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const hasSupabaseServerAccess = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
const canUseLocalWriteFallback = process.env.NODE_ENV !== 'production' || !process.env.VERCEL;
const canUsePersistentWriteFallback = canUseLocalWriteFallback || Boolean(supabaseUrl && supabaseServiceRoleKey);

const supabaseAdmin = hasSupabaseServerAccess
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    })
  : null;

function createSupabaseAuthClient() {
  if (!hasSupabaseServerAccess) {
    throw new Error('Supabase nao configurado no servidor');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  });
}

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase nao configurado no servidor');
  }

  return supabaseAdmin;
}

function persistenceUnavailableError() {
  return new Error(
    'Persistencia de producao indisponivel. Configure um projeto Supabase valido para cadastros, usuarios e configuracoes.'
  );
}

function shouldFallbackToLocal(error: unknown) {
  return Boolean(error);
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || `agency-${Date.now()}`;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeAgencySettings(
  agency: Partial<AccountAgency> & { name?: string; logoUrl?: string; plan?: string; settings?: JsonRecord }
): AgencySettings {
  const settings = (agency.settings || {}) as JsonRecord;

  return {
    agencyName: String(agency.name || settings.agencyName || AGENCY_SETTINGS_DEFAULTS.agencyName),
    logoUrl: String(agency.logoUrl || settings.logoUrl || AGENCY_SETTINGS_DEFAULTS.logoUrl),
    defaultCurrency: String(settings.defaultCurrency || AGENCY_SETTINGS_DEFAULTS.defaultCurrency),
    plan: String(agency.plan || settings.plan || AGENCY_SETTINGS_DEFAULTS.plan),
    subscriptionStatus: String(settings.subscriptionStatus || AGENCY_SETTINGS_DEFAULTS.subscriptionStatus),
    accessExpiresAt: String(settings.accessExpiresAt || AGENCY_SETTINGS_DEFAULTS.accessExpiresAt),
    amadeusKey: String(settings.amadeusKey || AGENCY_SETTINGS_DEFAULTS.amadeusKey),
    tboKey: String(settings.tboKey || AGENCY_SETTINGS_DEFAULTS.tboKey),
    claudeKey: String(settings.claudeKey || AGENCY_SETTINGS_DEFAULTS.claudeKey),
    geminiKey: String(settings.geminiKey || AGENCY_SETTINGS_DEFAULTS.geminiKey),
    pixabayKey: String(settings.pixabayKey || AGENCY_SETTINGS_DEFAULTS.pixabayKey),
    notificationEmail: String(settings.notificationEmail || AGENCY_SETTINGS_DEFAULTS.notificationEmail),
  };
}

function normalizeAgencyRow(row: any): AccountAgency {
  const settings = (row.settings || {}) as JsonRecord;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url || '',
    plan: row.plan || 'starter',
    credits: Number(row.credits || 0),
    createdAt: row.created_at || new Date().toISOString(),
    deletedAt: row.deleted_at || null,
    subscriptionStatus: String(settings.subscriptionStatus || DEFAULT_SUBSCRIPTION_STATUS),
    accessExpiresAt: String(settings.accessExpiresAt || DEFAULT_ACCESS_EXPIRY),
    settings,
  };
}

function normalizeUserRow(row: any): AccountUser {
  const metadata = (row.metadata || {}) as JsonRecord;

  return {
    id: row.id,
    agencyId: row.agency_id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    avatarUrl: row.avatar_url || '',
    createdAt: row.created_at || new Date().toISOString(),
    deletedAt: row.deleted_at || null,
    accessStatus: String(metadata.accessStatus || 'active'),
    accessExpiresAt: String(metadata.accessExpiresAt || DEFAULT_ACCESS_EXPIRY),
  };
}

function ensureUserAccess(user: AccountUser, agency?: AccountAgency | null) {
  const now = new Date();
  const userExpired = user.accessExpiresAt && new Date(user.accessExpiresAt) < now;
  const requiresAgencyAccess = user.role !== 'traveler' && user.role !== 'platform_admin';
  const agencyExpired = agency?.accessExpiresAt && new Date(agency.accessExpiresAt) < now;

  if (
    user.accessStatus !== 'active' ||
    userExpired ||
    (requiresAgencyAccess &&
      (!agency || agency.subscriptionStatus !== DEFAULT_SUBSCRIPTION_STATUS || agencyExpired))
  ) {
    throw new Error('Acesso expirado ou desativado');
  }
}

async function maybeSingle<T>(query: PromiseLike<{ data: T[] | null; error: any }>) {
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] || null;
}

async function findSupabaseAgencyById(id: string): Promise<AccountAgency | null> {
  if (!hasSupabaseServerAccess) return null;

  const row = await maybeSingle(
    requireSupabaseAdmin()
      .from('agencies')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .limit(1)
  );

  return row ? normalizeAgencyRow(row) : null;
}

async function findSupabaseUserById(id: string): Promise<AccountUser | null> {
  if (!hasSupabaseServerAccess) return null;

  const row = await maybeSingle(
    requireSupabaseAdmin()
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .limit(1)
  );

  return row ? normalizeUserRow(row) : null;
}

async function findSupabaseUserByEmail(email: string): Promise<AccountUser | null> {
  if (!hasSupabaseServerAccess) return null;

  const row = await maybeSingle(
    requireSupabaseAdmin()
      .from('users')
      .select('*')
      .ilike('email', email)
      .is('deleted_at', null)
      .limit(1)
  );

  return row ? normalizeUserRow(row) : null;
}

async function ensureSupabaseUserRow(authUser: SupabaseAuthUser, fallback?: Partial<AccountUser>) {
  const existing = await findSupabaseUserById(authUser.id);
  if (existing) return existing;

  const metadata = authUser.app_metadata || {};
  const agencyId =
    String(fallback?.agencyId || metadata.agencyId || authUser.user_metadata?.agencyId || '');
  if (!agencyId) return null;

  const insertPayload = {
    id: authUser.id,
    agency_id: agencyId,
    role: String(fallback?.role || metadata.role || authUser.user_metadata?.role || 'agent'),
    full_name: String(fallback?.fullName || authUser.user_metadata?.full_name || authUser.email || 'Usuario Rumo'),
    email: String(authUser.email || fallback?.email || ''),
    phone: String(fallback?.phone || authUser.user_metadata?.phone || ''),
    avatar_url: String(fallback?.avatarUrl || ''),
    metadata: {
      accessStatus: fallback?.accessStatus || 'active',
      accessExpiresAt: fallback?.accessExpiresAt || DEFAULT_ACCESS_EXPIRY,
      source: 'supabase-auth-sync',
    },
  };

  const { data, error } = await requireSupabaseAdmin()
    .from('users')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeUserRow(data);
}

async function ensureSupabaseAgency(localAgencyId: string, localUser?: any) {
  const localAgency = db.agencies.findOne(localAgencyId);
  if (!localAgency && localUser?.role !== 'platform_admin') {
    return null;
  }

  const agencyName = localAgency?.name || 'Rumo Platform';
  const slug = localAgency?.slug || slugify(agencyName);
  const admin = requireSupabaseAdmin();

  const existingBySlug = await maybeSingle(
    admin.from('agencies').select('*').eq('slug', slug).is('deleted_at', null).limit(1)
  );
  if (existingBySlug) return normalizeAgencyRow(existingBySlug);

  const settings = {
    subscriptionStatus: localAgency?.subscriptionStatus || DEFAULT_SUBSCRIPTION_STATUS,
    accessExpiresAt: localAgency?.accessExpiresAt || localUser?.accessExpiresAt || DEFAULT_ACCESS_EXPIRY,
    defaultCurrency: 'BRL',
    notificationEmail: '',
    legacyAgencyId: localAgencyId || null,
  };

  const { data, error } = await admin
    .from('agencies')
    .insert({
      name: agencyName,
      slug,
      logo_url: localAgency?.logoUrl || '',
      plan: localAgency?.plan || 'starter',
      credits: 60,
      settings,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeAgencyRow(data);
}

async function syncLegacyTrips(localAgencyId: string, supabaseAgencyId: string) {
  if (!hasSupabaseServerAccess) return;

  const admin = requireSupabaseAdmin();
  const { data: existingTrips, error: existingTripsError } = await admin
    .from('itineraries')
    .select('id, metadata')
    .eq('agency_id', supabaseAgencyId);

  if (existingTripsError) {
    throw existingTripsError;
  }

  const existingLegacyTripIds = new Set(
    (existingTrips || [])
      .map((trip: any) => trip.metadata?.legacyTripId)
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
  );

  const legacyTrips = db.trips.findMany(localAgencyId);
  const missingTrips = legacyTrips.filter((trip: any) => !existingLegacyTripIds.has(String(trip.id)));

  if (missingTrips.length === 0) return;

  const payload = missingTrips.map((trip: any) => ({
    agency_id: supabaseAgencyId,
    agent_id: null,
    title: String(trip.name || 'Viagem'),
    client_name: String(trip.clientName || ''),
    destination: Array.isArray(trip.destinations) && trip.destinations.length > 0 ? String(trip.destinations[0]) : '',
    destinations: Array.isArray(trip.destinations) ? trip.destinations.map(String) : [],
    destinations_detail: Array.isArray(trip.destinationsDetail) ? trip.destinationsDetail : [],
    origin: String(trip.origin || ''),
    start_date: String(trip.startDate || new Date().toISOString().slice(0, 10)),
    end_date: String(trip.endDate || trip.startDate || new Date().toISOString().slice(0, 10)),
    travelers: Array.isArray(trip.travelers) ? Math.max(1, trip.travelers.length) : 1,
    travelers_data: Array.isArray(trip.travelers) ? trip.travelers.map(String) : ['DR'],
    budget: Number(trip.budget || 0),
    currency: 'BRL',
    status: String(trip.status || 'Pendente'),
    profile: trip.profile ? String(trip.profile) : null,
    preferences: String(trip.preferences || ''),
    cover_image: trip.coverImage ? String(trip.coverImage) : null,
    documents: Array.isArray(trip.documents) ? trip.documents : [],
    ai_status: String(trip.aiStatus || 'NONE'),
    ai_generation_id: trip.aiGenerationId ? String(trip.aiGenerationId) : null,
    ai_generated_at: trip.aiGeneratedAt || null,
    ai_prompt: trip.aiPrompt || null,
    ai_response: trip.aiResponse || null,
    content: {
      items: Array.isArray(trip.itinerary) ? trip.itinerary : [],
    },
    metadata: {
      legacyTripId: String(trip.id),
      legacyAgencyId: localAgencyId,
      source: 'legacy-json',
      createdDate: trip.createdDate || null,
    },
  }));

  const { error } = await admin.from('itineraries').insert(payload);
  if (error) throw error;
}

async function provisionLegacyUser(localRawUser: any, password: string) {
  if (!hasSupabaseServerAccess || !localRawUser?.email) {
    return null;
  }

  const admin = requireSupabaseAdmin();
  const agency = await ensureSupabaseAgency(localRawUser.agencyId, localRawUser);
  const agencyId = agency?.id || localRawUser.agencyId;
  if (agency?.id && localRawUser.agencyId && !looksLikeUuid(localRawUser.agencyId)) {
    await syncLegacyTrips(localRawUser.agencyId, agency.id);
  }

  const existing = await findSupabaseUserByEmail(localRawUser.email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      app_metadata: {
        role: existing.role,
        agencyId: existing.agencyId,
      },
      user_metadata: {
        full_name: existing.fullName,
        phone: existing.phone,
      },
    });
    return existing;
  }

  const createdAuth = await admin.auth.admin.createUser({
    email: localRawUser.email,
    password,
    email_confirm: true,
    app_metadata: {
      role: localRawUser.role || 'agent',
      agencyId,
    },
    user_metadata: {
      full_name: localRawUser.fullName,
      phone: localRawUser.phone || '',
    },
  });

  const authUser = createdAuth.data.user;
  const authError = createdAuth.error;
  if (authError && !String(authError.message || '').toLowerCase().includes('already')) {
    throw authError;
  }

  if (!authUser) {
    const recovered = await findSupabaseUserByEmail(localRawUser.email);
    if (recovered) return recovered;
    return null;
  }

  const { data, error } = await admin
    .from('users')
    .upsert(
      {
        id: authUser.id,
        agency_id: agencyId,
        role: localRawUser.role || 'agent',
        full_name: localRawUser.fullName,
        email: localRawUser.email,
        phone: localRawUser.phone || '',
        avatar_url: localRawUser.avatarUrl || '',
        metadata: {
          accessStatus: localRawUser.accessStatus || 'active',
          accessExpiresAt: localRawUser.accessExpiresAt || DEFAULT_ACCESS_EXPIRY,
          source: 'legacy-json',
        },
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return normalizeUserRow(data);
}

export async function getUserById(id: string) {
  if (!looksLikeUuid(id)) {
    return db.users.findOne(id);
  }

  try {
    const supabaseUser = await findSupabaseUserById(id);
    if (supabaseUser) return supabaseUser;
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error;
  }
  return db.users.findOne(id);
}

export async function getAgencyById(id: string) {
  if (!looksLikeUuid(id)) {
    return db.agencies.findOne(id);
  }

  try {
    const supabaseAgency = await findSupabaseAgencyById(id);
    if (supabaseAgency) return supabaseAgency;
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error;
  }
  return db.agencies.findOne(id);
}

export async function authenticateAccount(email: string, password: string) {
  const localRawUser = db.users.findByEmail(email);
  if (localRawUser && !looksLikeUuid(localRawUser.id) && !hasSupabaseServerAccess) {
    const legacyLogin = db.auth.login(email, password);
    return legacyLogin ? legacyLogin.user : null;
  }

  let supabaseHealthyForRequest = hasSupabaseServerAccess;

  if (hasSupabaseServerAccess) {
    try {
      const supabaseUser = await findSupabaseUserByEmail(email);

      if (supabaseUser) {
        const authClient = createSupabaseAuthClient();
        const { data, error } = await authClient.auth.signInWithPassword({ email, password });

        if (!error && data.user) {
          const hydratedUser =
            (await ensureSupabaseUserRow(data.user, supabaseUser)) || (await findSupabaseUserById(data.user.id));
          if (hydratedUser) {
            const agency = await getAgencyById(hydratedUser.agencyId);
            ensureUserAccess(hydratedUser, agency);
            return hydratedUser;
          }
        }

        const legacyRawUser = db.users.findByEmail(email);
        if (legacyRawUser) {
          const legacyLogin = db.auth.login(email, password);
          if (legacyLogin) {
            const provisioned = await provisionLegacyUser(legacyRawUser, password);
            if (provisioned) {
              const agency = await getAgencyById(provisioned.agencyId);
              ensureUserAccess(provisioned, agency);
              return provisioned;
            }
          }
        }

        return null;
      }
    } catch (error) {
      if (!shouldFallbackToLocal(error)) throw error;
      supabaseHealthyForRequest = false;
    }
  }

  const legacyLogin = db.auth.login(email, password);
  if (!legacyLogin) return null;

  if (localRawUser && supabaseHealthyForRequest) {
    try {
      const provisioned = await provisionLegacyUser(localRawUser, password);
      if (provisioned) return provisioned;
    } catch {
      // Keep the operational login path available even if Supabase is unreachable.
    }
  }

  return legacyLogin.user;
}

export async function registerAgencyAccount(data: {
  fullName: string;
  agencyName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  if (!hasSupabaseServerAccess) {
    if (!canUsePersistentWriteFallback) {
      throw persistenceUnavailableError();
    }
    return db.auth.register({
      ...data,
      emailConfirm: data.email,
      accessKey: 'rumo123',
    });
  }

  try {
    const admin = requireSupabaseAdmin();
    const slug = slugify(data.agencyName);
    const { data: agencyData, error: agencyError } = await admin
      .from('agencies')
      .insert({
        name: data.agencyName,
        slug,
        logo_url: '',
        plan: 'starter',
        credits: 60,
        settings: {
          defaultCurrency: 'BRL',
          subscriptionStatus: DEFAULT_SUBSCRIPTION_STATUS,
          accessExpiresAt: daysFromNow(30),
          notificationEmail: data.email,
        },
      })
      .select('*')
      .single();

    if (agencyError) throw agencyError;
    const agency = normalizeAgencyRow(agencyData);

    const createdAuth = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      app_metadata: {
        role: 'agency_admin',
        agencyId: agency.id,
      },
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone || '',
      },
    });

    if (createdAuth.error || !createdAuth.data.user) {
      throw createdAuth.error || new Error('Nao foi possivel criar usuario de autenticacao');
    }

    const { data: userData, error: userError } = await admin
      .from('users')
      .insert({
        id: createdAuth.data.user.id,
        agency_id: agency.id,
        role: 'agency_admin',
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || '',
        avatar_url: '',
        metadata: {
          accessStatus: 'active',
          accessExpiresAt: agency.accessExpiresAt,
        },
      })
      .select('*')
      .single();

    if (userError) throw userError;
    return normalizeUserRow(userData);
  } catch (error) {
    if (canUsePersistentWriteFallback && shouldFallbackToLocal(error)) {
      return db.auth.register({
        ...data,
        emailConfirm: data.email,
        accessKey: 'rumo123',
      });
    }

    throw persistenceUnavailableError();
  }
}

export async function listUsersForAgency(agencyId?: string) {
  if (!hasSupabaseServerAccess) {
    return db.users.findMany(agencyId);
  }

  try {
    let query = requireSupabaseAdmin()
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(normalizeUserRow);
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error;
    return db.users.findMany(agencyId);
  }
}

export async function createAgencyUser(
  agencyId: string,
  data: {
    fullName: string;
    email: string;
    phone?: string;
    role?: string;
    password?: string;
    accessStatus?: string;
    accessExpiresAt?: string;
  }
) {
  if (!hasSupabaseServerAccess) {
    if (!canUsePersistentWriteFallback) {
      throw persistenceUnavailableError();
    }
    return db.users.create({
      ...data,
      agencyId,
      password: data.password || 'rumo123',
    });
  }

  try {
    const admin = requireSupabaseAdmin();
    const createdAuth = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password || 'rumo123',
      email_confirm: true,
      app_metadata: {
        role: data.role || 'agent',
        agencyId,
      },
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone || '',
      },
    });

    if (createdAuth.error || !createdAuth.data.user) {
      throw createdAuth.error || new Error('Nao foi possivel criar usuario');
    }

    const { data: userData, error: userError } = await admin
      .from('users')
      .insert({
        id: createdAuth.data.user.id,
        agency_id: agencyId,
        role: data.role || 'agent',
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || '',
        avatar_url: '',
        metadata: {
          accessStatus: data.accessStatus || 'active',
          accessExpiresAt: data.accessExpiresAt || daysFromNow(30),
        },
      })
      .select('*')
      .single();

    if (userError) throw userError;
    return normalizeUserRow(userData);
  } catch (error) {
    if (canUsePersistentWriteFallback && shouldFallbackToLocal(error)) {
      return db.users.create({
        ...data,
        agencyId,
        password: data.password || 'rumo123',
      });
    }

    throw persistenceUnavailableError();
  }
}

export async function updateAgencyUser(
  userId: string,
  patch: {
    fullName?: string;
    email?: string;
    phone?: string;
    role?: string;
    accessStatus?: string;
    accessExpiresAt?: string;
  }
) {
  if (!hasSupabaseServerAccess) {
    if (!canUsePersistentWriteFallback) {
      throw persistenceUnavailableError();
    }
    return db.users.update(userId, patch);
  }

  try {
    const current = await findSupabaseUserById(userId);
    if (!current) return null;

    if (patch.email || patch.fullName || patch.phone || patch.role) {
      const { error: authError } = await requireSupabaseAdmin().auth.admin.updateUserById(userId, {
        email: patch.email || current.email,
        app_metadata: {
          role: patch.role || current.role,
          agencyId: current.agencyId,
        },
        user_metadata: {
          full_name: patch.fullName || current.fullName,
          phone: patch.phone || current.phone,
        },
      });

      if (authError) throw authError;
    }

    const { data, error } = await requireSupabaseAdmin()
      .from('users')
      .update({
        full_name: patch.fullName || current.fullName,
        email: patch.email || current.email,
        phone: patch.phone || current.phone,
        role: patch.role || current.role,
        metadata: {
          accessStatus: patch.accessStatus || current.accessStatus,
          accessExpiresAt: patch.accessExpiresAt || current.accessExpiresAt,
        },
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return normalizeUserRow(data);
  } catch (error) {
    if (canUsePersistentWriteFallback && shouldFallbackToLocal(error)) {
      return db.users.update(userId, patch);
    }

    throw persistenceUnavailableError();
  }
}

export async function deleteAgencyUser(userId: string) {
  if (!hasSupabaseServerAccess) {
    if (!canUsePersistentWriteFallback) {
      throw persistenceUnavailableError();
    }
    return db.users.delete(userId);
  }

  try {
    const { error: rowError } = await requireSupabaseAdmin().from('users').delete().eq('id', userId);
    if (rowError) throw rowError;

    const { error: authError } = await requireSupabaseAdmin().auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return true;
  } catch (error) {
    if (canUsePersistentWriteFallback && shouldFallbackToLocal(error)) {
      return db.users.delete(userId);
    }

    throw persistenceUnavailableError();
  }
}

export async function getAgencySettings(agencyId: string) {
  const agency = await getAgencyById(agencyId);
  if (agency) {
    return normalizeAgencySettings(agency);
  }

  return normalizeAgencySettings({});
}

export async function updateAgencySettings(
  agencyId: string,
  patch: Partial<AgencySettings>
) {
  if (!hasSupabaseServerAccess) {
    if (!canUsePersistentWriteFallback) {
      throw persistenceUnavailableError();
    }
    return db.settings.update({ ...patch, agencyId });
  }

  try {
    const currentAgency = await findSupabaseAgencyById(agencyId);
    if (!currentAgency) {
      throw new Error('Agencia nao encontrada');
    }

    const currentSettings = normalizeAgencySettings(currentAgency);
    const merged = {
      ...currentSettings,
      ...patch,
    };

    const { data, error } = await requireSupabaseAdmin()
      .from('agencies')
      .update({
        name: merged.agencyName,
        logo_url: merged.logoUrl,
        plan: merged.plan,
        settings: {
          ...currentAgency.settings,
          defaultCurrency: merged.defaultCurrency,
          amadeusKey: merged.amadeusKey,
          tboKey: merged.tboKey,
          claudeKey: merged.claudeKey,
          geminiKey: merged.geminiKey,
          pixabayKey: merged.pixabayKey,
          notificationEmail: merged.notificationEmail,
          subscriptionStatus: merged.subscriptionStatus,
          accessExpiresAt: merged.accessExpiresAt,
        },
      })
      .eq('id', agencyId)
      .select('*')
      .single();

    if (error) throw error;
    return normalizeAgencySettings(normalizeAgencyRow(data));
  } catch (error) {
    if (canUsePersistentWriteFallback && shouldFallbackToLocal(error)) {
      return db.settings.update({ ...patch, agencyId });
    }

    throw persistenceUnavailableError();
  }
}

export async function listAgencies() {
  if (!hasSupabaseServerAccess) {
    return db.agencies.findMany();
  }

  try {
    const { data, error } = await requireSupabaseAdmin()
      .from('agencies')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalizeAgencyRow);
  } catch (error) {
    if (!shouldFallbackToLocal(error)) throw error;
    return db.agencies.findMany();
  }
}

export async function updateAgency(
  agencyId: string,
  patch: {
    name?: string;
    plan?: string;
    subscriptionStatus?: string;
    accessExpiresAt?: string;
    logoUrl?: string;
  }
) {
  if (!hasSupabaseServerAccess) {
    if (!canUsePersistentWriteFallback) {
      throw persistenceUnavailableError();
    }
    return db.agencies.update(agencyId, patch);
  }

  try {
    const current = await findSupabaseAgencyById(agencyId);
    if (!current) return null;

    const { data, error } = await requireSupabaseAdmin()
      .from('agencies')
      .update({
        name: patch.name || current.name,
        logo_url: patch.logoUrl || current.logoUrl,
        plan: patch.plan || current.plan,
        settings: {
          ...current.settings,
          subscriptionStatus: patch.subscriptionStatus || current.subscriptionStatus,
          accessExpiresAt: patch.accessExpiresAt || current.accessExpiresAt,
        },
      })
      .eq('id', agencyId)
      .select('*')
      .single();

    if (error) throw error;
    return normalizeAgencyRow(data);
  } catch (error) {
    if (canUsePersistentWriteFallback && shouldFallbackToLocal(error)) {
      return db.agencies.update(agencyId, patch);
    }

    throw persistenceUnavailableError();
  }
}
