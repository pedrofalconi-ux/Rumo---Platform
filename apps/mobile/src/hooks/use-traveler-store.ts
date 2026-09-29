/**
 * Real, persisted data for the Traveler app's diary, expenses, and chat —
 * backed by the Supabase-persisted API (apps/web/app/api/traveler/{diary,expenses,chat}).
 */
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { resolveAppTheme } from '@/constants/theme';
import {
  addDiaryEntry as apiAddDiaryEntry,
  addExpense as apiAddExpense,
  deleteDiaryEntry as apiDeleteDiaryEntry,
  deleteExpense as apiDeleteExpense,
  getChatMessages,
  getDiaryEntries,
  getExpenses,
  getTravelerTrip,
  getTravelerTrips,
  sendChatMessage,
  ChatMessage,
  DiaryEntry,
  Expense,
} from '@/lib/traveler-api';

export type { ChatMessage, DiaryEntry, Expense };

/**
 * Resolves the agency-selected app theme (see apps/web's Settings > Branding)
 * for the trip a screen is showing. Falls back to the traveler's first trip
 * when no tripId is given, matching how chat/explore already pick a default.
 */
export function useTripAgencyTheme(tripId?: string) {
  const { sessionId } = useAuth();
  const [themeId, setThemeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const task = setTimeout(() => {
      if (!sessionId) {
        setThemeId(undefined);
        return;
      }
      const request =
        tripId && tripId !== 'unselected'
          ? getTravelerTrip(sessionId, tripId)
          : getTravelerTrips(sessionId).then((trips) => trips[0] ?? null);
      request.then((trip) => setThemeId(trip?.agency?.themeId)).catch(() => setThemeId(undefined));
    }, 0);
    return () => clearTimeout(task);
  }, [sessionId, tripId]);

  return resolveAppTheme(themeId);
}

export function useChat(tripId: string) {
  const { sessionId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId || !tripId || tripId === 'unselected') {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setMessages(await getChatMessages(sessionId, tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar as mensagens.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, tripId]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !tripId) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        const message = await sendChatMessage(sessionId, tripId, trimmed);
        setMessages((current) => [...current, message]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel enviar a mensagem.');
      }
    },
    [sessionId, tripId]
  );

  return { messages, loading, error, sendMessage, refresh: load };
}

export function useExpenses(tripId: string) {
  const { sessionId } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId || !tripId || tripId === 'unselected') {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setExpenses(await getExpenses(sessionId, tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar as despesas.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, tripId]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const addExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'tripId' | 'createdAt'>) => {
      if (!sessionId || !tripId) return;
      const expense = await apiAddExpense(sessionId, { tripId, ...data });
      setExpenses((current) => [...current, expense]);
    },
    [sessionId, tripId]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!sessionId) return;
      await apiDeleteExpense(sessionId, id);
      setExpenses((current) => current.filter((e) => e.id !== id));
    },
    [sessionId]
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, loading, error, addExpense, deleteExpense, total };
}

export function useDiary(tripId: string) {
  const { sessionId } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId || !tripId || tripId === 'unselected') {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setEntries(await getDiaryEntries(sessionId, tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o diario.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, tripId]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const addEntry = useCallback(
    async (data: { title: string; body: string; day: number; photoUri?: string | null }) => {
      if (!sessionId || !tripId) return;
      const entry = await apiAddDiaryEntry(sessionId, { tripId, ...data });
      setEntries((current) => [...current, entry]);
    },
    [sessionId, tripId]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!sessionId) return;
      await apiDeleteDiaryEntry(sessionId, id);
      setEntries((current) => current.filter((e) => e.id !== id));
    },
    [sessionId]
  );

  return { entries, loading, error, addEntry, deleteEntry };
}
