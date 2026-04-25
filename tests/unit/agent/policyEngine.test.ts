import { describe, it, expect } from "vitest";
import {
  isClinicalAdviceQuery,
  filterByTraveller,
  sanitiseOutput,
  DISCLAIMER,
  CLINICAL_ADVICE_REFUSAL,
} from "@/domain/agent/policyEngine";
import type { Product } from "@/domain/types";
import products from "@/data/products.json";

const catalog = products as unknown as Product[];

describe("isClinicalAdviceQuery", () => {
  it("flags clinical queries with 'diagnose'", () => {
    expect(isClinicalAdviceQuery("can you diagnose my rash")).toBe(true);
  });

  it("flags 'prescribe'", () => {
    expect(isClinicalAdviceQuery("please prescribe something for sunburn")).toBe(true);
  });

  it("flags 'cure'", () => {
    expect(isClinicalAdviceQuery("what can cure athlete's foot")).toBe(true);
  });

  it("flags 'treatment for'", () => {
    expect(isClinicalAdviceQuery("what is the treatment for dehydration")).toBe(true);
  });

  it("flags 'diagnosis'", () => {
    expect(isClinicalAdviceQuery("I need a diagnosis")).toBe(true);
  });

  it("does NOT flag normal travel query", () => {
    expect(isClinicalAdviceQuery("travel kit for Spain next week")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isClinicalAdviceQuery("DIAGNOSE my condition")).toBe(true);
  });

  it("does NOT flag empty string", () => {
    expect(isClinicalAdviceQuery("")).toBe(false);
  });
});

describe("filterByTraveller", () => {
  const restrictedSkus = catalog
    .filter((p) => p.attributes.restrictedForChildren)
    .map((p) => p.sku);

  it("removes restricted products for child traveller", () => {
    const filtered = filterByTraveller(catalog, "child");
    const filteredSkus = filtered.map((p) => p.sku);
    for (const sku of restrictedSkus) {
      expect(filteredSkus).not.toContain(sku);
    }
  });

  it("removes restricted products for family traveller", () => {
    const filtered = filterByTraveller(catalog, "family");
    const filteredSkus = filtered.map((p) => p.sku);
    for (const sku of restrictedSkus) {
      expect(filteredSkus).not.toContain(sku);
    }
  });

  it("does NOT remove restricted products for adult traveller", () => {
    const filtered = filterByTraveller(catalog, "adult");
    expect(filtered.length).toBe(catalog.length);
  });

  it("returns full catalog when no restricted items exist (empty catalog)", () => {
    const filtered = filterByTraveller([], "family");
    expect(filtered).toEqual([]);
  });

  it("result length is less than catalog for family with restricted items", () => {
    if (restrictedSkus.length === 0) return; // skip if fixture has none
    const filtered = filterByTraveller(catalog, "family");
    expect(filtered.length).toBeLessThan(catalog.length);
  });
});

describe("sanitiseOutput", () => {
  it("strips prohibited language from output text", () => {
    const out = sanitiseOutput("we can diagnose your condition");
    expect(out).not.toContain("diagnose");
    expect(out).toContain("[…]");
  });

  it("leaves clean text unchanged", () => {
    const text = "Your travel kit is ready.";
    expect(sanitiseOutput(text)).toBe(text);
  });

  it("handles multiple prohibited words in one string", () => {
    const out = sanitiseOutput("we will diagnose and prescribe accordingly");
    expect(out).not.toContain("diagnose");
    expect(out).not.toContain("prescribe");
  });
});

describe("constants", () => {
  it("DISCLAIMER is defined and non-empty", () => {
    expect(DISCLAIMER).toBeTruthy();
    expect(DISCLAIMER.length).toBeGreaterThan(10);
  });

  it("CLINICAL_ADVICE_REFUSAL mentions pharmacist", () => {
    expect(CLINICAL_ADVICE_REFUSAL.toLowerCase()).toContain("pharmacist");
  });
});
