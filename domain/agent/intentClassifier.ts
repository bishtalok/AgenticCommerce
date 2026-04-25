import { getMissionConfig } from "@/domain/mission/config";
import type { IntentResult, MissionCode } from "@/domain/types";

const MIN_CONFIDENCE = 0.6;
const MAX_QUERY_LENGTH = 500;

/**
 * Deterministic keyword + weighted scoring intent classifier.
 *
 * Why: PRD §4 FR-010 specifies a rules-based classifier (no LLM). An adapter
 * can swap in GenAI later without changing callers.
 */
export function classifyIntent(rawQuery: string): IntentResult {
  const query = (rawQuery ?? "").toLowerCase().trim();

  if (!query || query.length > MAX_QUERY_LENGTH) {
    return { missionCode: null, confidence: 0, alternatives: [] };
  }

  if (containsBlocked(query)) {
    return { missionCode: null, confidence: 0, alternatives: [] };
  }

  const cfg = getMissionConfig("TRAVEL");
  const keywords = cfg.intentKeywords.TRAVEL;

  let score = 0;
  let matches = 0;
  for (const { term, weight } of keywords) {
    if (query.includes(term)) {
      score += weight;
      matches += 1;
    }
  }

  // Squash to [0,1] — each match caps out contribution (no stuffing wins).
  const confidence = clamp(score, 0, 1);

  if (matches === 0) {
    return { missionCode: null, confidence: 0, alternatives: [] };
  }

  return {
    missionCode: confidence >= MIN_CONFIDENCE ? "TRAVEL" : ("TRAVEL" as MissionCode),
    confidence,
    alternatives: [],
  };
}

export function isConfidentEnough(result: IntentResult): boolean {
  return result.confidence >= MIN_CONFIDENCE;
}

function containsBlocked(query: string): boolean {
  const cfg = getMissionConfig("TRAVEL");
  return cfg.guardrails.blockList.some((b) => query.includes(b.toLowerCase()));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export const MIN_INTENT_CONFIDENCE = MIN_CONFIDENCE;
