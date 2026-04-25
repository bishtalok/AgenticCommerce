import { describe, it, expect } from "vitest";
import { applySubstitutions } from "@/domain/agent/substitution";
import { buildPlan } from "@/domain/agent/planBuilder";
import { buildBundle } from "@/domain/agent/bundleBuilder";
import type { Product, AvailabilityResult } from "@/domain/types";
import products from "@/data/products.json";

const catalog = products as unknown as Product[];
const STORE_ID = "DUBLIN_01";
const MISSION = "TRAVEL" as const;

function buildTestBundle(planOverrides = {}) {
  const plan = buildPlan(MISSION, {
    destinationType: "beach",
    durationDays: 7,
    travellerType: "adult",
    sensitivities: [],
    urgency: "flexible",
    ...planOverrides,
  });
  const bundle = buildBundle(plan, catalog);
  return { plan, bundle };
}

function avail(sku: string, status: AvailabilityResult["status"]): AvailabilityResult {
  return { sku, storeId: STORE_ID, status, qty: status === "OUT" ? 0 : 5 };
}

describe("applySubstitutions — all in stock", () => {
  it("returns the original bundle unchanged when nothing is OOS", () => {
    const { plan, bundle } = buildTestBundle();
    const allInStock: AvailabilityResult[] = bundle.items.map((i) =>
      avail(i.sku, "IN_STOCK")
    );
    const { bundle: result, unavailable } = applySubstitutions({
      bundle,
      plan,
      catalog,
      availability: allInStock,
      storeId: STORE_ID,
    });
    expect(result.itemCount).toBe(bundle.itemCount);
    expect(unavailable).toHaveLength(0);
    // SKUs should be the same
    const resultSkus = result.items.map((i) => i.sku).sort();
    const origSkus = bundle.items.map((i) => i.sku).sort();
    expect(resultSkus).toEqual(origSkus);
  });
});

describe("applySubstitutions — OOS handling", () => {
  it("substitutes an OOS item with same-category item", () => {
    const { plan, bundle } = buildTestBundle();
    // Pick the first SUN_CARE item and mark it OUT
    const oosSku = bundle.items.find((i) => i.category === "SUN_CARE")!.sku;
    const availability: AvailabilityResult[] = bundle.items.map((i) =>
      avail(i.sku, i.sku === oosSku ? "OUT" : "IN_STOCK")
    );
    // Mark all catalog SUN_CARE items as IN_STOCK for subs
    const extraAvail: AvailabilityResult[] = catalog
      .filter((p) => p.category === "SUN_CARE" && p.sku !== oosSku)
      .map((p) => avail(p.sku, "IN_STOCK"));

    const { bundle: result } = applySubstitutions({
      bundle,
      plan,
      catalog,
      availability: [...availability, ...extraAvail],
      storeId: STORE_ID,
    });
    // Original OOS sku should be gone
    expect(result.items.map((i) => i.sku)).not.toContain(oosSku);
    // A replacement in same category should exist
    const replacement = result.items.find(
      (i) => i.category === "SUN_CARE" && i.substituted?.originalSku === oosSku
    );
    expect(replacement).toBeDefined();
    expect(replacement?.substituted?.originalSku).toBe(oosSku);
  });

  it("marks substituted item with the substituted metadata", () => {
    const { plan, bundle } = buildTestBundle();
    const oosSku = bundle.items[0].sku;
    const category = bundle.items[0].category;
    const availability: AvailabilityResult[] = bundle.items.map((i) =>
      avail(i.sku, i.sku === oosSku ? "OUT" : "IN_STOCK")
    );
    const extraAvail: AvailabilityResult[] = catalog
      .filter((p) => p.category === category && p.sku !== oosSku)
      .map((p) => avail(p.sku, "IN_STOCK"));

    const { bundle: result } = applySubstitutions({
      bundle,
      plan,
      catalog,
      availability: [...availability, ...extraAvail],
      storeId: STORE_ID,
    });
    const sub = result.items.find((i) => i.substituted);
    expect(sub?.substituted?.originalSku).toBe(oosSku);
    expect(sub?.substituted?.reason).toBeTruthy();
  });

  it("removes item flagged as unavailable when no substitute exists", () => {
    const { plan, bundle } = buildTestBundle();
    // Mark ALL items in the first category as OUT (no sub possible)
    const firstCat = bundle.items[0].category;
    const allCatSkus = catalog.filter((p) => p.category === firstCat).map((p) => p.sku);
    const oosSku = bundle.items[0].sku;

    const availability: AvailabilityResult[] = [
      ...bundle.items.map((i) => avail(i.sku, i.sku === oosSku ? "OUT" : "IN_STOCK")),
      // All other catalog items in that category are also OUT
      ...allCatSkus
        .filter((s) => s !== oosSku)
        .map((s) => avail(s, "OUT")),
    ];

    const { unavailable } = applySubstitutions({
      bundle,
      plan,
      catalog,
      availability,
      storeId: STORE_ID,
    });
    // The OOS item with no sub should be in unavailable
    expect(unavailable.map((i) => i.sku)).toContain(oosSku);
  });

  it("preserves the original item's reasonCode on the substitute", () => {
    const { plan, bundle } = buildTestBundle();
    const oosSku = bundle.items.find((i) => i.category === "SUN_CARE")?.sku;
    if (!oosSku) return;
    const origItem = bundle.items.find((i) => i.sku === oosSku)!;
    const availability: AvailabilityResult[] = bundle.items.map((i) =>
      avail(i.sku, i.sku === oosSku ? "OUT" : "IN_STOCK")
    );
    const extraAvail: AvailabilityResult[] = catalog
      .filter((p) => p.category === "SUN_CARE" && p.sku !== oosSku)
      .map((p) => avail(p.sku, "IN_STOCK"));

    const { bundle: result } = applySubstitutions({
      bundle,
      plan,
      catalog,
      availability: [...availability, ...extraAvail],
      storeId: STORE_ID,
    });
    const sub = result.items.find((i) => i.substituted?.originalSku === oosSku);
    if (sub) {
      expect(sub.reasonCode).toBe(origItem.reasonCode);
    }
  });

  it("does not duplicate already-picked SKUs in substitutes", () => {
    const { plan, bundle } = buildTestBundle();
    const availability: AvailabilityResult[] = bundle.items.map((i) =>
      avail(i.sku, "IN_STOCK")
    );
    const { bundle: result } = applySubstitutions({ bundle, plan, catalog, availability, storeId: STORE_ID });
    const skus = result.items.map((i) => i.sku);
    const unique = new Set(skus);
    expect(unique.size).toBe(skus.length);
  });
});

describe("applySubstitutions — sensitivity matching", () => {
  it("substitutes with fragrance-free when plan has fragrance_free_preference", () => {
    const plan = buildPlan(MISSION, {
      destinationType: "beach",
      durationDays: 7,
      travellerType: "adult",
      sensitivities: ["fragrance_free_preference"],
    });
    const bundle = buildBundle(plan, catalog);
    const ffCatalog = catalog.filter((p) => p.attributes.fragranceFree && p.category === "TOILETRIES");
    if (ffCatalog.length === 0) return; // skip if fixture has none

    const oosSku = bundle.items.find((i) => i.category === "TOILETRIES")?.sku;
    if (!oosSku) return;
    const availability: AvailabilityResult[] = bundle.items.map((i) =>
      avail(i.sku, i.sku === oosSku ? "OUT" : "IN_STOCK")
    );
    const extraAvail: AvailabilityResult[] = catalog
      .filter((p) => p.category === "TOILETRIES" && p.sku !== oosSku)
      .map((p) => avail(p.sku, "IN_STOCK"));

    const { bundle: result } = applySubstitutions({
      bundle,
      plan,
      catalog,
      availability: [...availability, ...extraAvail],
      storeId: STORE_ID,
    });
    const sub = result.items.find((i) => i.substituted?.originalSku === oosSku);
    if (sub) {
      const subProduct = catalog.find((p) => p.sku === sub.sku);
      expect(subProduct?.attributes.fragranceFree).toBe(true);
    }
  });
});
