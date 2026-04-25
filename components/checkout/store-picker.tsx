"use client";

import { cn } from "@/lib/utils";

export interface StoreOption {
  storeId: string;
  name: string;
  city: string;
  postcode: string;
  distanceKm?: number;
  oosCount: number;
  totalSkus: number;
  supportsClickCollect: boolean;
}

export function StorePicker({
  stores,
  value,
  onChange,
  loading,
}: {
  stores: StoreOption[];
  value: string | null;
  onChange: (storeId: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  if (stores.length === 0) {
    return (
      <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
        No nearby stores found.
      </p>
    );
  }
  return (
    <ul role="radiogroup" aria-label="Pick a store" className="flex flex-col gap-2">
      {stores.map((s) => {
        const active = s.storeId === value;
        const availability = s.totalSkus - s.oosCount;
        return (
          <li key={s.storeId}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!s.supportsClickCollect}
              onClick={() => onChange(s.storeId)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition",
                active
                  ? "border-boots-navy bg-boots-navy/5 ring-2 ring-boots-navy"
                  : "border-border bg-white hover:bg-boots-sky/40",
                !s.supportsClickCollect && "cursor-not-allowed opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-boots-navy">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.city} · {s.postcode}
                    {typeof s.distanceKm === "number" ? ` · ${s.distanceKm} km` : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {availability}/{s.totalSkus} items in stock
                </p>
              </div>
              {s.oosCount > 0 ? (
                <p className="mt-1 text-xs text-amber-800">
                  {s.oosCount} item{s.oosCount > 1 ? "s" : ""} out — we&apos;ll substitute where
                  safe.
                </p>
              ) : null}
              {!s.supportsClickCollect ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Click &amp; Collect not available at this store.
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
