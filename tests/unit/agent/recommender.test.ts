import { describe, it, expect } from "vitest";
import { recommendFulfilment } from "@/domain/fulfilment/recommender";
import type { AvailabilityResult, BundleItem } from "@/domain/types";

const STORE_ID = "DUBLIN_01";

function item(sku: string): BundleItem {
  return { sku, name: sku, category: "HYGIENE", brand: null, priceEur: 5, qty: 1, reasonCode: "r", why: "w" };
}

function avail(sku: string, status: AvailabilityResult["status"]): AvailabilityResult {
  return { sku, storeId: STORE_ID, status, qty: status === "OUT" ? 0 : 5 };
}

describe("recommendFulfilment", () => {
  it("recommends CLICK_COLLECT when urgency=today and store supports CC", () => {
    const items = ["A", "B", "C"].map(item);
    const availability = items.map((i) => avail(i.sku, "IN_STOCK"));
    const r = recommendFulfilment({
      urgency: "today",
      items,
      availability,
      storeId: STORE_ID,
      storeSupportsClickCollect: true,
    });
    expect(r.mode).toBe("CLICK_COLLECT");
    expect(r.oosRatio).toBe(0);
  });

  it("recommends DELIVERY when urgency=today but store has NO CC", () => {
    const items = ["A", "B"].map(item);
    const availability = items.map((i) => avail(i.sku, "IN_STOCK"));
    const r = recommendFulfilment({
      urgency: "today",
      items,
      availability,
      storeId: STORE_ID,
      storeSupportsClickCollect: false,
    });
    expect(r.mode).toBe("DELIVERY");
  });

  it("recommends DELIVERY when > 30% of items are OOS", () => {
    // 4 items, 2 OOS = 50% → DELIVERY
    const items = ["A", "B", "C", "D"].map(item);
    const availability = [
      avail("A", "OUT"),
      avail("B", "OUT"),
      avail("C", "IN_STOCK"),
      avail("D", "IN_STOCK"),
    ];
    const r = recommendFulfilment({
      urgency: "flexible",
      items,
      availability,
      storeId: STORE_ID,
      storeSupportsClickCollect: true,
    });
    expect(r.mode).toBe("DELIVERY");
    expect(r.oosRatio).toBeCloseTo(0.5, 2);
  });

  it("does NOT trigger OOS redirect at exactly 30% OOS (boundary)", () => {
    // 10 items, 3 OOS = 30% → NOT > 30% → falls through to urgency rule
    const items = Array.from({ length: 10 }, (_, i) => item(`X${i}`));
    const availability = items.map((i, idx) =>
      avail(i.sku, idx < 3 ? "OUT" : "IN_STOCK")
    );
    const r = recommendFulfilment({
      urgency: "1_3_days",
      items,
      availability,
      storeId: STORE_ID,
      storeSupportsClickCollect: true,
    });
    // 30% OOS, urgency=1_3_days → default DELIVERY
    expect(r.mode).toBe("DELIVERY");
  });

  it("defaults to DELIVERY for flexible urgency with all in stock", () => {
    const items = ["A", "B", "C"].map(item);
    const availability = items.map((i) => avail(i.sku, "IN_STOCK"));
    const r = recommendFulfilment({
      urgency: "flexible",
      items,
      availability,
      storeId: STORE_ID,
      storeSupportsClickCollect: true,
    });
    expect(r.mode).toBe("DELIVERY");
  });

  it("handles empty basket gracefully (oosRatio = 0)", () => {
    const r = recommendFulfilment({
      urgency: "today",
      items: [],
      availability: [],
      storeId: STORE_ID,
      storeSupportsClickCollect: true,
    });
    expect(r.oosRatio).toBe(0);
    expect(r.mode).toBe("CLICK_COLLECT"); // urgency=today + CC available + 0% OOS
  });

  it("includes a human-readable reason string", () => {
    const items = ["A"].map(item);
    const r = recommendFulfilment({
      urgency: "today",
      items,
      availability: [avail("A", "IN_STOCK")],
      storeId: STORE_ID,
      storeSupportsClickCollect: true,
    });
    expect(r.reason).toBeTruthy();
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it("scopes availability check to the selected store only", () => {
    // Store A has OOS, store B is fine; we ask for store B
    const storeA = "CORK_01";
    const storeB = "DUBLIN_01";
    const items = ["SKU1", "SKU2", "SKU3"].map(item);
    const availability: AvailabilityResult[] = [
      { sku: "SKU1", storeId: storeA, status: "OUT", qty: 0 },
      { sku: "SKU2", storeId: storeA, status: "OUT", qty: 0 },
      { sku: "SKU3", storeId: storeA, status: "OUT", qty: 0 },
      { sku: "SKU1", storeId: storeB, status: "IN_STOCK", qty: 5 },
      { sku: "SKU2", storeId: storeB, status: "IN_STOCK", qty: 5 },
      { sku: "SKU3", storeId: storeB, status: "IN_STOCK", qty: 5 },
    ];
    const r = recommendFulfilment({
      urgency: "flexible",
      items,
      availability,
      storeId: storeB,
      storeSupportsClickCollect: true,
    });
    // storeB is fully in stock → no OOS redirect
    expect(r.oosRatio).toBe(0);
    expect(r.mode).toBe("DELIVERY"); // flexible → default
  });
});
