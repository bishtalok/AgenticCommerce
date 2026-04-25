import travelMission from "@/data/missions/travel.json";
import type { MissionCode, ProductCategory, PriceBand } from "@/domain/types";

export type MissionConfig = typeof travelMission;

export function getMissionConfig(code: MissionCode): MissionConfig {
  if (code !== "TRAVEL") {
    throw new Error(`Unknown mission code: ${code}`);
  }
  return travelMission;
}

export function getRequiredCategories(
  code: MissionCode,
  destinationType: string,
  durationDays: number
): ProductCategory[] {
  const cfg = getMissionConfig(code);
  for (const ov of cfg.requiredCategories.overrides ?? []) {
    const match = matchOverride(ov.condition, destinationType, durationDays);
    if (match) return ov.categories as ProductCategory[];
  }
  return cfg.requiredCategories.default as ProductCategory[];
}

function matchOverride(
  condition: Record<string, unknown>,
  destinationType: string,
  durationDays: number
): boolean {
  const dTypes = condition.destinationType as string[] | undefined;
  if (dTypes && !dTypes.includes(destinationType)) return false;
  const dur = condition.durationDays as { lte?: number; gte?: number } | undefined;
  if (dur?.lte !== undefined && durationDays > dur.lte) return false;
  if (dur?.gte !== undefined && durationDays < dur.gte) return false;
  return true;
}

export function defaultPriceBand(code: MissionCode): PriceBand {
  const cfg = getMissionConfig(code);
  return cfg.bundleConstraints.defaultPriceBand as PriceBand;
}
