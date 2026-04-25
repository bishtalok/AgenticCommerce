"use client";

import type { BundleItem as BundleItemT } from "@/domain/types";
import { WhyChip, SubstitutedChip } from "./why-chip";

export function BundleItem({
  item,
  onRemove,
}: {
  item: BundleItemT;
  onRemove: (sku: string) => void;
}) {
  const priceTotal = (item.priceEur * item.qty).toFixed(2);
  return (
    <li
      className="flex flex-col gap-2 rounded-lg border bg-white p-3"
      aria-label={`${item.name}, €${priceTotal}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-boots-navy">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.brand ? `${item.brand} · ` : ""}
            {formatCategory(item.category)} · qty {item.qty}
          </p>
        </div>
        <p className="text-sm font-semibold text-boots-navy tabular-nums">€{priceTotal}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <WhyChip reason={item.why} />
        {item.substituted ? <SubstitutedChip originalSku={item.substituted.originalSku} /> : null}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onRemove(item.sku)}
          className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
          aria-label={`Remove ${item.name}`}
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function formatCategory(c: string): string {
  return c.toLowerCase().replace(/_/g, " ");
}
