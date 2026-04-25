"use client";

import { cn } from "@/lib/utils";
import { uvLabel } from "@/domain/agent/destinationIntelligence";
import type { DestinationContext } from "@/domain/types";

interface DestinationCardProps {
  context: DestinationContext;
}

function uvColor(uv: number): string {
  if (uv <= 2) return "bg-green-100 text-green-800 border-green-200";
  if (uv <= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (uv <= 7) return "bg-orange-100 text-orange-800 border-orange-200";
  if (uv <= 10) return "bg-red-100 text-red-800 border-red-200";
  return "bg-purple-100 text-purple-800 border-purple-200";
}

export function DestinationCard({ context }: DestinationCardProps) {
  if (!context.matched) return null;

  const healthAlerts: string[] = [];
  if (context.malariaRisk)
    healthAlerts.push("⚠️ Malaria risk — speak to a pharmacist before travelling.");
  if (context.vaccineRecommendations.length > 0)
    healthAlerts.push(`💉 Vaccines advised: ${context.vaccineRecommendations.join(", ")}.`);
  if (!context.tapWaterSafe)
    healthAlerts.push("🚱 Tap water unsafe — bottled water essential.");

  return (
    <div
      role="region"
      aria-label={`Destination intelligence for ${context.displayName}`}
      className="mx-1 rounded-2xl border border-boots-sky/40 bg-gradient-to-br from-boots-sky/20 to-white p-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" role="img" aria-label={context.displayName}>
          {context.flag}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-boots-navy leading-tight">{context.displayName}</p>
          <p className="text-xs text-muted-foreground">{context.region}</p>
        </div>
        {/* UV badge */}
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            uvColor(context.uvIndexPeak)
          )}
          title={`UV index ${context.uvIndexPeak}`}
        >
          UV {context.uvIndexPeak} · {uvLabel(context.uvIndexPeak)}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <Stat icon="🌡️" label="Avg temp" value={`${context.avgTempC}°C`} />
        <Stat icon="🧴" label="SPF min" value={`SPF${context.spfMinimum}`} />
        {context.malariaRisk && (
          <Stat icon="🦟" label="Malaria" value="Risk area" highlight />
        )}
        {!context.tapWaterSafe && (
          <Stat icon="💧" label="Tap water" value="Unsafe" highlight />
        )}
      </div>

      {/* Health alerts */}
      {healthAlerts.length > 0 && (
        <ul className="mt-3 space-y-1">
          {healthAlerts.map((alert, i) => (
            <li
              key={i}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 leading-snug"
            >
              {alert}
            </li>
          ))}
        </ul>
      )}

      {/* Packing notes (first 2) */}
      {context.packingNotes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {context.packingNotes.slice(0, 2).map((note, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-boots-navy/80">
              <span className="mt-0.5 shrink-0 text-boots-navy/40">•</span>
              {note}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground leading-tight">
        Bundle optimised using destination intelligence — SPF, hydration and health items adjusted automatically.
      </p>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full border px-2.5 py-0.5",
        highlight
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-slate-200 bg-white text-slate-700"
      )}
    >
      <span>{icon}</span>
      <span className="font-medium">{value}</span>
      <span className="text-slate-400">·</span>
      <span>{label}</span>
    </span>
  );
}
