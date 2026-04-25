"use client";

import { useEffect, useRef } from "react";
import type { FulfilmentMode } from "@/domain/types";
import type { CartLine } from "@/stores/missionStore";
import { Totals } from "./totals";

export function ConsentModal({
  open,
  onClose,
  onApprove,
  approving,
  error,
  items,
  totals,
  fulfilmentMode,
  storeName,
  expiresAt,
}: {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  approving: boolean;
  error: string | null;
  items: CartLine[];
  totals: { subtotal: number; shipping: number; total: number };
  fulfilmentMode: FulfilmentMode;
  storeName?: string | null;
  expiresAt?: string | null;
}) {
  const approveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      approveRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !approving) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <header>
          <h2 id="consent-title" className="text-lg font-bold text-boots-navy">
            Approve your order
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;re authorising Boots to place this order on your behalf. Approval is scoped to
            this cart and expires{expiryText ? ` at ${expiryText}` : " in 30 minutes"}.
          </p>
        </header>

        <section className="flex flex-col gap-2 rounded-lg bg-boots-sky/30 p-3 text-sm">
          <p className="font-semibold text-boots-navy">
            {fulfilmentMode === "CLICK_COLLECT"
              ? `Click & Collect at ${storeName ?? "your chosen store"}`
              : "Home delivery"}
          </p>
          <ul className="flex flex-col gap-1 text-xs text-boots-navy">
            {items.map((i) => (
              <li key={i.sku} className="flex items-center justify-between">
                <span>
                  {i.name} × {i.qty}
                </span>
                <span className="tabular-nums">€{(i.priceAtAdd * i.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>

        <Totals subtotal={totals.subtotal} shipping={totals.shipping} total={totals.total} />

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Not medical advice. By approving, you confirm the items and total. You can cancel before
          approval at any time.
        </p>

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={approving}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-boots-navy hover:bg-boots-sky/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={approveRef}
            type="button"
            onClick={onApprove}
            disabled={approving}
            className="rounded-md bg-boots-navy px-5 py-2 text-sm font-semibold text-white hover:bg-boots-blue disabled:opacity-50"
          >
            {approving ? "Approving…" : `Approve & place order — €${totals.total.toFixed(2)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
