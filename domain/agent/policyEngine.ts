import { getMissionConfig } from "@/domain/mission/config";
import type { MissionCode, Product, TravellerType } from "@/domain/types";

/**
 * Safety & governance rules (PRD §4 FR-060, §10 guardrails).
 */

export const DISCLAIMER = "Not medical advice. Speak to a pharmacist.";

export const CLINICAL_ADVICE_REFUSAL =
  "I can help with travel essentials, but I can't give medical advice. Please speak to a pharmacist or visit your GP for health concerns.";

/**
 * True if the free-text query looks like a request for clinical advice.
 * Matched on prohibited language from mission config.
 */
export function isClinicalAdviceQuery(query: string): boolean {
  const q = (query ?? "").toLowerCase();
  const cfg = getMissionConfig("TRAVEL");
  return cfg.guardrails.prohibitedLanguage.some((p) => q.includes(p));
}

/**
 * Filter catalogue down to products allowed for the given traveller type.
 * Currently: child / family travellers exclude tag `restrictedForChildren`.
 */
export function filterByTraveller(
  products: Product[],
  travellerType: TravellerType,
  missionCode: MissionCode = "TRAVEL"
): Product[] {
  const cfg = getMissionConfig(missionCode);
  const filterWhen = cfg.guardrails.restrictedForChildren.filterWhenTraveller;
  const shouldFilter = filterWhen.includes(travellerType);
  if (!shouldFilter) return products;
  return products.filter((p) => !p.attributes.restrictedForChildren);
}

/**
 * Strips prohibited phrases from UI-facing strings.
 * Defence-in-depth; our copy is authored safe, but mission config is editable.
 */
export function sanitiseOutput(text: string): string {
  const cfg = getMissionConfig("TRAVEL");
  let out = text;
  for (const bad of cfg.guardrails.prohibitedLanguage) {
    const re = new RegExp(`\\b${escapeRegex(bad)}\\b`, "gi");
    out = out.replace(re, "[…]");
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
