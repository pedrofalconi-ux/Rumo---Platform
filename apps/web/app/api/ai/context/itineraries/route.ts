import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../../lib/server-auth';
import { getAgencyItineraryReferenceCatalog } from '../../../../../lib/server-itinerary-retriever';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const references = await getAgencyItineraryReferenceCatalog(user.agencyId);
    return NextResponse.json({
      references,
      total: references.length,
      strategy: 'agency_itinerary_context',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao carregar referências';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
