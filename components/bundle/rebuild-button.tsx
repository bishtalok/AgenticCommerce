"use client";

import type { PriceBand } from "@/domain/types";
import { cn } from "@/lib/utils";

const BANDS: { value: PriceBand; label: string }[] = [
  { value: "value", label: "Value" },
  { value: "mid", label: "Mid" },
  { value: "premium", label: "Premium" },
];

export function PriceBandSwitcher({
  value,
  onChange,
  disabled,
}: {
  value: PriceBand | null;
  onChange: (band: PriceBand) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Price band"
      className="inline-flex rounded-md border bg-white p-0.5"
    >
      {BANDS.map((b) => {
        const active = b.value === value;
        return (
          <button
            key={b.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(b.value)}
            className={cn(
              "rounded px-3 py-1 text-xs font-semibold transition",
              active ? "bg-boots-navy text-white" : "text-boots-navy hover:bg-boots-sky",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {b.label}
          </button>
        );
      })}
    </div>
  );
}
