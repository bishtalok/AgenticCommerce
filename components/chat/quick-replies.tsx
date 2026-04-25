"use client";

import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

export function QuickReplies({
  options,
  onPick,
  disabled,
  selected,
}: {
  options: Option[];
  onPick: (value: string) => void;
  disabled?: boolean;
  selected?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Answer options">
      {options.map((opt) => {
        const isSelected = selected?.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPick(opt.value)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue",
              isSelected
                ? "border-boots-navy bg-boots-navy text-white"
                : "border-boots-navy/30 bg-white text-boots-navy hover:bg-boots-sky",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
