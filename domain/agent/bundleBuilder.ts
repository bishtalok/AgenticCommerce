import { getMissionConfig } from "@/domain/mission/config";
import { filterByTraveller } from "@/domain/agent/policyEngine";
import type {
  Bundle,
  BundleItem,
  Product,
  ProductCategory,
  TravelPlan,
  PriceBand,
  Sensitivity,
} from "@/domain/types";

export interface BuildBundleOptions {
  priceBand?: PriceBand;
  exclusions?: ProductCategory[];
  /** SKUs the user has explicitly removed — we respect these across regeneration. */
  removedSkus?: string[];
}

/**
 * Governed bundle builder (PRD §4 FR-030–033).
 *
 * Rules:
 *  - Enforces required categories from mission config (with city-short-trip override).
 *  - Swaps SUN_CARE for LIP_CARE + MOISTURISER on city + winter (duration < 5 AND
 *    destinationType = city) — config-driven via `requiredCategories.overrides`.
 *  - Matches sensitivity preferences (fragrance-free / sensitive skin).
 *  - Filters `restrictedForChildren` for child/family travellers.
 *  - Degrades price-band gracefully when a preferred tier has no match.
 *  - Writes a short `why` string per item for the UI "why added" chips.
 */
export function buildBundle(
  plan: TravelPlan,
  catalog: Product[],
  opts: BuildBundleOptions = {}
): Bundle {
  const priceBand = opts.priceBand ?? plan.constraints.priceBand;
  const excluded = new Set(opts.exclusions ?? []);
  const removed = new Set(opts.removedSkus ?? []);

  const warnings: string[] = [];

  const allowedCatalog = filterByTraveller(catalog, plan.travellerType);

  const items: BundleItem[] = [];

  for (const category of plan.constraints.requiredCategories) {
    if (excluded.has(category)) continue;

    const pick = pickProduct({
      category,
      plan,
      priceBand,
      catalog: allowedCatalog,
      removed,
      alreadyPickedSkus: new Set(items.map((i) => i.sku)),
    });

    if (!pick) {
      warnings.push(`No suitable product found for ${prettyCategory(category)}.`);
      continue;
    }

    const { product, why, effectivePriceBand } = pick;

    if (effectivePriceBand !== priceBand) {
      warnings.push(
        `${prettyCategory(category)}: preferred ${priceBand} tier unavailable — showing ${effectivePriceBand}.`
      );
    }

    items.push({
      sku: product.sku,
      name: product.name,
      category: product.category,
      brand: product.brand,
      priceEur: product.priceEur,
      qty: 1,
      reasonCode: reasonCodeFor(product.category),
      why,
    });
  }

  // Ensure we hit the minimum item count — pad with safe optional categories
  // if required categories alone don't fill the floor.
  const min = plan.constraints.minItems;
  if (items.length < min) {
    const padCategories: ProductCategory[] = ["LIP_CARE", "MOISTURISER", "HYGIENE"];
    for (const cat of padCategories) {
      if (items.length >= min) break;
      if (excluded.has(cat)) continue;
      if (items.some((i) => i.category === cat)) continue;
      const pick = pickProduct({
        category: cat,
        plan,
        priceBand,
        catalog: allowedCatalog,
        removed,
        alreadyPickedSkus: new Set(items.map((i) => i.sku)),
      });
      if (pick) {
        items.push({
          sku: pick.product.sku,
          name: pick.product.name,
          category: pick.product.category,
          brand: pick.product.brand,
          priceEur: pick.product.priceEur,
          qty: 1,
          reasonCode: reasonCodeFor(pick.product.category),
          why: pick.why,
        });
      }
    }
  }

  const estimatedTotal = round2(items.reduce((s, i) => s + i.priceEur * i.qty, 0));

  return {
    items,
    itemCount: items.length,
    estimatedTotal,
    warnings,
  };
}

// ---------- internals ----------

interface PickArgs {
  category: ProductCategory;
  plan: TravelPlan;
  priceBand: PriceBand;
  catalog: Product[];
  removed: Set<string>;
  alreadyPickedSkus: Set<string>;
}

interface PickResult {
  product: Product;
  why: string;
  effectivePriceBand: PriceBand;
}

function pickProduct(args: PickArgs): PickResult | null {
  const candidates = args.catalog
    .filter((p) => p.category === args.category)
    .filter((p) => !args.removed.has(p.sku))
    .filter((p) => !args.alreadyPickedSkus.has(p.sku));

  if (candidates.length === 0) return null;

  const scored = candidates.map((p) => ({
    product: p,
    score: scoreCandidate(p, args.plan, args.priceBand),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;

  const chosen = best.product;
  const effectivePriceBand =
    (chosen.attributes.priceBand as PriceBand | undefined) ?? args.priceBand;

  return {
    product: chosen,
    why: buildWhy(chosen, args.plan),
    effectivePriceBand,
  };
}

function scoreCandidate(p: Product, plan: TravelPlan, targetBand: PriceBand): number {
  let score = 10;

  // Price band match.
  if (p.attributes.priceBand === targetBand) score += 5;
  else if (bandDistance(p.attributes.priceBand, targetBand) === 1) score += 2;

  // Sensitivity preferences.
  const wantsSensitive = plan.sensitivities.includes("sensitive_skin");
  const wantsFragranceFree = plan.sensitivities.includes("fragrance_free_preference");
  if (wantsSensitive && p.attributes.sensitiveSkin) score += 4;
  if (wantsSensitive && !p.attributes.sensitiveSkin) score -= 2;
  if (wantsFragranceFree && p.attributes.fragranceFree) score += 3;
  if (wantsFragranceFree && !p.attributes.fragranceFree) score -= 2;

  // Travel size preferred.
  if (p.attributes.travelSize) score += 1;

  // Child-friendly bonus for family/child travellers.
  if (
    (plan.travellerType === "child" || plan.travellerType === "family") &&
    p.attributes.forChildren
  ) {
    score += 3;
  }

  // Higher SPF preferred for beach trips.
  if (plan.destinationType === "beach" && p.attributes.spf) {
    score += Math.min(3, Math.floor(p.attributes.spf / 20));
  }

  // Slight penalty on aerosol where a non-aerosol alternative exists.
  if (p.attributes.aerosol) score -= 1;

  return score;
}

function bandDistance(
  a: PriceBand | undefined,
  b: PriceBand
): number {
  const order: PriceBand[] = ["value", "mid", "premium"];
  if (!a) return 99;
  return Math.abs(order.indexOf(a) - order.indexOf(b));
}

function buildWhy(p: Product, plan: TravelPlan): string {
  const parts: string[] = [];

  if (p.category === "SUN_CARE") {
    if (plan.destinationType === "beach") parts.push("High sun exposure.");
    else if (plan.destinationType === "mixed") parts.push("Some outdoor time expected.");
    else if (plan.destinationType === "city") parts.push("Useful for sunny city days.");
    else parts.push("Included by default for sun protection.");
  } else if (p.category === "TOILETRIES") {
    parts.push("Daily travel hygiene.");
  } else if (p.category === "HYGIENE") {
    parts.push("Handy for flights and out and about.");
  } else if (p.category === "FIRST_AID") {
    parts.push("Covers minor cuts and grazes.");
  } else if (p.category === "HYDRATION") {
    parts.push("Helps in warm climates and long flights.");
  } else if (p.category === "LIP_CARE") {
    parts.push("Protects lips in dry or cold air.");
  } else if (p.category === "MOISTURISER") {
    parts.push("Keeps skin comfortable on the move.");
  }

  if (
    plan.sensitivities.includes("sensitive_skin") &&
    (p.attributes.sensitiveSkin || p.attributes.fragranceFree)
  ) {
    parts.push("Matches your sensitive-skin preference.");
  } else if (
    plan.sensitivities.includes("fragrance_free_preference") &&
    p.attributes.fragranceFree
  ) {
    parts.push("Fragrance-free.");
  }

  if (
    (plan.travellerType === "child" || plan.travellerType === "family") &&
    p.attributes.forChildren
  ) {
    parts.push("Suitable for children.");
  }

  return parts.join(" ");
}

function reasonCodeFor(category: ProductCategory): string {
  const cfg = getMissionConfig("TRAVEL");
  const codes = cfg.reasonCodes as Record<string, string>;
  return codes[category] ?? category;
}

function prettyCategory(c: ProductCategory): string {
  return c.toLowerCase().replace(/_/g, " ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Re-export for convenience.
export { filterByTraveller } from "@/domain/agent/policyEngine";
// Re-export helpers for tests.
export const _test = {
  scoreCandidate,
  bandDistance,
  buildWhy,
  pickProduct,
};
// Expose Sensitivity type locally for external typing.
export type { Sensitivity } from "@/domain/types";
