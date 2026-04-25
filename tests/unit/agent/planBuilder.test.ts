import { describe, it, expect } from "vitest";
import { buildPlan } from "@/domain/agent/planBuilder";
import type { MissionAnswers } from "@/domain/types";

const MISSION = "TRAVEL" as const;

describe("buildPlan", () => {
  it("builds a plan from complete answers", () => {
    const answers: MissionAnswers = {
      destinationType: "beach",
      durationDays: 7,
      travellerType: "adult",
      sensitivities: ["sensitive_skin"],
      urgency: "flexible",
    };
    const plan = buildPlan(MISSION, answers);
    expect(plan.destinationType).toBe("beach");
    expect(plan.durationDays).toBe(7);
    expect(plan.travellerType).toBe("adult");
    expect(plan.sensitivities).toContain("sensitive_skin");
    expect(plan.urgency).toBe("flexible");
  });

  it("applies safe defaults for missing answers", () => {
    const plan = buildPlan(MISSION, {});
    expect(plan.destinationType).toBe("unknown");
    expect(plan.durationDays).toBe(7); // default
    expect(plan.travellerType).toBe("adult");
    expect(plan.sensitivities).toEqual([]);
    expect(plan.urgency).toBe("flexible");
  });

  it("includes required categories for beach trip", () => {
    const plan = buildPlan(MISSION, { destinationType: "beach", durationDays: 7 });
    expect(plan.constraints.requiredCategories).toContain("SUN_CARE");
    expect(plan.constraints.requiredCategories).toContain("FIRST_AID");
    expect(plan.constraints.requiredCategories).toContain("HYDRATION");
  });

  it("overrides to lip/moisturiser for short city trip (≤4 days)", () => {
    const plan = buildPlan(MISSION, { destinationType: "city", durationDays: 3 });
    expect(plan.constraints.requiredCategories).toContain("LIP_CARE");
    expect(plan.constraints.requiredCategories).toContain("MOISTURISER");
    expect(plan.constraints.requiredCategories).not.toContain("SUN_CARE");
  });

  it("does NOT apply city-short override for city trip > 4 days", () => {
    const plan = buildPlan(MISSION, { destinationType: "city", durationDays: 5 });
    expect(plan.constraints.requiredCategories).toContain("SUN_CARE");
  });

  it("clamps duration to max 60", () => {
    const plan = buildPlan(MISSION, { durationDays: 999 });
    expect(plan.durationDays).toBe(60);
  });

  it("clamps duration to min 1", () => {
    const plan = buildPlan(MISSION, { durationDays: 0 });
    expect(plan.durationDays).toBe(1);
  });

  it("generates a human-readable summary", () => {
    const plan = buildPlan(MISSION, {
      destinationType: "beach",
      durationDays: 5,
      travellerType: "family",
    });
    expect(plan.summary.toLowerCase()).toContain("beach");
    expect(plan.summary).toContain("5");
    expect(plan.summary.toLowerCase()).toContain("family");
  });

  it("summary mentions sensitive skin when in sensitivities", () => {
    const plan = buildPlan(MISSION, { sensitivities: ["sensitive_skin"] });
    expect(plan.summary).toContain("Sensitive skin");
  });

  it("sets default priceBand to mid", () => {
    const plan = buildPlan(MISSION, {});
    expect(plan.constraints.priceBand).toBe("mid");
  });

  it("sets min/max item constraints", () => {
    const plan = buildPlan(MISSION, {});
    expect(plan.constraints.minItems).toBe(6);
    expect(plan.constraints.maxItems).toBe(10);
  });
});
