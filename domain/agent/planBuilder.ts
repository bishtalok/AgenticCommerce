import { defaultPriceBand, getRequiredCategories } from "@/domain/mission/config";
import type {
  MissionAnswers,
  MissionCode,
  TravelPlan,
  DestinationType,
  TravellerType,
  Urgency,
} from "@/domain/types";

/**
 * Plan builder (PRD §4 FR-020).
 * Takes validated answers + mission config, returns a structured plan the
 * bundle builder can consume. Pure function — fast (<1ms).
 */
export function buildPlan(
  missionCode: MissionCode,
  answers: MissionAnswers
): TravelPlan {
  const destinationType: DestinationType = answers.destinationType ?? "unknown";
  const durationDays = clampInt(answers.durationDays ?? 7, 1, 60);
  const travellerType: TravellerType = answers.travellerType ?? "adult";
  const sensitivities = answers.sensitivities ?? [];
  const urgency: Urgency = answers.urgency ?? "flexible";

  const requiredCategories = getRequiredCategories(
    missionCode,
    destinationType,
    durationDays
  );

  const priceBand = defaultPriceBand(missionCode);

  const summary = buildSummary({
    destinationType,
    durationDays,
    travellerType,
    sensitivities,
  });

  return {
    destinationType,
    durationDays,
    travellerType,
    sensitivities,
    urgency,
    summary,
    constraints: {
      priceBand,
      minItems: 6,
      maxItems: 10,
      requiredCategories,
    },
  };
}

function buildSummary(args: {
  destinationType: DestinationType;
  durationDays: number;
  travellerType: TravellerType;
  sensitivities: string[];
}): string {
  const parts: string[] = [];
  const destLabel = args.destinationType === "unknown" ? "trip" : `${args.destinationType} trip`;
  parts.push(`${capitalise(destLabel)} (${args.durationDays} day${args.durationDays === 1 ? "" : "s"})`);
  if (args.travellerType === "family") parts.push("Family-friendly");
  else if (args.travellerType === "child") parts.push("For a child");
  if (args.sensitivities.includes("sensitive_skin")) parts.push("Sensitive skin");
  if (args.sensitivities.includes("fragrance_free_preference")) parts.push("Fragrance-free preferred");
  return `${parts.join(". ")}.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
