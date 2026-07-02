/**
 * packages/db/supabase.ts
 *
 * Real Supabase client used by the Next.js web app (server-side + client-side).
 * Replaces the local JSON mock in client.ts for live data.
 *
 * - Browser components use the anon key (respects RLS).
 * - Server components / API routes can use the service role key to bypass RLS.
 */
import { createClient } from '@supabase/supabase-js';

// ─── Environment ──────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[db/supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
    'Check your .env file.'
  );
}

// ─── Browser / anon client (use for all RLS-protected queries) ────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ─── Admin client (use ONLY in server-side code) ─────────────────────────────

export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type SupabaseClient = typeof supabase;

// ─── Typed row types (match migration schema) ─────────────────────────────────

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: 'starter' | 'pro' | 'business' | 'enterprise';
  credits: number;
  settings: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
}

export interface User {
  id: string;
  agency_id: string;
  role: 'agency_admin' | 'agent' | 'traveler';
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
}

export interface Client {
  id: string;
  agency_id: string;
  agent_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  passport: string | null;
  birthdate: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
}

export interface Itinerary {
  id: string;
  agency_id: string;
  agent_id: string;
  client_id: string | null;
  title: string;
  destination: string;
  origin: string;
  start_date: string;
  end_date: string;
  travelers: number;
  budget: number | null;
  currency: string;
  status: 'draft' | 'quoted' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  ai_prompt: Record<string, unknown> | null;
  ai_response: Record<string, unknown> | null;
  content: ItineraryContent;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ItineraryItem {
  id: string;
  day: number;
  type: 'flight' | 'hotel' | 'activity' | 'transfer' | 'meal' | 'note';
  title: string;
  subTitle?: string;
  details?: string;
  image?: string;
  customSymbol?: string;
  meta?: Record<string, unknown>;
}

export interface ItineraryContent {
  items: ItineraryItem[];
  summary?: string;
  highlights?: string[];
}

export interface Booking {
  id: string;
  agency_id: string;
  itinerary_id: string;
  client_id: string;
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}
