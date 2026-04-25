"use client";

import type { Bundle, PriceBand } from "@/domain/types";
import { BundleItem } from "./bundle-item";
import { PriceBandSwitcher } from "./rebuild-button";

export function BundlePanel({
  bundle,
  priceBand,
  loading,
  error,
  onRemove,
  onChangeBand,
  onAddToCart,
  addingToCart,
}: {
  bundle: Bundle | null;
  priceBand: PriceBand | null;
  loading: boolean;
  error: string | null;
  onRemove: (sku: string) => void;
  onChangeBand: (band: PriceBand) => void;
  onAddToCart: () => void;
  addingToCart: boolean;
}) {
  return (
    <aside
      className="flex h-full flex-col gap-3 border-l bg-boots-sky/20 p-4"
      aria-labelledby="bundle-heading"
    >
      <header className="flex flex-col gap-2 border-b pb-3">
        <div className="flex items-center justify-between">
          <h2 id="bundle-heading" className="text-lg font-bold text-boots-navy">
            Your travel kit
          </h2>
          {bundle ? (
            <p className="text-sm font-semibold text-boots-navy tabular-nums">
              €{bundle.estimatedTotal.toFixed(2)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {bundle ? `${bundle.itemCount} items` : "Waiting for your answers…"}
          </p>
          <PriceBandSwitcher
            value={priceBand}
            onChange={onChangeBand}
            disabled={loading || !bundle}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        {!bundle && !loading && !error ? (
          <EmptyState />
        ) : null}

        {loading && !bundle ? <BundleSkeleton /> : null}

        {bundle ? (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {bundle.items.map((item) => (
              <BundleItem key={item.sku} item={item} onRemove={onRemove} />
            ))}
          </ul>
        ) : null}

        {bundle && bundle.warnings.length > 0 ? (
          <ul className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {bundle.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <footer className="border-t pt-3">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!bundle || addingToCart}
          className="w-full rounded-md bg-boots-navy px-4 py-3 text-sm font-semibold text-white hover:bg-boots-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addingToCart ? "Adding…" : "Add kit to basket & continue"}
        </button>
      </footer>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-sm font-semibold text-boots-navy">No kit yet</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Answer a few quick questions on the left and we&apos;ll assemble a governed travel kit with
        a clear reason for every item.
      </p>
    </div>
  );
}

function BundleSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
