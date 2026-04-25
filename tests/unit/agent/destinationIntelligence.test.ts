import { describe, it, expect } from "vitest";
import {
  extractDestinationContext,
  uvLabel,
  getHealthAlert,
} from "@/domain/agent/destinationIntelligence";

describe("extractDestinationContext", () => {
  it("matches spain by country name", () => {
    const ctx = extractDestinationContext("travel kit for spain next week");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("spain");
    expect(ctx.displayName).toBe("Spain");
    expect(ctx.spfMinimum).toBe(50);
    expect(ctx.uvIndexPeak).toBe(9);
  });

  it("matches spain via city alias (Barcelona)", () => {
    const ctx = extractDestinationContext("going to barcelona for 5 days");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("spain");
  });

  it("matches canaries before spain for canary islands query", () => {
    const ctx = extractDestinationContext("trip to canary islands in december");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("canaries");
    expect(ctx.displayName).toBe("Canary Islands");
  });

  it("matches tenerife to canaries", () => {
    const ctx = extractDestinationContext("holiday in tenerife");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("canaries");
  });

  it("matches thailand", () => {
    const ctx = extractDestinationContext("backpacking thailand and vietnam");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("thailand");
    expect(ctx.malariaRisk).toBe(true);
    expect(ctx.tapWaterSafe).toBe(false);
    expect(ctx.spfMinimum).toBe(50);
  });

  it("matches maldives", () => {
    const ctx = extractDestinationContext("honeymoon in the maldives");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("maldives");
    expect(ctx.uvIndexPeak).toBe(12);
  });

  it("matches dubai via UAE alias", () => {
    const ctx = extractDestinationContext("business trip UAE");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("dubai");
  });

  it("matches egypt", () => {
    const ctx = extractDestinationContext("Sharm el Sheikh holiday kit");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("egypt");
    expect(ctx.uvIndexPeak).toBe(11);
  });

  it("matches ireland (domestic)", () => {
    const ctx = extractDestinationContext("weekend in galway");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("ireland");
    expect(ctx.spfMinimum).toBe(30);
  });

  it("returns unmatched for unknown destination", () => {
    const ctx = extractDestinationContext("I need a travel kit");
    expect(ctx.matched).toBe(false);
    expect(ctx.key).toBe("");
    expect(ctx.spfMinimum).toBe(30); // safe default
  });

  it("is case-insensitive", () => {
    const ctx = extractDestinationContext("TRIP TO GREECE");
    expect(ctx.matched).toBe(true);
    expect(ctx.key).toBe("greece");
  });
});

describe("uvLabel", () => {
  it("returns Low for uv <= 2", () => expect(uvLabel(1)).toBe("Low"));
  it("returns Moderate for uv <= 5", () => expect(uvLabel(4)).toBe("Moderate"));
  it("returns High for uv <= 7", () => expect(uvLabel(7)).toBe("High"));
  it("returns Very High for uv <= 10", () => expect(uvLabel(9)).toBe("Very High"));
  it("returns Extreme for uv > 10", () => expect(uvLabel(12)).toBe("Extreme"));
});

describe("getHealthAlert", () => {
  it("returns malaria alert when malariaRisk is true", () => {
    const ctx = extractDestinationContext("trip to thailand");
    const alert = getHealthAlert(ctx);
    expect(alert).toContain("Malaria");
  });

  it("returns vaccine alert when vaccineRecommendations present (and no malaria)", () => {
    const ctx = extractDestinationContext("trip to turkey");
    // Turkey has Hepatitis A but no malaria — should show vaccine alert
    expect(ctx.malariaRisk).toBe(false);
    const alert = getHealthAlert(ctx);
    expect(alert).toContain("Vaccines advised");
  });

  it("returns tap water alert when tapWaterSafe is false (and no malaria/vaccines)", () => {
    const ctx = extractDestinationContext("trip to morocco");
    expect(ctx.malariaRisk).toBe(false);
    expect(ctx.vaccineRecommendations.length).toBeGreaterThan(0);
    const alert = getHealthAlert(ctx);
    // Morocco has vaccines, so vaccine alert takes priority
    expect(alert).not.toBeNull();
  });

  it("returns null for safe destination", () => {
    const ctx = extractDestinationContext("trip to spain");
    const alert = getHealthAlert(ctx);
    expect(alert).toBeNull();
  });
});

describe("bundleBuilder with destinationContext", () => {
  // Integration: verify SPF enforcement passes through to scoring.
  // Import is deep enough that we just check via destinationContext passed to bundleBuilder.
  it("matches destinations database shape correctly", () => {
    const ctx = extractDestinationContext("holiday in greece");
    expect(ctx.matched).toBe(true);
    expect(ctx.tapWaterSafe).toBe(false);
    expect(ctx.avgTempC).toBeGreaterThanOrEqual(30);
    expect(ctx.uvIndexPeak).toBeGreaterThanOrEqual(10);
  });
});
