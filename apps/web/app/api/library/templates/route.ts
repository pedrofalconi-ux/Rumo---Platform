import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '../../../../lib/server-auth';
import { findTripById } from '../../../../lib/server-trip-store';
import { createTemplate, listTemplates } from '../../../../lib/templates-store';

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  destination: z.string().max(160).optional(),
  country: z.string().max(100).optional(),
  suggested_duration_days: z.coerce.number().int().min(1).max(120).optional(),
  budget_range: z.enum(['budget', 'moderate', 'luxury']).optional(),
  pace: z.enum(['slow', 'moderate', 'fast']).optional(),
  traveler_profile: z.string().max(80).optional(),
  language: z.string().max(12).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  settings: z.record(z.unknown()).optional(),
  parent_template_id: z.string().uuid().nullable().optional(),
  sourceTripId: z.string().optional(),
  days: z.array(z.record(z.unknown())).max(120).optional(),
  blocks: z.array(z.record(z.unknown())).max(1000).optional(),
  rules: z.array(z.record(z.unknown())).max(100).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const templates = await listTemplates(user.agencyId, {
      destination: params.get('destination') || undefined,
      profile: params.get('profile') || undefined,
      budget: params.get('budget') || undefined,
      status: params.get('status') || undefined,
      duration: params.get('duration') ? Number(params.get('duration')) : undefined,
      search: params.get('search') || undefined,
      tags: params.getAll('tag'),
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao listar modelos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    const input: any = { ...parsed.data };
    if (parsed.data.sourceTripId) {
      const trip = await findTripById(parsed.data.sourceTripId, user.agencyId);
      if (!trip) return NextResponse.json({ error: 'Viagem de origem não encontrada' }, { status: 404 });
      const items = Array.isArray(trip.itinerary) ? trip.itinerary : [];
      input.destination ||= trip.destinations?.[0] || '';
      input.suggested_duration_days ||= new Set(items.map((item: any) => item.day)).size || 1;
      input.days = Array.from(new Set(items.map((item: any) => Number(item.day) || 1))).map((day) => ({ day_number: day, title: `Dia ${day}` }));
      input.blocks = items.filter((item: any) => !['trip_desc', 'day_summary'].includes(item.type)).map((item: any, index: number) => ({
        day_number: Number(item.day) || 1, item_order: index, title: item.title || 'Atividade',
        description: item.details || '', category: item.type || 'activity',
        period: 'any', is_required: false, metadata: item.meta || {},
      }));
    }
    const template = await createTemplate(input, user.agencyId, user.id);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao criar modelo' }, { status: 500 });
  }
}
