import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface ChatMessageRow {
  id: string;
  tripId: string;
  agencyId: string;
  senderId: string | null;
  senderName: string;
  senderRole: 'traveler' | 'agent';
  text: string;
  read: boolean;
  sentAt: string;
}

interface ChatMessageDbRow {
  id: string;
  trip_id: string;
  agency_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: 'traveler' | 'agent';
  body: string;
  read: boolean;
  sent_at: string;
}

function mapRow(row: ChatMessageDbRow): ChatMessageRow {
  return {
    id: row.id,
    tripId: row.trip_id,
    agencyId: row.agency_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    text: row.body,
    read: row.read,
    sentAt: row.sent_at,
  };
}

export async function listChatMessages(tripId: string): Promise<ChatMessageRow[]> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { data, error } = await admin
    .from('chat_messages')
    .select('*')
    .eq('trip_id', tripId)
    .order('sent_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function createChatMessage(input: {
  tripId: string;
  agencyId: string;
  senderId: string;
  senderName: string;
  senderRole: 'traveler' | 'agent';
  text: string;
}): Promise<ChatMessageRow> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { data, error } = await admin
    .from('chat_messages')
    .insert({
      trip_id: input.tripId,
      agency_id: input.agencyId,
      sender_id: input.senderId,
      sender_name: input.senderName,
      sender_role: input.senderRole,
      body: input.text,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data);
}
