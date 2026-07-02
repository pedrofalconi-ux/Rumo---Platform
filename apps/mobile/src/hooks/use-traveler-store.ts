/**
 * Central mock store for the Traveler app (Módulo 8)
 * All data is in-memory. Replace with Supabase calls when ready.
 */
import { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripDocument {
  id: string;
  tripId: string;
  type: 'voucher' | 'passagem' | 'seguro' | 'hotel' | 'outro';
  name: string;
  description?: string;
  fileUrl?: string;
  emoji: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderRole: 'traveler' | 'agent';
  text: string;
  sentAt: string;
  read: boolean;
}

export interface Expense {
  id: string;
  tripId: string;
  category: 'alimentação' | 'transporte' | 'hospedagem' | 'compras' | 'entretenimento' | 'outro';
  description: string;
  amount: number;
  currency: string;
  date: string;
  emoji: string;
}

export interface DiaryEntry {
  id: string;
  tripId: string;
  title: string;
  text: string;
  imageUri?: string;
  day: number;
  createdAt: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_DOCUMENTS: TripDocument[] = [
  {
    id: 'doc-1',
    tripId: 'HOR-9921',
    type: 'passagem',
    name: 'Passagem Aérea — ITA Airways AZ 673',
    description: 'Classe econômica | GRU → FCO | 24 Jul 2024',
    emoji: '✈️',
    uploadedAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'doc-2',
    tripId: 'HOR-9921',
    type: 'hotel',
    name: 'Voucher Hotel — Artemide Roma',
    description: 'Check-in: 24 Jul | Check-out: 31 Jul | Quarto Standard',
    emoji: '🏨',
    uploadedAt: '2024-06-05T14:30:00Z',
  },
  {
    id: 'doc-3',
    tripId: 'HOR-9921',
    type: 'seguro',
    name: 'Seguro Viagem — Assistcard',
    description: 'Cobertura: USD 150.000 | Válido: 24 Jul – 31 Jul 2024',
    emoji: '🛡️',
    uploadedAt: '2024-06-08T09:15:00Z',
  },
  {
    id: 'doc-4',
    tripId: 'HOR-9921',
    type: 'voucher',
    name: 'Voucher Tour Coliseu',
    description: 'Visita guiada com acesso prioritário | 26 Jul | 09:00',
    emoji: '🏛️',
    uploadedAt: '2024-06-10T11:00:00Z',
  },
  {
    id: 'doc-5',
    tripId: 'HOR-8842',
    type: 'passagem',
    name: 'Passagem Aérea — Latam LA 711',
    description: 'Classe econômica | GRU → MXP | 01 Abr 2025',
    emoji: '✈️',
    uploadedAt: '2025-03-01T10:00:00Z',
  },
];

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    tripId: 'HOR-9921',
    senderId: 'agent-1',
    senderName: 'Digueira Rumo',
    senderRole: 'agent',
    text: 'Olá! Seus documentos já foram adicionados ao app. Qualquer dúvida, é só me chamar aqui! 🌍',
    sentAt: '2024-07-20T10:00:00Z',
    read: true,
  },
  {
    id: 'msg-2',
    tripId: 'HOR-9921',
    senderId: 'traveler-1',
    senderName: 'Você',
    senderRole: 'traveler',
    text: 'Obrigado! O hotel aceita check-in antecipado?',
    sentAt: '2024-07-20T10:05:00Z',
    read: true,
  },
  {
    id: 'msg-3',
    tripId: 'HOR-9921',
    senderId: 'agent-1',
    senderName: 'Digueira Rumo',
    senderRole: 'agent',
    text: 'Confirmei com o hotel! Eles permitem check-in a partir das 12h mediante disponibilidade. Vou já avisar eles que você chega mais cedo. ✅',
    sentAt: '2024-07-20T10:12:00Z',
    read: true,
  },
  {
    id: 'msg-4',
    tripId: 'HOR-9921',
    senderId: 'agent-1',
    senderName: 'Digueira Rumo',
    senderRole: 'agent',
    text: 'Boa viagem amanhã! 🎉 Lembre-se: o voo parte das 14h25, chegue ao aeroporto com 3h de antecedência.',
    sentAt: '2024-07-23T08:00:00Z',
    read: false,
  },
];

const SEED_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    tripId: 'HOR-9921',
    category: 'alimentação',
    description: 'Almoço — Trattoria da Lucia',
    amount: 48.5,
    currency: 'EUR',
    date: '2024-07-25',
    emoji: '🍝',
  },
  {
    id: 'exp-2',
    tripId: 'HOR-9921',
    category: 'transporte',
    description: 'Taxi Aeroporto → Hotel',
    amount: 35.0,
    currency: 'EUR',
    date: '2024-07-24',
    emoji: '🚕',
  },
  {
    id: 'exp-3',
    tripId: 'HOR-9921',
    category: 'entretenimento',
    description: 'Ingresso Vaticano + Museus',
    amount: 28.0,
    currency: 'EUR',
    date: '2024-07-26',
    emoji: '🎟️',
  },
  {
    id: 'exp-4',
    tripId: 'HOR-9921',
    category: 'compras',
    description: 'Gelato + Lembrances',
    amount: 22.0,
    currency: 'EUR',
    date: '2024-07-27',
    emoji: '🧊',
  },
];

const SEED_DIARY: DiaryEntry[] = [
  {
    id: 'diary-1',
    tripId: 'HOR-9921',
    title: 'Chegando em Roma! 🇮🇹',
    text: 'Aterrissamos no Fiumicino com uma luz de fim de tarde incrível. O taxi até o hotel passou pela Via Appia — já me sinto dentro de um filme histórico. O hotel ficou ainda melhor do que nas fotos!',
    day: 1,
    createdAt: '2024-07-24T20:30:00Z',
  },
  {
    id: 'diary-2',
    tripId: 'HOR-9921',
    title: 'Coliseu de perto 🏛️',
    text: 'Tour privativo ao amanhecer. O guia contou histórias que não estão em nenhum guia de turismo. Vista do Palatino ao pôr do sol — inesquecível. Jantamos na trattoria do beco perto do Pantheon.',
    day: 2,
    createdAt: '2024-07-25T22:00:00Z',
  },
];

// ─── In-memory state (simulates a store) ──────────────────────────────────────

let _documents = [...SEED_DOCUMENTS];
let _messages: Record<string, ChatMessage[]> = {
  'HOR-9921': SEED_MESSAGES.filter((m) => m.tripId === 'HOR-9921'),
  'HOR-8842': [],
};
let _expenses: Record<string, Expense[]> = {
  'HOR-9921': SEED_EXPENSES.filter((e) => e.tripId === 'HOR-9921'),
  'HOR-8842': [],
};
let _diary: Record<string, DiaryEntry[]> = {
  'HOR-9921': SEED_DIARY.filter((d) => d.tripId === 'HOR-9921'),
  'HOR-8842': [],
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDocuments(tripId: string) {
  const [documents, setDocuments] = useState<TripDocument[]>(
    _documents.filter((d) => d.tripId === tripId)
  );
  return { documents };
}

export function useChat(tripId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    _messages[tripId] ?? []
  );

  const sendMessage = useCallback(
    (text: string) => {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        tripId,
        senderId: 'traveler-1',
        senderName: 'Você',
        senderRole: 'traveler',
        text,
        sentAt: new Date().toISOString(),
        read: true,
      };
      const updated = [...(_messages[tripId] ?? []), newMsg];
      _messages[tripId] = updated;
      setMessages(updated);

      // Simulate agent reply after 1.5s
      setTimeout(() => {
        const reply: ChatMessage = {
          id: `msg-reply-${Date.now()}`,
          tripId,
          senderId: 'agent-1',
          senderName: 'Digueira Rumo',
          senderRole: 'agent',
          text: 'Recebi sua mensagem! Já estou verificando e retorno em breve. 😊',
          sentAt: new Date().toISOString(),
          read: false,
        };
        _messages[tripId] = [...(_messages[tripId] ?? []), reply];
        setMessages([...(_messages[tripId] ?? [])]);
      }, 1500);
    },
    [tripId]
  );

  return { messages, sendMessage };
}

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>(
    _expenses[tripId] ?? []
  );

  const addExpense = useCallback(
    (data: Omit<Expense, 'id' | 'tripId' | 'emoji'>) => {
      const EMOJIS: Record<string, string> = {
        alimentação: '🍽️',
        transporte: '🚕',
        hospedagem: '🏨',
        compras: '🛍️',
        entretenimento: '🎟️',
        outro: '💰',
      };
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        tripId,
        emoji: EMOJIS[data.category] ?? '💰',
        ...data,
      };
      const updated = [...(_expenses[tripId] ?? []), newExp];
      _expenses[tripId] = updated;
      setExpenses(updated);
    },
    [tripId]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const updated = (_expenses[tripId] ?? []).filter((e) => e.id !== id);
      _expenses[tripId] = updated;
      setExpenses(updated);
    },
    [tripId]
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, addExpense, deleteExpense, total };
}

export function useDiary(tripId: string) {
  const [entries, setEntries] = useState<DiaryEntry[]>(
    _diary[tripId] ?? []
  );

  const addEntry = useCallback(
    (data: Omit<DiaryEntry, 'id' | 'tripId' | 'createdAt'>) => {
      const newEntry: DiaryEntry = {
        id: `diary-${Date.now()}`,
        tripId,
        createdAt: new Date().toISOString(),
        ...data,
      };
      const updated = [...(_diary[tripId] ?? []), newEntry];
      _diary[tripId] = updated;
      setEntries(updated);
    },
    [tripId]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      const updated = (_diary[tripId] ?? []).filter((e) => e.id !== id);
      _diary[tripId] = updated;
      setEntries(updated);
    },
    [tripId]
  );

  return { entries, addEntry, deleteEntry };
}
