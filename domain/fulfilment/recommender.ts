import type { AvailabilityResult, BundleItem, FulfilmentMode, Urgency } from "@/domain/types";

/**
 * Fulfilment recommendation (PRD §4 FR-042).
 *
 * Rules:
 *  - If urgency = today AND Click & Collect is available → recommend CLICK_COLLECT.
 *  - If > 30% of basket items are OUT in the chosen store → recommend DELIVERY.
 *  - Otherwise fall back to DELIVERY (safe default).
 */
export function recommendFulfilment(args: {
  urgency: Urgency;
  items: BundleItem[];
  availability: AvailabilityResult[];
  storeId?: string;
  storeSupportsClickCollect?: boolean;
}): {
  mode: FulfilmentMode;
  reason: string;
  oosRatio: number;
} {
  const storeAvail = args.storeId
    ? args.availability.filter((a) => a.storeId === args.storeId)
    : args.availability;
  const statusBySku = new Map(storeAvail.map((a) => [a.sku, a.status] as const));

  let oos = 0;
  for (const item of args.items) {
    const s = statusBySku.get(item.sku);
    if (s === "OUT") oos += 1;
  }
  const oosRatio = args.items.length === 0 ? 0 : oos / args.items.length;

  const canClickCollect = args.storeSupportsClickCollect !== false;

  if (oosRatio > 0.3) {
    return {
      mode: "DELIVERY",
      reason:
        "Several items are out of stock in this store — delivery or a different store is faster.",
      oosRatio,
    };
  }

  if (args.urgency === "today" && canClickCollect) {
    return {
      mode: "CLICK_COLLECT",
      reason: "Need it today — pick up in store is the fastest option.",
      oosRatio,
    };
  }

  if (args.urgency === "today" && !canClickCollect) {
    return {
      mode: "DELIVERY",
      reason: "This store doesn't support Click & Collect — defaulting to delivery.",
      oosRatio,
    };
  }

  return {
    mode: "DELIVERY",
    reason: "Delivery is the safest default for flexible timing.",
    oosRatio,
  };
}
