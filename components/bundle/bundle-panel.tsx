"use client";

import { useState } from "react";
import type { Bundle, BundleReasoning, PriceBand } from "@/domain/types";
import { BundleItem } from "./bundle-item";
import { PriceBandSwitcher } from "./rebuild-button";
import { ReasoningPanel } from "./reasoning-panel";
import { cn } from "@/lib/utils";

type Tab = "kit" | "reasoning";

export function BundlePanel({
  bundle,
  reasoning,
  priceBand,
  loading,
  error,
  onRemove,
  onChangeBand,
  onAddToCart,
  addingToCart,
}: {
  bundle: Bundle | null;
  reasoning: BundleReasoning | null;
  priceBand: PriceBand | null;
  loading: boolean;
  error: string | null;
  onRemove: (sku: string) => void;
  onChangeBand: (band: PriceBand) => void;
  onAddToCart: () => void;
  addingToCart: boolean;
}) {
  const [tab, setTab] = useState<Tab>("kit");

  // Reset to kit tab when bundle changes (new build)
  const hasBundle = Boolean(bundle);

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

        {/* Tab strip — only visible once bundle is ready */}
        {hasBundle && (
          <div role="tablist" aria-label="Bundle view" className="flex rounded-lg bg-muted p-0.5 mt-1">
            <TabBtn id="kit" active={tab === "kit"} onClick={() => setTab("kit")}>
              🧳 Kit
            </TabBtn>
            <TabBtn id="reasoning" active={tab === "reasoning"} onClick={() => setTab("reasoning")}>
              🔬 Why?
            </TabBtn>
          </div>
        )}
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

        {bundle && tab === "kit" ? (
          <>
            <ul className="flex flex-col gap-2" aria-live="polite">
              {bundle.items.map((item) => (
                <BundleItem key={item.sku} item={item} onRemove={onRemove} />
              ))}
            </ul>
            {bundle.warnings.length > 0 ? (
              <ul className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                {bundle.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}

        {bundle && tab === "reasoning" && reasoning ? (
          <ReasoningPanel reasoning={reasoning} />
        ) : null}

        {bundle && tab === "reasoning" && !reasoning ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Reasoning data unavailable.
          </p>
        ) : null}
      </div>

      <footer className="border-t pt-3">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!bundle || addingToCart || tab === "reasoning"}
          className="w-full rounded-md bg-boots-navy px-4 py-3 text-sm font-semibold text-white hover:bg-boots-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addingToCart ? "Adding…" : tab === "reasoning" ? "Switch to Kit to add" : "Add kit to basket & continue"}
        </button>
      </footer>
    </aside>
  );
}

function TabBtn({
  id,
  active,
  onClick,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md py-1.5 text-xs font-semibold transition-all",
        active
          ? "bg-white text-boots-navy shadow-sm"
          : "text-muted-foreground hover:text-boots-navy"
      )}
    >
      {children}
    </button>
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
