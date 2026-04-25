"use client";

import { cn } from "@/lib/utils";
import type { InferenceResult } from "@/domain/types";

type CorrectableField = "destinationType" | "durationDays" | "travellerType" | "sensitivities";

interface InferenceCardProps {
  inference: InferenceResult;
  onCorrect?: (field: CorrectableField) => void;
}

const DEST_ICONS: Record<string, string> = {
  beach: "🏖️",
  city: "🏙️",
  mixed: "🗺️",
  unknown: "✈️",
};

const TRAVELLER_ICONS: Record<string, string> = {
  adult: "🧑",
  family: "👨‍👩‍👧",
  child: "🧒",
};

const SENSITIVITY_LABELS: Record<string, string> = {
  sensitive_skin: "Sensitive skin",
  fragrance_free_preference: "Fragrance-free",
};

function confidenceLabel(c: number): string {
  if (c >= 0.9) return "High";
  if (c >= 0.7) return "Good";
  if (c >= 0.5) return "Moderate";
  return "Low";
}

function confidenceWidth(c: number): string {
  if (c >= 0.95) return "w-full";
  if (c >= 0.9) return "w-11/12";
  if (c >= 0.8) return "w-10/12";
  if (c >= 0.7) return "w-9/12";
  if (c >= 0.5) return "w-7/12";
  return "w-5/12";
}

export function InferenceCard({ inference, onCorrect }: InferenceCardProps) {
  const hasAnyField =
    inference.destinationType ||
    inference.durationDays ||
    inference.travellerType ||
    (inference.sensitivities?.value && inference.sensitivities.value.length > 0);

  if (!hasAnyField) return null;

  return (
    <div
      role="region"
      aria-label="What I inferred from your message"
      className="mx-1 rounded-2xl border border-boots-navy/20 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>✨</span>
        <p className="text-sm font-semibold text-boots-navy">Here&apos;s what I picked up</p>
      </div>

      {/* Inference chips */}
      <div className="flex flex-wrap gap-2">
        {inference.destinationType && (
          <InferenceChip
            icon={DEST_ICONS[inference.destinationType.value] ?? "✈️"}
            label={capitalize(inference.destinationType.value.replace("_", " "))}
            source={inference.destinationType.source}
            confidence={inference.destinationType.confidence}
            onCorrect={onCorrect ? () => onCorrect("destinationType") : undefined}
          />
        )}
        {inference.durationDays && (
          <InferenceChip
            icon="📅"
            label={`${inference.durationDays.value} day${inference.durationDays.value !== 1 ? "s" : ""}`}
            source={inference.durationDays.source}
            confidence={inference.durationDays.confidence}
            onCorrect={onCorrect ? () => onCorrect("durationDays") : undefined}
          />
        )}
        {inference.travellerType && (
          <InferenceChip
            icon={TRAVELLER_ICONS[inference.travellerType.value] ?? "🧑"}
            label={capitalize(inference.travellerType.value)}
            source={inference.travellerType.source}
            confidence={inference.travellerType.confidence}
            onCorrect={onCorrect ? () => onCorrect("travellerType") : undefined}
          />
        )}
        {inference.sensitivities && inference.sensitivities.value.length > 0 &&
          inference.sensitivities.value.map((s) => (
            <InferenceChip
              key={s}
              icon="🧴"
              label={SENSITIVITY_LABELS[s] ?? s}
              source={inference.sensitivities!.source}
              confidence={inference.sensitivities!.confidence}
              onCorrect={onCorrect ? () => onCorrect("sensitivities") : undefined}
            />
          ))
        }
        {inference.priceBand && (
          <InferenceChip
            icon={inference.priceBand.value === "premium" ? "💎" : inference.priceBand.value === "value" ? "💚" : "⚖️"}
            label={`${capitalize(inference.priceBand.value)} budget`}
            source={inference.priceBand.source}
            confidence={inference.priceBand.confidence}
          />
        )}
      </div>

      {/* Confidence bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Inference confidence</span>
          <span className="font-medium">{confidenceLabel(inference.overallConfidence)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              inference.overallConfidence >= 0.8 ? "bg-green-500" :
              inference.overallConfidence >= 0.6 ? "bg-amber-400" : "bg-red-400",
              confidenceWidth(inference.overallConfidence)
            )}
          />
        </div>
      </div>

      {onCorrect && (
        <p className="mt-2.5 text-[10px] text-muted-foreground leading-tight">
          Tap ✏️ on any chip to correct it — your kit will rebuild instantly.
        </p>
      )}
    </div>
  );
}

function InferenceChip({
  icon,
  label,
  source,
  confidence,
  onCorrect,
}: {
  icon: string;
  label: string;
  source: string;
  confidence: number;
  onCorrect?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        confidence >= 0.7
          ? "border-boots-navy/20 bg-boots-sky/20 text-boots-navy"
          : "border-amber-200 bg-amber-50 text-amber-800"
      )}
      title={source}
    >
      <span aria-hidden>{icon}</span>
      <span className="font-medium">{label}</span>
      {onCorrect && (
        <button
          type="button"
          onClick={onCorrect}
          className="ml-0.5 text-[10px] opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-boots-navy rounded"
          aria-label={`Correct ${label}`}
          title={`Correct: ${label} (${source})`}
        >
          ✏️
        </button>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
