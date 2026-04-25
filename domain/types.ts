// Shared domain types — the agent and services speak these.
// Keep these pure (no Prisma imports) so agent modules stay testable without a DB.

export type MissionCode = "TRAVEL";

export type DestinationType = "beach" | "city" | "mixed" | "unknown";
export type TravellerType = "adult" | "child" | "family";
export type Urgency = "today" | "1_3_days" | "flexible";
export type Sensitivity = "sensitive_skin" | "fragrance_free_preference";
export type PriceBand = "value" | "mid" | "premium";

export type ProductCategory =
  | "SUN_CARE"
  | "TOILETRIES"
  | "HYGIENE"
  | "FIRST_AID"
  | "HYDRATION"
  | "LIP_CARE"
  | "MOISTURISER";

export interface ProductAttributes {
  priceBand?: PriceBand;
  spf?: number;
  sizeMl?: number;
  travelSize?: boolean;
  fragranceFree?: boolean;
  sensitiveSkin?: boolean;
  aerosol?: boolean;
  restrictedForChildren?: boolean;
  forChildren?: boolean;
}

export interface Product {
  sku: string;
  name: string;
  category: ProductCategory;
  subCategory: string | null;
  brand: string | null;
  priceEur: number;
  attributes: ProductAttributes;
  warnings: string | null;
}

export interface MissionAnswers {
  destinationType?: DestinationType;
  durationDays?: number;
  travellerType?: TravellerType;
  sensitivities?: Sensitivity[];
  urgency?: Urgency;
}

export interface TravelPlan {
  destinationType: DestinationType;
  durationDays: number;
  travellerType: TravellerType;
  sensitivities: Sensitivity[];
  urgency: Urgency;
  summary: string;
  constraints: {
    priceBand: PriceBand;
    minItems: number;
    maxItems: number;
    requiredCategories: ProductCategory[];
  };
}

export interface BundleItem {
  sku: string;
  name: string;
  category: ProductCategory;
  brand: string | null;
  priceEur: number;
  qty: number;
  reasonCode: string;
  why: string;
  substituted?: {
    originalSku: string;
    reason: string;
  };
}

/** Per-product score components — drives the Reasoning panel. */
export interface ScoreBreakdown {
  base: number;
  priceBandBonus: number;
  sensitiveBonus: number;
  fragranceFreeBonus: number;
  travelSizeBonus: number;
  childFriendlyBonus: number;
  destSpfBonus: number;     // +6/+9 meets minimum, -15 below
  destHydrationBonus: number;
  destTapWaterBonus: number;
  beachSpfBonus: number;    // fallback when no destination matched
  aerosolPenalty: number;
  total: number;
}

export interface ScoredCandidate {
  sku: string;
  name: string;
  brand: string | null;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface CategoryReasoning {
  category: ProductCategory;
  candidatesEvaluated: number;
  winner: ScoredCandidate;
  runnerUp: ScoredCandidate | null;
  priceBandDegraded: boolean;
}

export interface BundleReasoning {
  destinationMatched: boolean;
  destinationDisplayName: string;
  destinationFlag: string;
  uvIndexPeak: number;
  avgTempC: number;
  spfMinimum: number;
  malariaRisk: boolean;
  tapWaterSafe: boolean;
  requiredCategories: ProductCategory[];
  effectivePriceBand: PriceBand;
  categories: CategoryReasoning[];
}

export interface Bundle {
  items: BundleItem[];
  itemCount: number;
  estimatedTotal: number;
  warnings: string[];
  reasoning?: BundleReasoning;
}

export interface IntentResult {
  missionCode: MissionCode | null;
  confidence: number;
  alternatives: Array<{ missionCode: string; confidence: number }>;
}

/** Wraps a single inferred value with its confidence and a human-readable source explanation. */
export interface InferredField<T> {
  value: T;
  /** 0–1 extraction confidence for this specific field. */
  confidence: number;
  /** Short text shown in the inference card, e.g. "from '2 weeks'". */
  source: string;
}

/** Result of running all query-intelligence extractors on the user's free-text query. */
export interface InferenceResult {
  destinationType: InferredField<DestinationType> | null;
  durationDays: InferredField<number> | null;
  travellerType: InferredField<TravellerType> | null;
  sensitivities: InferredField<Sensitivity[]> | null;
  priceBand: InferredField<PriceBand> | null;
  /** Average confidence across the three critical fields (destinationType, durationDays, travellerType). */
  overallConfidence: number;
  /** All three critical fields extracted at confidence ≥ 0.7 — safe to skip the question flow entirely. */
  canSkipAllQuestions: boolean;
  /** At least one critical field extracted at confidence ≥ 0.7 — skip known questions. */
  canSkipSomeQuestions: boolean;
}

export interface QuestionDef {
  id: string;
  order: number;
  text: string;
  type: "choice" | "multi" | "number";
  options?: Array<{ value: string; label: string }>;
  validation?: { min?: number; max?: number };
  default?: unknown;
  critical: boolean;
}

export interface NextQuestion {
  question: QuestionDef | null;
  progress: { current: number; total: number };
  done: boolean;
}

export interface InventoryRecord {
  storeId: string;
  sku: string;
  qty: number;
  status: "IN_STOCK" | "LOW" | "OUT" | "UNKNOWN";
}

export interface AvailabilityResult {
  sku: string;
  storeId: string;
  status: "IN_STOCK" | "LOW" | "OUT" | "UNKNOWN";
  qty: number;
}

export type FulfilmentMode = "DELIVERY" | "CLICK_COLLECT";

export type { DestinationContext } from "@/domain/agent/destinationIntelligence";
