import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MobileItinerary {
  id: string;
  title: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  travelers: number;
  status: string;
  content: any[];
  documents?: any[];
  agency: AgencyBranding;
}

export interface AgencyBranding {
  name: string;
  logoUrl: string;
  plan: string;
}

// Fallback data for smooth local testing if Supabase tables are not yet seeded
const FALLBACK_AGENCY: AgencyBranding = {
  name: 'Horizon Enterprise',
  logoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5',
  plan: 'pro'
};

const FALLBACK_TRIPS: MobileItinerary[] = [
  {
    id: 'HOR-9921',
    title: 'Viagem Roma Premium',
    destination: 'Roma',
    origin: 'São Paulo (GRU)',
    startDate: '2024-07-24',
    endDate: '2024-07-31',
    travelers: 2,
    status: 'Publicado',
    agency: FALLBACK_AGENCY,
    content: [
      {
        id: 'item-1',
        day: 1,
        type: 'flight',
        title: 'Voo ITA Airways',
        subTitle: 'AZ 673',
        details: 'Voo direto de São Paulo (GRU) para Roma (FCO)',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByVbq23E6OnSqiaWYWht_8Baa9X5GgtucaFmgzZY6ToYLGjTPsAmpieIfEh3-ppopeJYwKzu4fAeAxnUYL07EklM_Ww_OSFKCZVESBQliejmPsC0WN9f3emDyFvsMT9HNSS9zi9pizmHOAoG7OM_vsmzl2X9nSUCNbBOaa_ECdF-O-B6cBjvH4RbcC52EPyW1rPFKQmzvk8phVG9TL_VmGtPtPQwLjanyPbZwBzCk3a2R6pHxc1dPMBikHxV1L0q9kDmCw_PFSTIW5',
        customSymbol: 'flight',
        meta: {
          airline: 'ITA Airways',
          flightNumber: 'AZ 673',
          origin: 'São Paulo (GRU)',
          destination: 'Roma (FCO)',
          departureTime: '14:25',
          arrivalTime: '06:45 (+1 dia)',
          duration: '11h 20m',
        }
      },
      {
        id: 'item-2',
        day: 1,
        type: 'activity',
        title: 'Tour Guiado na Catedral',
        subTitle: 'Catedral Duomo',
        details: 'Visita guiada para explorar os segredos históricos da catedral.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOQiAieOx5qVQtY3TDB2WMJsJDEoi69xdHwHXJiA9BAPXRGTCt33ocGTKv4ruztp7PjotVhrQnwVcQKg1NhDYeB8PYCUrDOZiRIChPoRUxGidQ0fknumzwFh3VJ2_F0Di-bBK-y-Iv8aBatLJx1OcIv8aUhkTdJL8wcPH64UmiCU9OPRFbvEQMgmKjuNG2I2F2lUisTokdPU6J3cfTVJ1MDOLLoAljUHn6TGSCDjNb5VjTyvd6GDvpycoH9JMoPJw6JAIZBSztv5tW',
        customSymbol: 'museum',
        meta: {
          type: 'Tour',
          duration: '2 horas'
        }
      }
    ]
  },
  {
    id: 'HOR-8842',
    title: 'Grand Tour de l\'Italie',
    destination: 'Milão',
    origin: 'São Paulo',
    startDate: '2025-04-01',
    endDate: '2025-04-19',
    travelers: 1,
    status: 'Confirmado',
    agency: FALLBACK_AGENCY,
    content: [
      {
        id: 'item-3',
        day: 1,
        type: 'hotel',
        title: 'NH Collection Touring',
        subTitle: 'Acomodação em Milão',
        details: 'Hotel 4 estrelas premium localizado no centro de Milão.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoZjJz35m8EyEiFJD7-B6xM8MSfSGJ3gFAUHCpWbTtzC6gpvyGHkg2esanTe5uy10gOLbK38rEN5gmMyY0xjPCar1KNb6yej5dVjEcRywodUMS8QNbnXFAop6lEuP4OAyAxqnnPG5FFsZlbTT8UJjM1PrSR-6qpkWRr0MDZ2fi-CQGacKPT4PGQmosNgIcTYbPLjHW7nzohmbMGFDXZqDY0-TUpJR_PPlmy7hsl7vFJFwvFnUL781RvzGhXXmqVWJ4I0FHtzZvLDUi',
        customSymbol: 'hotel',
        meta: {
          address: 'Via Iginio Ugo Tarchetti, 2',
          rooms: '1 Quarto Duplo',
          checkin: '15:00'
        }
      }
    ]
  }
];

export function useTravelerData() {
  const [agency, setAgency] = useState<AgencyBranding>(FALLBACK_AGENCY);
  const [trips, setTrips] = useState<MobileItinerary[]>(FALLBACK_TRIPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabaseUrl || !supabaseAnonKey) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch the first traveler user record to resolve tenant agency
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('agency_id')
          .eq('role', 'traveler')
          .limit(1)
          .maybeSingle();

        if (userError) throw userError;

        let agencyId = userData?.agency_id;

        // If no traveler found, try getting any user to fetch agency_id
        if (!agencyId) {
          const { data: fallbackUser, error: fallbackUserError } = await supabase
            .from('users')
            .select('agency_id')
            .limit(1)
            .maybeSingle();
          
          if (!fallbackUserError && fallbackUser) {
            agencyId = fallbackUser.agency_id;
          }
        }

        if (agencyId) {
          // 2. Fetch Agency branding info
          const { data: agencyData, error: agencyError } = await supabase
            .from('agencies')
            .select('name, logo_url, plan')
            .eq('id', agencyId)
            .single();

          if (!agencyError && agencyData) {
            setAgency({
              name: agencyData.name,
              logoUrl: agencyData.logo_url || FALLBACK_AGENCY.logoUrl,
              plan: agencyData.plan || 'starter'
            });
          }

          // 3. Fetch Itineraries (Trips)
          const { data: itinerariesData, error: itinerariesError } = await supabase
            .from('itineraries')
            .select('*')
            .eq('agency_id', agencyId)
            .order('created_at', { ascending: false });

          if (!itinerariesError && itinerariesData && itinerariesData.length > 0) {
            const formattedTrips: MobileItinerary[] = itinerariesData.map((item: any) => ({
              id: item.id,
              title: item.title,
              destination: item.destination,
              origin: item.origin,
              startDate: item.start_date,
              endDate: item.end_date,
              travelers: item.travelers || 1,
              status: item.status || 'draft',
              content: item.content || [],
              documents: item.documents || [],
              agency: {
                name: agencyData?.name || FALLBACK_AGENCY.name,
                logoUrl: agencyData?.logo_url || FALLBACK_AGENCY.logoUrl,
                plan: agencyData?.plan || 'starter'
              }
            }));
            setTrips(formattedTrips);
          }
        }
      } catch (err: any) {
        console.error('Supabase fetch error, using local fallback:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { agency, trips, loading, error };
}
