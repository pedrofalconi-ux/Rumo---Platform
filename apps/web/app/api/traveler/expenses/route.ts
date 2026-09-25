import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server-auth';
import { getTravelerTripAccess } from '../../../../lib/server-traveler-access';
import { createExpense, listExpenses } from '../../../../lib/server-expense-store';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const tripId = new URL(request.url).searchParams.get('tripId') || '';
    if (!tripId) return NextResponse.json({ error: 'Informe a viagem' }, { status: 400 });
    if (!getTravelerTripAccess(user.id, tripId)) {
      return NextResponse.json({ error: 'Voce nao tem acesso a esta viagem' }, { status: 403 });
    }

    const expenses = await listExpenses(user.id, tripId);
    return NextResponse.json(expenses);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar despesas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    if (user.role !== 'traveler') {
      return NextResponse.json({ error: 'Area exclusiva para viajantes' }, { status: 403 });
    }

    const body = await request.json();
    const tripId = String(body.tripId || '');
    const description = String(body.description || '').trim();
    const amount = Number(body.amount);
    const currency = String(body.currency || 'EUR');
    const category = String(body.category || 'outro');
    const date = String(body.date || '');

    if (!tripId || !getTravelerTripAccess(user.id, tripId)) {
      return NextResponse.json({ error: 'Voce nao tem acesso a esta viagem' }, { status: 403 });
    }
    if (!description || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Preencha descricao e valor validos' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Informe a data da despesa' }, { status: 400 });
    }

    const expense = await createExpense({ userId: user.id, tripId, description, amount, currency, category, date });
    return NextResponse.json(expense);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar a despesa';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
