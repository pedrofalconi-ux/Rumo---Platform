export const AI_BLOCK_TYPES = [
  'trip_desc',
  'day_summary',
  'places',
  'activity',
  'transport',
  'text',
  'suggested_places',
] as const;

export type AiBlockType = (typeof AI_BLOCK_TYPES)[number];

export const BLOCKED_AI_BLOCK_TYPES = [
  'flight',
  'hotel',
  'attachments',
  'page_break',
  'import_itinerary',
  'import_trips_excel',
  'import_activities_excel',
  'import_travelers_excel',
] as const;

export type TripProfile = 'lazer' | 'lua_de_mel' | 'aventura' | 'cultural' | 'negocios';

export type AiStatus =
  | 'NONE'
  | 'AI_GENERATING'
  | 'AI_DRAFT'
  | 'AI_REVIEWED'
  | 'AI_FAILED';

export interface TripInput {
  tripId: string;
  agencyId: string;
  title: string;
  origin: string;
  destinations: string[];
  destinationsDetail?: Array<{
    city: string;
    startDate: string;
    endDate: string;
    allTravelers: boolean;
  }>;
  startDate: string;
  endDate: string;
  travelersCount: number;
  clientName: string;
  budget: number;
  currency: 'BRL';
  profile: TripProfile;
  preferences: string;
  locale: 'pt-BR';
}

export interface ItineraryItem {
  id: string;
  day: number;
  type: string;
  title: string;
  subTitle?: string;
  details?: string;
  image?: string;
  customSymbol?: string;
  meta?: Record<string, unknown>;
}

export interface AiGeoPoint {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface TokenUsage {
  tokensIn: number;
  tokensOut: number;
}

export interface GenerateResult {
  itinerary: ItineraryItem[];
  plan: TripPlan;
  meta: AiGenerationMeta;
}

export interface TripPlan {
  tripDescription: {
    title: string;
    summary: string;
    highlights: string[];
  };
  days: Array<{
    day: number;
    date: string;
    destination: string;
    theme: string;
    focus: string[];
  }>;
}

export interface DayBlocks {
  day: number;
  daySummary: {
    title: string;
    subTitle?: string;
    details: string;
    imageSearchQuery?: string;
  };
  blocks: Array<{
    type: AiBlockType;
    title: string;
    subTitle?: string;
    details?: string;
    image?: string;
    imageSearchQuery?: string;
    location?: AiGeoPoint;
    estimatedDurationMinutes?: number;
    recommendedStartTime?: string;
    customSymbol?: string;
    meta?: Record<string, unknown>;
  }>;
}

export interface AiGenerationMeta {
  generationId: string;
  model: string;
  provider: string;
  totalTokensIn: number;
  totalTokensOut: number;
  latencyMs: number;
  daysGenerated: number;
  failedDays?: Array<{ day: number; error: string }>;
}

export interface AiGenerationLog {
  id: string;
  tripId: string;
  agencyId: string;
  userId: string;
  stage: 'plan' | 'day' | 'enrich' | 'full';
  provider: string;
  model: string;
  promptHash: string;
  promptSnapshot: unknown;
  responseSnapshot: unknown;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  createdAt: string;
}

export interface RuleContext {
  constraints: string[];
  blockedTypes: string[];
}

export interface AiOrchestratorConfig {
  provider: string;
  model: string;
  fallbackModels?: string[];
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}
