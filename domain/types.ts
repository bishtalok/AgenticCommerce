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

export interface Bundle {
  items: BundleItem[];
  itemCount: number;
  estimatedTotal: number;
  warnings: string[];
}

export interface IntentResult {
  missionCode: MissionCode | null;
  confidence: number;
  alternatives: Array<{ missionCode: string; confidence: number }>;
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
