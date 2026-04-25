"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { uvLabel } from "@/domain/agent/destinationIntelligence";
import type { BundleReasoning, CategoryReasoning, ScoreBreakdown } from "@/domain/types";

export function ReasoningPanel({ reasoning }: { reasoning: BundleReasoning }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* --- Decision chain --- */}
      <section aria-labelledby="reasoning-chain-heading">
        <h3
          id="reasoning-chain-heading"
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Decision chain
        </h3>
        <ol className="flex flex-col gap-1">
          <ChainStep
            icon="💬"
            label="Intent"
            detail="Travel mission detected"
          />
          {reasoning.destinationMatched ? (
            <ChainStep
              icon={reasoning.destinationFlag}
              label={reasoning.destinationDisplayName}
              detail={`UV ${reasoning.uvIndexPeak} (${uvLabel(reasoning.uvIndexPeak)}) · ${reasoning.avgTempC}°C · SPF${reasoning.spfMinimum} minimum`}
              highlight
            />
          ) : (
            <ChainStep icon="🗺️" label="Destination" detail="Not detected — general profile used" />
          )}
          {reasoning.malariaRisk && (
            <ChainStep icon="⚠️" label="Health alert" detail="Malaria risk area detected" warn />
          )}
          {!reasoning.tapWaterSafe && (
            <ChainStep icon="🚱" label="Health alert" detail="Tap water unsafe — hygiene boosted" warn />
          )}
          <ChainStep
            icon="📋"
            label="Plan constraints"
            detail={`${reasoning.requiredCategories.length} categories required · ${reasoning.effectivePriceBand} price band`}
          />
          <ChainStep
            icon="✅"
            label="Bundle"
            detail={`${reasoning.categories.length} items selected from scored candidates`}
          />
        </ol>
      </section>

      {/* --- Per-item decisions --- */}
      <section aria-labelledby="reasoning-items-heading">
        <h3
          id="reasoning-items-heading"
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Item decisions
        </h3>
        <ul className="flex flex-col gap-1.5">
          {reasoning.categories.map((cat) => (
            <CategoryCard
              key={cat.category}
              cat={cat}
              isOpen={openCategory === cat.category}
              onToggle={() =>
                setOpenCategory(openCategory === cat.category ? null : cat.category)
              }
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------- sub-components ----------

function ChainStep({
  icon,
  label,
  detail,
  highlight,
  warn,
}: {
  icon: string;
  label: string;
  detail: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs",
        highlight && "border-boots-navy/30 bg-boots-sky/20",
        warn && "border-amber-300 bg-amber-50",
        !highlight && !warn && "border-transparent bg-muted/50"
      )}
    >
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div className="min-w-0">
        <span className="font-semibold text-boots-navy">{label}</span>
        <span className="text-muted-foreground"> — {detail}</span>
      </div>
    </li>
  );
}

function CategoryCard({
  cat,
  isOpen,
  onToggle,
}: {
  cat: CategoryReasoning;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const label = cat.category.toLowerCase().replace(/_/g, " ");

  return (
    <li className="rounded-lg border bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-boots-blue"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "shrink-0 text-xs font-bold uppercase rotate-90 transition-transform",
              isOpen && "rotate-0"
            )}
            aria-hidden
          >
            ›
          </span>
          <span className="text-xs font-semibold text-boots-navy capitalize">{label}</span>
          <span className="text-xs text-muted-foreground">
            · {cat.candidatesEvaluated} candidate{cat.candidatesEvaluated !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-boots-navy/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-boots-navy">
          score {cat.winner.score}
        </span>
      </button>

      {isOpen && (
        <div className="border-t bg-slate-50 px-3 py-3 space-y-3">
          {/* Winner */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Winner
            </p>
            <p className="text-xs font-semibold text-boots-navy">{cat.winner.name}</p>
            {cat.winner.brand && (
              <p className="text-[10px] text-muted-foreground">{cat.winner.brand}</p>
            )}
            <ScoreTable breakdown={cat.winner.breakdown} />
          </div>

          {/* Runner-up */}
          {cat.runnerUp && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Runner-up (not selected)
              </p>
              <p className="text-xs text-boots-navy/80">{cat.runnerUp.name}</p>
              {cat.runnerUp.brand && (
                <p className="text-[10px] text-muted-foreground">{cat.runnerUp.brand}</p>
              )}
              <ScoreTable breakdown={cat.runnerUp.breakdown} dimmed />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ScoreTable({
  breakdown,
  dimmed,
}: {
  breakdown: ScoreBreakdown;
  dimmed?: boolean;
}) {
  const rows = scoreRows(breakdown);
  const active = rows.filter((r) => r.value !== 0);

  return (
    <div className={cn("mt-1.5 space-y-0.5", dimmed && "opacity-60")}>
      {active.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-2 text-[10px]">
          <span className="text-muted-foreground leading-snug">{r.label}</span>
          <span
            className={cn(
              "shrink-0 font-mono font-semibold tabular-nums",
              r.value > 0 ? "text-green-700" : "text-red-600"
            )}
          >
            {r.value > 0 ? `+${r.value}` : r.value}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 border-t pt-0.5 text-[10px] font-semibold">
        <span className="text-boots-navy">Total</span>
        <span className="font-mono text-boots-navy tabular-nums">{breakdown.total}</span>
      </div>
    </div>
  );
}

interface ScoreRow { label: string; value: number }

function scoreRows(bd: ScoreBreakdown): ScoreRow[] {
  return [
    { label: "Base", value: bd.base },
    { label: "Price band match", value: bd.priceBandBonus },
    { label: "Sensitive skin", value: bd.sensitiveBonus },
    { label: "Fragrance-free", value: bd.fragranceFreeBonus },
    { label: "Travel size", value: bd.travelSizeBonus },
    { label: "Child-friendly", value: bd.childFriendlyBonus },
    {
      label:
        bd.destSpfBonus <= -15
          ? "⚠️ Below destination SPF minimum"
          : bd.destSpfBonus >= 9
          ? "Meets destination SPF min · extreme UV"
          : bd.destSpfBonus > 0
          ? "Meets destination SPF minimum"
          : "Destination SPF",
      value: bd.destSpfBonus,
    },
    { label: "Hot destination hydration", value: bd.destHydrationBonus },
    { label: "Unsafe tap water boost", value: bd.destTapWaterBonus },
    { label: "Beach SPF scoring", value: bd.beachSpfBonus },
    { label: "Aerosol penalty", value: bd.aerosolPenalty },
  ].filter((r) => r.value !== 0);
}
