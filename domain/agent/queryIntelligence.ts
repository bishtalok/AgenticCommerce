/**
 * Query Intelligence — deterministic NL extraction for autonomous proposals.
 *
 * Reads free-text travel queries and extracts structured answers for the five
 * MissionAnswers fields (destinationType, durationDays, travellerType,
 * sensitivities, priceBand) without asking questions.
 *
 * All functions are pure, synchronous, and side-effect-free — safe for unit tests.
 */

import type { DestinationContext } from "@/domain/agent/destinationIntelligence";
import type {
  DestinationType,
  InferenceResult,
  InferredField,
  PriceBand,
  Sensitivity,
  TravellerType,
} from "@/domain/types";

// ---------- Duration extraction ----------

const DURATION_EXPLICIT_DAYS = /\b(\d{1,3})\s*(?:day|days)\b/i;
const DURATION_EXPLICIT_NIGHTS = /\b(\d{1,3})\s*(?:night|nights)\b/i;
const DURATION_EXPLICIT_WEEKS = /\b(\d{1,2})\s*(?:week|weeks)\b/i;

const DURATION_WORD_MAP: Array<[RegExp, number, number]> = [
  // [pattern, value, confidence×100]
  [/\bfortnight\b/i, 14, 90],
  [/\btwo\s+weeks?\b/i, 14, 90],
  [/\b2\s+weeks?\b/i, 14, 95],
  [/\bone\s+week\b/i, 7, 90],
  [/\ba\s+week\b/i, 7, 90],
  [/\bthree\s+weeks?\b/i, 21, 90],
  [/\b3\s+weeks?\b/i, 21, 95],
  [/\ba\s+month\b/i, 28, 80],
  [/\bone\s+month\b/i, 28, 85],
  [/\blong\s+weekend\b/i, 3, 85],
  [/\ba\s+weekend\b/i, 2, 85],
  [/\bweekend\b/i, 2, 80],
  [/\bshort\s+(?:trip|break|holiday)\b/i, 4, 50],
  [/\bquick\s+(?:trip|break|holiday)\b/i, 4, 50],
  [/\blong\s+(?:trip|holiday)\b/i, 14, 50],
];

export function extractDuration(query: string): InferredField<number> | null {
  const q = query.toLowerCase();

  // Explicit digits win over word-form matches (higher confidence).
  const daysMatch = DURATION_EXPLICIT_DAYS.exec(q);
  if (daysMatch) {
    const v = Math.min(60, Math.max(1, parseInt(daysMatch[1], 10)));
    return { value: v, confidence: 0.95, source: `from '${daysMatch[0].trim()}'` };
  }
  const nightsMatch = DURATION_EXPLICIT_NIGHTS.exec(q);
  if (nightsMatch) {
    const v = Math.min(60, Math.max(1, parseInt(nightsMatch[1], 10)));
    return { value: v, confidence: 0.92, source: `from '${nightsMatch[0].trim()}'` };
  }
  const weeksMatch = DURATION_EXPLICIT_WEEKS.exec(q);
  if (weeksMatch) {
    const v = Math.min(60, parseInt(weeksMatch[1], 10) * 7);
    return { value: v, confidence: 0.95, source: `from '${weeksMatch[0].trim()}'` };
  }

  for (const [pattern, value, confPct] of DURATION_WORD_MAP) {
    const m = pattern.exec(q);
    if (m) {
      return { value, confidence: confPct / 100, source: `from '${m[0].trim()}'` };
    }
  }
  return null;
}

// ---------- Traveller type extraction ----------

const TRAVELLER_PATTERNS: Array<[RegExp, TravellerType, number, string]> = [
  // [pattern, value, confidence×100, label]
  [/\b(?:family|families|with\s+(?:the\s+)?kids?|our\s+family|bringing\s+(?:the\s+)?kids?)\b/i, "family", 95, "family trip"],
  [/\bchildren\b/i, "family", 92, "travelling with children"],
  [/\b(?:two|2|three|3|four|4)\s+kids?\b/i, "family", 95, "kids mentioned"],
  [/\b(?:son|daughter|toddler|baby|infant)\b/i, "child", 85, "child traveller"],
  [/\bfor\s+(?:my\s+)?(?:son|daughter|child)\b/i, "child", 88, "buying for child"],
  [/\b(?:honeymoon|newly\s+wed)\b/i, "adult", 90, "honeymoon couple"],
  [/\b(?:couple|my\s+(?:wife|husband|partner|boyfriend|girlfriend|fiancee?|fianc[eé]e?))\b/i, "adult", 85, "travelling as couple"],
  [/\bwith\s+(?:my\s+)?(?:wife|husband|partner|boyfriend|girlfriend)\b/i, "adult", 88, "travelling with partner"],
  [/\b(?:solo|alone|by\s+myself|just\s+me|travelling\s+alone)\b/i, "adult", 90, "solo traveller"],
];

export function extractTravellerType(query: string): InferredField<TravellerType> | null {
  for (const [pattern, value, confPct, label] of TRAVELLER_PATTERNS) {
    if (pattern.test(query)) {
      return { value, confidence: confPct / 100, source: label };
    }
  }
  return null;
}

// ---------- Destination type extraction ----------

/** Regions that strongly imply beach/tropical character. */
const BEACH_REGIONS = ["Southeast Asia", "Indian Ocean", "Atlantic Islands", "North Africa", "Middle East"];

/** Southern European destinations typically support both beach and city. */
const MIXED_REGIONS = ["Southern Europe", "Eastern Mediterranean", "Adriatic", "Mediterranean"];

export function extractDestinationType(
  query: string,
  destCtx?: DestinationContext
): InferredField<DestinationType> | null {
  const q = query.toLowerCase();

  // Explicit keywords — highest confidence.
  if (/\bcity\s+break\b|\bcity\s+trip\b|\bcity\s+holiday\b/i.test(q)) {
    return { value: "city", confidence: 0.95, source: "city break/trip mentioned" };
  }
  if (/\bbeach\b/i.test(q)) {
    return { value: "beach", confidence: 0.95, source: "beach mentioned" };
  }
  if (/\b(?:mountains?|skiing|ski\s+resort|hiking|ski\s+trip)\b/i.test(q)) {
    return { value: "mixed", confidence: 0.80, source: "mountain/ski mentioned" };
  }
  if (/\bisland\b/i.test(q)) {
    return { value: "beach", confidence: 0.80, source: "island mentioned" };
  }
  if (/\bcity\b/i.test(q)) {
    return { value: "city", confidence: 0.80, source: "city mentioned" };
  }

  // Infer from destination intelligence profile.
  if (destCtx?.matched) {
    const hot = destCtx.avgTempC >= 28 && destCtx.uvIndexPeak >= 8;
    if (hot && BEACH_REGIONS.some((r) => destCtx.region.includes(r))) {
      return { value: "beach", confidence: 0.75, source: `${destCtx.displayName} climate profile` };
    }
    if (MIXED_REGIONS.some((r) => destCtx.region.includes(r))) {
      return { value: "mixed", confidence: 0.65, source: `${destCtx.displayName} region` };
    }
  }

  return null;
}

// ---------- Sensitivities extraction ----------

export function extractSensitivities(query: string): InferredField<Sensitivity[]> | null {
  const found: Sensitivity[] = [];

  if (/\b(?:sensitive\s+skin|skin\s+sensitivity|eczema|rosacea|skin\s+allergy)\b/i.test(query)) {
    found.push("sensitive_skin");
  }
  if (/\b(?:fragrance[\s-]?free|unscented|no\s+fragrance|without\s+fragrance|scent[\s-]?free)\b/i.test(query)) {
    found.push("fragrance_free_preference");
  }

  // Always return a result (even empty array) so the sensitivities question is skipped.
  return {
    value: found,
    confidence: found.length > 0 ? 0.9 : 0.95, // high confidence in "no sensitivities" too
    source: found.length > 0 ? `from query keywords` : "no sensitivities mentioned",
  };
}

// ---------- Price band extraction ----------

export function extractPriceBand(query: string): InferredField<PriceBand> | null {
  if (/\b(?:budget|cheap|affordable|value\s+for\s+money|on\s+a\s+budget)\b/i.test(query)) {
    return { value: "value", confidence: 0.85, source: "budget preference mentioned" };
  }
  if (/\b(?:luxury|premium|high[\s-]end|splurge|treat|best\s+quality|top[\s-]of[\s-]the[\s-]range)\b/i.test(query)) {
    return { value: "premium", confidence: 0.85, source: "premium preference mentioned" };
  }
  return null; // mid is the plan builder's default — no need to set explicitly
}

// ---------- Inference assembly ----------

export function buildInferenceResult(
  query: string,
  destCtx?: DestinationContext
): InferenceResult {
  const destinationType = extractDestinationType(query, destCtx);
  const durationDays = extractDuration(query);
  const travellerType = extractTravellerType(query);
  const sensitivities = extractSensitivities(query);
  const priceBand = extractPriceBand(query);

  // Overall confidence = average of the three critical fields.
  const criticalFields = [destinationType, durationDays, travellerType];
  const criticalConfs = criticalFields.map((f) => (f ? f.confidence : 0));
  const overallConfidence = criticalConfs.reduce((s, c) => s + c, 0) / 3;

  const THRESHOLD = 0.7;

  const canSkipAllQuestions =
    (destinationType?.confidence ?? 0) >= THRESHOLD &&
    (durationDays?.confidence ?? 0) >= THRESHOLD &&
    (travellerType?.confidence ?? 0) >= THRESHOLD;

  const canSkipSomeQuestions =
    !canSkipAllQuestions &&
    criticalFields.some((f) => (f?.confidence ?? 0) >= THRESHOLD);

  return {
    destinationType,
    durationDays,
    travellerType,
    sensitivities,
    priceBand,
    overallConfidence,
    canSkipAllQuestions,
    canSkipSomeQuestions,
  };
}

// Re-export for convenience
export type { InferenceResult, InferredField };
