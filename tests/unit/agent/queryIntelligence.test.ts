import { describe, it, expect } from "vitest";
import {
  extractDuration,
  extractTravellerType,
  extractDestinationType,
  extractSensitivities,
  extractPriceBand,
  buildInferenceResult,
} from "@/domain/agent/queryIntelligence";
import type { DestinationContext } from "@/domain/agent/destinationIntelligence";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const THAILAND_CTX: DestinationContext = {
  matched: true,
  key: "thailand",
  displayName: "Thailand",
  flag: "🇹🇭",
  region: "Southeast Asia",
  avgTempC: 32,
  uvIndexPeak: 12,
  spfMinimum: 50,
  malariaRisk: true,
  tapWaterSafe: false,
  healthAdvisories: ["Malaria risk", "Tap water unsafe"],
  vaccineRecommendations: ["Hepatitis A"],
  packingNotes: ["Pack SPF 50+", "Bring water purification"],
};

const SPAIN_CTX: DestinationContext = {
  matched: true,
  key: "spain",
  displayName: "Spain",
  flag: "🇪🇸",
  region: "Southern Europe",
  avgTempC: 28,
  uvIndexPeak: 8,
  spfMinimum: 30,
  malariaRisk: false,
  tapWaterSafe: true,
  healthAdvisories: [],
  vaccineRecommendations: [],
  packingNotes: ["Pack SPF 30+"],
};

// ─── extractDuration ──────────────────────────────────────────────────────────

describe("extractDuration", () => {
  it("extracts explicit day count", () => {
    const r = extractDuration("I need a kit for 10 days");
    expect(r?.value).toBe(10);
    expect(r?.confidence).toBe(0.95);
  });

  it("extracts explicit night count", () => {
    const r = extractDuration("7 nights in Barcelona");
    expect(r?.value).toBe(7);
    expect(r?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("extracts explicit week count", () => {
    const r = extractDuration("3 weeks in Thailand");
    expect(r?.value).toBe(21);
    expect(r?.confidence).toBe(0.95);
  });

  it("extracts 'two weeks'", () => {
    const r = extractDuration("family beach holiday two weeks");
    expect(r?.value).toBe(14);
    expect(r?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("extracts 'fortnight'", () => {
    const r = extractDuration("a fortnight in Greece");
    expect(r?.value).toBe(14);
  });

  it("extracts 'a week'", () => {
    const r = extractDuration("a week in Lisbon");
    expect(r?.value).toBe(7);
  });

  it("extracts 'a weekend' as 2 days", () => {
    const r = extractDuration("quick getaway a weekend");
    expect(r?.value).toBe(2);
  });

  it("extracts 'long weekend' as 3 days", () => {
    const r = extractDuration("long weekend in Edinburgh");
    expect(r?.value).toBe(3);
  });

  it("extracts vague 'short trip' with low confidence", () => {
    const r = extractDuration("short trip somewhere warm");
    expect(r?.value).toBe(4);
    expect(r?.confidence).toBe(0.5);
  });

  it("extracts vague 'long trip' with low confidence", () => {
    const r = extractDuration("long trip to Asia");
    expect(r?.value).toBe(14);
    expect(r?.confidence).toBe(0.5);
  });

  it("returns null when no duration mentioned", () => {
    expect(extractDuration("travel kit please")).toBeNull();
  });

  it("clamps excessive day values to 60", () => {
    const r = extractDuration("100 days backpacking");
    expect(r?.value).toBe(60);
  });
});

// ─── extractTravellerType ─────────────────────────────────────────────────────

describe("extractTravellerType", () => {
  it("detects 'family'", () => {
    const r = extractTravellerType("family beach holiday");
    expect(r?.value).toBe("family");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("detects 'kids' keyword", () => {
    const r = extractTravellerType("two kids in tow");
    expect(r?.value).toBe("family");
  });

  it("detects 'with the kids'", () => {
    const r = extractTravellerType("going with the kids to Mallorca");
    expect(r?.value).toBe("family");
  });

  it("detects 'solo'", () => {
    const r = extractTravellerType("solo trip to Japan");
    expect(r?.value).toBe("adult");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("detects 'just me'", () => {
    const r = extractTravellerType("just me for 5 days");
    expect(r?.value).toBe("adult");
  });

  it("detects 'my wife'", () => {
    const r = extractTravellerType("trip with my wife to Rome");
    expect(r?.value).toBe("adult");
  });

  it("detects 'honeymoon'", () => {
    const r = extractTravellerType("honeymoon in the Maldives");
    expect(r?.value).toBe("adult");
  });

  it("detects child-specific indicators", () => {
    const r = extractTravellerType("kit for my daughter");
    expect(r?.value).toBe("child");
  });

  it("detects 'toddler'", () => {
    const r = extractTravellerType("travelling with a toddler");
    expect(r?.value).toBe("child");
  });

  it("returns null when no traveller type mentioned", () => {
    expect(extractTravellerType("beach kit for Spain")).toBeNull();
  });
});

// ─── extractDestinationType ───────────────────────────────────────────────────

describe("extractDestinationType", () => {
  it("detects 'beach' explicitly", () => {
    const r = extractDestinationType("beach holiday Thailand");
    expect(r?.value).toBe("beach");
    expect(r?.confidence).toBe(0.95);
  });

  it("detects 'city break'", () => {
    const r = extractDestinationType("city break Barcelona");
    expect(r?.value).toBe("city");
    expect(r?.confidence).toBe(0.95);
  });

  it("detects 'city' alone at lower confidence", () => {
    const r = extractDestinationType("exploring a city in Portugal");
    expect(r?.value).toBe("city");
    expect(r?.confidence).toBe(0.80);
  });

  it("detects 'island' as beach", () => {
    const r = extractDestinationType("island holiday");
    expect(r?.value).toBe("beach");
    expect(r?.confidence).toBe(0.80);
  });

  it("detects 'skiing' as mixed", () => {
    const r = extractDestinationType("skiing in the Alps");
    expect(r?.value).toBe("mixed");
  });

  it("infers beach from tropical destCtx", () => {
    const r = extractDestinationType("trip to Thailand", THAILAND_CTX);
    expect(r?.value).toBe("beach");
    expect(r?.confidence).toBe(0.75);
  });

  it("infers mixed from Southern European destCtx", () => {
    const r = extractDestinationType("holiday in Spain", SPAIN_CTX);
    expect(r?.value).toBe("mixed");
    expect(r?.confidence).toBe(0.65);
  });

  it("returns null when nothing can be inferred", () => {
    const r = extractDestinationType("travel kit please");
    expect(r).toBeNull();
  });
});

// ─── extractSensitivities ─────────────────────────────────────────────────────

describe("extractSensitivities", () => {
  it("extracts sensitive skin", () => {
    const r = extractSensitivities("wife has sensitive skin");
    expect(r?.value).toContain("sensitive_skin");
  });

  it("extracts fragrance-free", () => {
    const r = extractSensitivities("fragrance-free products only");
    expect(r?.value).toContain("fragrance_free_preference");
  });

  it("extracts 'eczema'", () => {
    const r = extractSensitivities("I have eczema");
    expect(r?.value).toContain("sensitive_skin");
  });

  it("returns empty array (not null) when no sensitivities found", () => {
    const r = extractSensitivities("beach holiday Thailand");
    expect(r).not.toBeNull();
    expect(r?.value).toEqual([]);
  });

  it("never returns null", () => {
    expect(extractSensitivities("")).not.toBeNull();
    expect(extractSensitivities("solo trip to Paris")).not.toBeNull();
  });
});

// ─── extractPriceBand ─────────────────────────────────────────────────────────

describe("extractPriceBand", () => {
  it("extracts 'budget'", () => {
    const r = extractPriceBand("budget trip to Barcelona");
    expect(r?.value).toBe("value");
    expect(r?.confidence).toBe(0.85);
  });

  it("extracts 'luxury'", () => {
    const r = extractPriceBand("luxury trip to the Maldives");
    expect(r?.value).toBe("premium");
  });

  it("extracts 'premium'", () => {
    const r = extractPriceBand("premium products only");
    expect(r?.value).toBe("premium");
  });

  it("extracts 'affordable'", () => {
    const r = extractPriceBand("affordable holiday options");
    expect(r?.value).toBe("value");
  });

  it("returns null when price band not mentioned", () => {
    expect(extractPriceBand("beach holiday Thailand 2 weeks")).toBeNull();
  });
});

// ─── buildInferenceResult ─────────────────────────────────────────────────────

describe("buildInferenceResult", () => {
  it("extracts all fields from a rich query and sets canSkipAllQuestions", () => {
    const r = buildInferenceResult(
      "family beach holiday Thailand 2 weeks two kids sensitive skin"
    );
    expect(r.destinationType?.value).toBe("beach");
    expect(r.durationDays?.value).toBe(14);
    expect(r.travellerType?.value).toBe("family");
    expect(r.sensitivities?.value).toContain("sensitive_skin");
    expect(r.canSkipAllQuestions).toBe(true);
    expect(r.canSkipSomeQuestions).toBe(false);
  });

  it("sets canSkipSomeQuestions when only some fields are high-confidence", () => {
    // Only beach + 3 days extracted; no traveller type
    const r = buildInferenceResult("quick city break Barcelona 3 days");
    expect(r.canSkipAllQuestions).toBe(false);
    expect(r.canSkipSomeQuestions).toBe(true);
  });

  it("sets neither flag for a vague query", () => {
    const r = buildInferenceResult("travel kit");
    expect(r.canSkipAllQuestions).toBe(false);
    expect(r.canSkipSomeQuestions).toBe(false);
  });

  it("computes overallConfidence as average of critical fields (0 for missing)", () => {
    const r = buildInferenceResult("travel kit");
    // All three critical fields missing → average = 0
    expect(r.overallConfidence).toBe(0);
  });

  it("includes price band when mentioned", () => {
    const r = buildInferenceResult("luxury solo trip to the maldives for 10 days");
    expect(r.priceBand?.value).toBe("premium");
  });

  it("price band is null when not mentioned", () => {
    const r = buildInferenceResult("family beach holiday Thailand 2 weeks");
    expect(r.priceBand).toBeNull();
  });

  it("uses destCtx to infer destination type when not explicit", () => {
    const r = buildInferenceResult(
      "trip to Thailand 2 weeks solo",
      THAILAND_CTX
    );
    // No explicit "beach" in query — inferred from destCtx
    expect(r.destinationType?.value).toBe("beach");
    expect(r.canSkipAllQuestions).toBe(true);
  });

  it("handles empty query without throwing", () => {
    expect(() => buildInferenceResult("")).not.toThrow();
    const r = buildInferenceResult("");
    expect(r.canSkipAllQuestions).toBe(false);
  });
});
