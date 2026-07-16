import type { TripInput, TripPlan } from '../types';

export const POI_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'attraction',
  'viewpoint',
  'park',
  'market',
] as const;

export type PoiType = (typeof POI_TYPES)[number];

export interface CuratedPoi {
  id: string;
  city: string;
  country?: string;
  name: string;
  type: PoiType;
  subType?: string;
  description?: string;
  neighborhood?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceRange?: string;
  tags: string[];
  source: string;
  sourceRef: string;
  lastVerifiedAt: string;
  partner?: boolean;
  featuredRank?: number;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  openingHoursText?: string[];
  websiteUri?: string;
  googleMapsUri?: string;
}

export interface PoiRetrievalRequest {
  input: TripInput;
  dayPlan: TripPlan['days'][number];
  limit: number;
}

export interface PoiRetrievalResult {
  pois: CuratedPoi[];
  coverage: 'covered' | 'partial' | 'uncovered';
  normalizedCity: string;
}

export interface PoiRetriever {
  retrieve(request: PoiRetrievalRequest): Promise<PoiRetrievalResult>;
}

export const uncoveredPoiResult = (city: string): PoiRetrievalResult => ({
  pois: [],
  coverage: 'uncovered',
  normalizedCity: city.trim(),
});
