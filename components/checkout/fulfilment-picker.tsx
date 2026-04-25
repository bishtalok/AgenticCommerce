"use client";

import type { FulfilmentMode } from "@/domain/types";
import { cn } from "@/lib/utils";

export function FulfilmentPicker({
  value,
  onChange,
  recommendation,
  disabled,
}: {
  value: FulfilmentMode;
  onChange: (mode: FulfilmentMode) => void;
  recommendation?: { mode: FulfilmentMode; reason: string } | null;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-boots-navy">How would you like it?</legend>
      {recommendation ? (
        <p className="rounded-md bg-boots-sky/60 px-3 py-2 text-xs text-boots-navy">
          <strong>Recommended:</strong> {labelFor(recommendation.mode)} — {recommendation.reason}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Option
          mode="CLICK_COLLECT"
          active={value === "CLICK_COLLECT"}
          disabled={disabled}
          onChange={onChange}
          title="Click & Collect"
          sub="Ready in ~2 hours · Free"
        />
        <Option
          mode="DELIVERY"
          active={value === "DELIVERY"}
          disabled={disabled}
          onChange={onChange}
          title="Home delivery"
          sub="1–3 days · Free over €30"
        />
      </div>
    </fieldset>
  );
}

function Option({
  mode,
  active,
  disabled,
  onChange,
  title,
  sub,
}: {
  mode: FulfilmentMode;
  active: boolean;
  disabled?: boolean;
  onChange: (mode: FulfilmentMode) => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(mode)}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition",
        active
          ? "border-boots-navy bg-boots-navy/5 ring-2 ring-boots-navy"
          : "border-border bg-white hover:bg-boots-sky/40",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <p className="text-sm font-semibold text-boots-navy">{title}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}

function labelFor(mode: FulfilmentMode): string {
  return mode === "CLICK_COLLECT" ? "Click & Collect" : "Home delivery";
}
