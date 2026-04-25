import type {
  Bundle,
  BundleItem,
  Product,
  TravelPlan,
  AvailabilityResult,
} from "@/domain/types";
import { filterByTraveller } from "@/domain/agent/policyEngine";

/**
 * Substitution logic (PRD §4 FR-033).
 *
 * For each bundle item that is OUT in the chosen store, try to find a
 * category-matched substitute that honours sensitivity tags and size
 * constraints. If no safe substitute exists the item is flagged as
 * unavailable (and removed).
 */
export function applySubstitutions(args: {
  bundle: Bundle;
  plan: TravelPlan;
  catalog: Product[];
  availability: AvailabilityResult[]; // per-SKU status in the chosen store
  storeId: string;
}): { bundle: Bundle; unavailable: BundleItem[] } {
  const { bundle, plan, catalog } = args;

  const statusBySku = new Map(
    args.availability
      .filter((a) => a.storeId === args.storeId)
      .map((a) => [a.sku, a.status] as const)
  );

  const allowedCatalog = filterByTraveller(catalog, plan.travellerType);
  const unavailable: BundleItem[] = [];
  const newItems: BundleItem[] = [];
  const usedSkus = new Set<string>(bundle.items.map((i) => i.sku));

  for (const item of bundle.items) {
    const status = statusBySku.get(item.sku) ?? "UNKNOWN";
    if (status !== "OUT") {
      newItems.push(item);
      continue;
    }

    const originalProduct = catalog.find((p) => p.sku === item.sku);
    const substitute = findSubstitute({
      original: item,
      originalProduct,
      plan,
      catalog: allowedCatalog,
      statusBySku,
      used: usedSkus,
    });

    if (substitute) {
      usedSkus.add(substitute.sku);
      newItems.push({
        sku: substitute.sku,
        name: substitute.name,
        category: substitute.category,
        brand: substitute.brand,
        priceEur: substitute.priceEur,
        qty: item.qty,
        reasonCode: item.reasonCode,
        why: item.why,
        substituted: {
          originalSku: item.sku,
          reason: "Original out of stock — substituted with closest match.",
        },
      });
    } else {
      unavailable.push(item);
    }
  }

  const estimatedTotal = round2(
    newItems.reduce((s, i) => s + i.priceEur * i.qty, 0)
  );

  return {
    bundle: {
      items: newItems,
      itemCount: newItems.length,
      estimatedTotal,
      warnings: bundle.warnings,
    },
    unavailable,
  };
}

interface FindSubstituteArgs {
  original: BundleItem;
  originalProduct: Product | undefined;
  plan: TravelPlan;
  catalog: Product[];
  statusBySku: Map<string, AvailabilityResult["status"]>;
  used: Set<string>;
}

function findSubstitute(args: FindSubstituteArgs): Product | null {
  const wantsSensitive = args.plan.sensitivities.includes("sensitive_skin");
  const wantsFragranceFree = args.plan.sensitivities.includes("fragrance_free_preference");
  const originalSize = args.originalProduct?.attributes.sizeMl;

  const candidates = args.catalog
    .filter((p) => p.category === args.original.category)
    .filter((p) => p.sku !== args.original.sku)
    .filter((p) => !args.used.has(p.sku))
    .filter((p) => {
      const s = args.statusBySku.get(p.sku);
      return s === "IN_STOCK" || s === "LOW";
    })
    .filter((p) => {
      if (wantsSensitive && !(p.attributes.sensitiveSkin || p.attributes.fragranceFree)) {
        return false;
      }
      if (wantsFragranceFree && !p.attributes.fragranceFree) return false;
      return true;
    })
    .filter((p) => {
      if (originalSize && p.attributes.sizeMl) {
        // Accept substitutes within +/- 50% of the original size.
        const ratio = p.attributes.sizeMl / originalSize;
        return ratio >= 0.5 && ratio <= 1.5;
      }
      return true;
    });

  if (candidates.length === 0) return null;

  // Prefer same sub-category when available.
  candidates.sort((a, b) => {
    const aMatch = a.subCategory === args.originalProduct?.subCategory ? 1 : 0;
    const bMatch = b.subCategory === args.originalProduct?.subCategory ? 1 : 0;
    return bMatch - aMatch;
  });

  return candidates[0];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
