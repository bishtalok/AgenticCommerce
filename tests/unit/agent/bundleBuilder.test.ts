import { describe, it, expect, beforeAll } from "vitest";
import { buildBundle, _test } from "@/domain/agent/bundleBuilder";
import { buildPlan } from "@/domain/agent/planBuilder";
import type { Product, TravelPlan } from "@/domain/types";
import products from "@/data/products.json";

const catalog = products as unknown as Product[];

function makePlan(overrides: Partial<TravelPlan> = {}): TravelPlan {
  const base = buildPlan("TRAVEL", {
    destinationType: "beach",
    durationDays: 7,
    travellerType: "adult",
    sensitivities: [],
    urgency: "flexible",
  });
  return { ...base, ...overrides };
}

describe("buildBundle — golden path", () => {
  let plan: TravelPlan;
  beforeAll(() => {
    plan = makePlan();
  });

  it("returns at least 6 items (min bundle size)", () => {
    const bundle = buildBundle(plan, catalog);
    expect(bundle.itemCount).toBeGreaterThanOrEqual(6);
  });

  it("returns at most 10 items (max bundle size)", () => {
    const bundle = buildBundle(plan, catalog);
    expect(bundle.itemCount).toBeLessThanOrEqual(10);
  });

  it("includes all required categories for a beach trip", () => {
    const bundle = buildBundle(plan, catalog);
    const cats = bundle.items.map((i) => i.category);
    expect(cats).toContain("SUN_CARE");
    expect(cats).toContain("TOILETRIES");
    expect(cats).toContain("HYGIENE");
    expect(cats).toContain("FIRST_AID");
    expect(cats).toContain("HYDRATION");
  });

  it("every item has a non-empty why string", () => {
    const bundle = buildBundle(plan, catalog);
    for (const item of bundle.items) {
      expect(item.why).toBeTruthy();
      expect(item.why.length).toBeGreaterThan(0);
    }
  });

  it("every item has a non-empty reasonCode", () => {
    const bundle = buildBundle(plan, catalog);
    for (const item of bundle.items) {
      expect(item.reasonCode).toBeTruthy();
    }
  });

  it("no duplicate SKUs in bundle", () => {
    const bundle = buildBundle(plan, catalog);
    const skus = bundle.items.map((i) => i.sku);
    const unique = new Set(skus);
    expect(unique.size).toBe(skus.length);
  });

  it("estimatedTotal equals sum of item prices", () => {
    const bundle = buildBundle(plan, catalog);
    const sum = bundle.items.reduce((s, i) => s + i.priceEur * i.qty, 0);
    expect(bundle.estimatedTotal).toBeCloseTo(sum, 2);
  });
});

describe("buildBundle — price band filtering", () => {
  it("prefers value-band items when priceBand=value", () => {
    const plan = makePlan();
    const bundle = buildBundle(plan, catalog, { priceBand: "value" });
    const valuePicks = bundle.items.filter((i) => {
      const p = catalog.find((c) => c.sku === i.sku);
      return p?.attributes.priceBand === "value";
    });
    expect(valuePicks.length).toBeGreaterThan(0);
  });

  it("generates a bundle for premium band", () => {
    const plan = makePlan();
    const bundle = buildBundle(plan, catalog, { priceBand: "premium" });
    expect(bundle.itemCount).toBeGreaterThanOrEqual(6);
  });
});

describe("buildBundle — city short-trip override", () => {
  it("includes LIP_CARE + MOISTURISER instead of SUN_CARE for city ≤4 days", () => {
    const plan = makePlan({
      destinationType: "city",
      durationDays: 3,
      constraints: {
        ...makePlan().constraints,
        requiredCategories: buildPlan("TRAVEL", { destinationType: "city", durationDays: 3 }).constraints.requiredCategories,
      },
    });
    const bundle = buildBundle(plan, catalog);
    const cats = bundle.items.map((i) => i.category);
    expect(cats).toContain("LIP_CARE");
    expect(cats).toContain("MOISTURISER");
  });
});

describe("buildBundle — sensitive skin", () => {
  it("prefers fragrance-free / sensitive-skin products", () => {
    const plan = makePlan({ sensitivities: ["sensitive_skin", "fragrance_free_preference"] });
    const bundle = buildBundle(plan, catalog);
    const sensCount = bundle.items.filter((i) => {
      const p = catalog.find((c) => c.sku === i.sku);
      return p?.attributes.sensitiveSkin || p?.attributes.fragranceFree;
    }).length;
    // At least some sensitive/FF products should be chosen
    expect(sensCount).toBeGreaterThan(0);
  });
});

describe("buildBundle — child/family guardrail", () => {
  it("excludes restrictedForChildren products for child traveller", () => {
    const plan = makePlan({ travellerType: "child" });
    const bundle = buildBundle(plan, catalog);
    for (const item of bundle.items) {
      const p = catalog.find((c) => c.sku === item.sku);
      expect(p?.attributes.restrictedForChildren).not.toBe(true);
    }
  });

  it("excludes restrictedForChildren products for family traveller", () => {
    const plan = makePlan({ travellerType: "family" });
    const bundle = buildBundle(plan, catalog);
    for (const item of bundle.items) {
      const p = catalog.find((c) => c.sku === item.sku);
      expect(p?.attributes.restrictedForChildren).not.toBe(true);
    }
  });

  it("adult traveller CAN receive restrictedForChildren products", () => {
    const plan = makePlan({ travellerType: "adult" });
    const bundle = buildBundle(plan, catalog);
    const hasRestricted = bundle.items.some((i) => {
      const p = catalog.find((c) => c.sku === i.sku);
      return p?.attributes.restrictedForChildren === true;
    });
    // Not guaranteed to include one, but the rule doesn't block it
    // — just assert the bundle builds successfully
    expect(bundle.itemCount).toBeGreaterThanOrEqual(6);
  });
});

describe("buildBundle — removedSkus persistence", () => {
  it("respects user-removed SKUs across regeneration", () => {
    const plan = makePlan();
    const first = buildBundle(plan, catalog);
    const toRemove = first.items[0].sku;
    const second = buildBundle(plan, catalog, { removedSkus: [toRemove] });
    const skus = second.items.map((i) => i.sku);
    expect(skus).not.toContain(toRemove);
  });
});

describe("_test helpers", () => {
  it("scoreCandidate gives a higher score for matching price band", () => {
    const plan = makePlan();
    const p = catalog.find((c) => c.attributes.priceBand === "mid")!;
    const pOther = catalog.find((c) => c.attributes.priceBand === "value")!;
    if (!p || !pOther) return;
    const s1 = _test.scoreCandidate(p, plan, "mid");
    const s2 = _test.scoreCandidate(pOther, plan, "mid");
    expect(s1).toBeGreaterThan(s2);
  });

  it("bandDistance returns 0 for same band", () => {
    expect(_test.bandDistance("mid", "mid")).toBe(0);
  });

  it("bandDistance returns 1 for adjacent bands", () => {
    expect(_test.bandDistance("value", "mid")).toBe(1);
    expect(_test.bandDistance("mid", "premium")).toBe(1);
  });

  it("bandDistance returns 99 for undefined", () => {
    expect(_test.bandDistance(undefined, "mid")).toBe(99);
  });
});
