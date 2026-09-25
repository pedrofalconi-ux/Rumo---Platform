import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface ExpenseRow {
  id: string;
  userId: string;
  tripId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  createdAt: string;
}

interface ExpenseDbRow {
  id: string;
  user_id: string;
  trip_id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expense_date: string;
  created_at: string;
}

function mapRow(row: ExpenseDbRow): ExpenseRow {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.expense_date,
    createdAt: row.created_at,
  };
}

export async function listExpenses(userId: string, tripId: string): Promise<ExpenseRow[]> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { data, error } = await admin
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function createExpense(input: {
  userId: string;
  tripId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
}): Promise<ExpenseRow> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { data, error } = await admin
    .from('expenses')
    .insert({
      user_id: input.userId,
      trip_id: input.tripId,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      category: input.category,
      expense_date: input.date,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  const admin = getAdmin();
  if (!admin) throw new Error('Banco de dados não configurado.');
  const { error } = await admin.from('expenses').delete().eq('id', expenseId).eq('user_id', userId);
  if (error) throw error;
}
