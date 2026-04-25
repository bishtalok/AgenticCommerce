"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/shared/top-nav";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { FulfilmentPicker } from "@/components/checkout/fulfilment-picker";
import { StorePicker, type StoreOption } from "@/components/checkout/store-picker";
import { Totals } from "@/components/checkout/totals";
import { ConsentModal } from "@/components/checkout/consent-modal";
import { useMissionStore } from "@/stores/missionStore";
import { recommendFulfilment } from "@/domain/fulfilment/recommender";
import type {
  AvailabilityResult,
  FulfilmentMode,
  BundleItem as BundleItemT,
} from "@/domain/types";

interface AvailabilityResponse {
  stores: Array<{
    storeId: string;
    name: string;
    city: string;
    postcode: string;
    distanceKm?: number;
    supportsClickCollect: boolean;
  }>;
  availability: Record<string, Record<string, { status: string; qty: number }>>;
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    basket,
    plan,
    fulfilmentMode,
    storeId: persistedStoreId,
    setCheckout,
    checkoutSessionId,
    setMandate,
    setOrderNumber,
    mandateId,
  } = useMissionStore();

  const [mode, setMode] = useState<FulfilmentMode>(fulfilmentMode ?? "DELIVERY");
  const [postcode, setPostcode] = useState<string>("");
  const [storeId, setStoreId] = useState<string | null>(persistedStoreId);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(checkoutSessionId);
  const [checkoutTotals, setCheckoutTotals] = useState<{
    subtotal: number;
    shipping: number;
    total: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [mandateExpiresAt, setMandateExpiresAt] = useState<string | null>(null);
  const [localMandateId, setLocalMandateId] = useState<string | null>(mandateId);

  // Guard: no basket → mission page
  useEffect(() => {
    if (!basket || basket.items.length === 0) {
      router.replace("/mission");
    }
  }, [basket, router]);

  // Availability check when CC + basket loaded
  const skus = useMemo(() => basket?.items.map((i) => i.sku) ?? [], [basket]);

  const runAvailability = useCallback(async () => {
    if (skus.length === 0) return;
    setAvailabilityLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/availability/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skus,
          location: postcode ? { postcode } : undefined,
          modes: ["CLICK_COLLECT"],
        }),
      });
      const data = (await res.json()) as AvailabilityResponse | { error: { userMessage: string } };
      if (!res.ok) throw new Error("error" in data ? data.error.userMessage : "Failed");
      setAvailability(data as AvailabilityResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [skus, postcode]);

  useEffect(() => {
    if (mode === "CLICK_COLLECT" && skus.length > 0 && !availability) {
      runAvailability();
    }
  }, [mode, skus.length, availability, runAvailability]);

  const storeOptions: StoreOption[] = useMemo(() => {
    if (!availability) return [];
    return availability.stores.map((s) => {
      const perSku = availability.availability[s.storeId] ?? {};
      const oos = skus.filter((sku) => perSku[sku]?.status === "OUT").length;
      return {
        storeId: s.storeId,
        name: s.name,
        city: s.city,
        postcode: s.postcode,
        distanceKm: s.distanceKm,
        supportsClickCollect: s.supportsClickCollect,
        oosCount: oos,
        totalSkus: skus.length,
      };
    });
  }, [availability, skus]);

  const recommendation = useMemo(() => {
    if (!plan || !availability || !basket) return null;
    const avResults: AvailabilityResult[] = [];
    for (const [sid, skuMap] of Object.entries(availability.availability)) {
      for (const [sku, v] of Object.entries(skuMap)) {
        avResults.push({
          sku,
          storeId: sid,
          status: v.status as AvailabilityResult["status"],
          qty: v.qty,
        });
      }
    }
    const chosenStore = availability.stores.find((s) => s.storeId === storeId);
    const items: BundleItemT[] = basket.items.map((i) => ({
      sku: i.sku,
      name: i.name,
      category: i.category as BundleItemT["category"],
      brand: null,
      priceEur: i.priceAtAdd,
      qty: i.qty,
      reasonCode: i.reasonCode ?? "",
      why: i.why ?? "",
    }));
    return recommendFulfilment({
      urgency: plan.urgency,
      items,
      availability: avResults,
      storeId: storeId ?? undefined,
      storeSupportsClickCollect: chosenStore?.supportsClickCollect ?? true,
    });
  }, [availability, basket, plan, storeId]);

  const selectedStore = availability?.stores.find((s) => s.storeId === storeId) ?? null;

  const canProceed =
    !!basket &&
    basket.items.length > 0 &&
    (mode === "DELIVERY" || (mode === "CLICK_COLLECT" && storeId));

  const handleProceed = useCallback(async () => {
    if (!basket || !canProceed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basketId: basket.basketId,
          fulfilmentMode: mode,
          storeId: mode === "CLICK_COLLECT" ? storeId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.userMessage ?? "Couldn't create checkout session");
      setCheckoutId(data.checkoutSessionId);
      setCheckoutTotals(data.totals);
      setCheckout({
        checkoutSessionId: data.checkoutSessionId,
        fulfilmentMode: mode,
        storeId: mode === "CLICK_COLLECT" ? storeId : null,
      });

      const mandateRes = await fetch("/api/consent/mandate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId: data.checkoutSessionId,
          scope: { currency: "EUR", amount: data.totals.total, ttlMinutes: 30 },
        }),
      });
      const mandateData = await mandateRes.json();
      if (!mandateRes.ok)
        throw new Error(mandateData?.error?.userMessage ?? "Couldn't issue approval");

      setLocalMandateId(mandateData.mandateId);
      setMandate(mandateData.mandateId);
      setMandateExpiresAt(mandateData.expiresAt);
      setModalOpen(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [basket, canProceed, mode, storeId, setCheckout, setMandate]);

  const handleApprove = useCallback(async () => {
    if (!checkoutId || !localMandateId) return;
    setBusy(true);
    setModalError(null);
    try {
      const res = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId: checkoutId,
          mandateId: localMandateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.userMessage ?? "Couldn't place order");
      setOrderNumber(data.orderNumber);
      router.push("/confirmation");
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [checkoutId, localMandateId, router, setOrderNumber]);

  if (!basket) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
          Loading your basket…
        </div>
      </PageFrame>
    );
  }

  const displayTotals = checkoutTotals ?? {
    subtotal: basket.subtotal,
    shipping: mode === "DELIVERY" ? (basket.subtotal >= 30 ? 0 : 3.99) : 0,
    total:
      basket.subtotal +
      (mode === "DELIVERY" ? (basket.subtotal >= 30 ? 0 : 3.99) : 0),
  };

  return (
    <PageFrame>
      <main id="main" className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-6">
          <header>
            <Link
              href="/mission"
              className="text-xs font-semibold text-boots-blue underline-offset-2 hover:underline"
            >
              ← Back to kit
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-boots-navy">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              {basket.items.length} item{basket.items.length === 1 ? "" : "s"} in your basket.
            </p>
          </header>

          <FulfilmentPicker
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === "DELIVERY") setStoreId(null);
            }}
            recommendation={recommendation ? { mode: recommendation.mode, reason: recommendation.reason } : null}
            disabled={busy}
          />

          {mode === "CLICK_COLLECT" ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="postcode" className="text-xs font-semibold text-boots-navy">
                    Your postcode (optional)
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue"
                    placeholder="e.g. D02"
                    maxLength={16}
                  />
                </div>
                <button
                  type="button"
                  onClick={runAvailability}
                  disabled={availabilityLoading || skus.length === 0}
                  className="rounded-md border border-boots-navy px-3 py-2 text-sm font-semibold text-boots-navy hover:bg-boots-sky/40 disabled:opacity-50"
                >
                  {availabilityLoading ? "Checking…" : "Find stores"}
                </button>
              </div>
              <StorePicker
                stores={storeOptions}
                value={storeId}
                onChange={setStoreId}
                loading={availabilityLoading}
              />
            </section>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-boots-navy">Your items</h2>
            <ul className="flex flex-col gap-2 text-xs text-boots-navy">
              {basket.items.map((i) => (
                <li key={i.sku} className="flex items-start justify-between gap-2">
                  <span>
                    {i.name}
                    <span className="text-muted-foreground"> × {i.qty}</span>
                  </span>
                  <span className="tabular-nums">€{(i.priceAtAdd * i.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <Totals {...displayTotals} />
          <button
            type="button"
            onClick={handleProceed}
            disabled={!canProceed || busy}
            className="rounded-md bg-boots-navy px-5 py-3 text-sm font-semibold text-white hover:bg-boots-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Review & approve order"}
          </button>
        </aside>
      </main>

      <ConsentModal
        open={modalOpen}
        onClose={() => {
          if (!busy) setModalOpen(false);
        }}
        onApprove={handleApprove}
        approving={busy}
        error={modalError}
        items={basket.items}
        totals={checkoutTotals ?? displayTotals}
        fulfilmentMode={mode}
        storeName={selectedStore?.name ?? null}
        expiresAt={mandateExpiresAt}
      />
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <DisclaimerBanner />
      {children}
    </div>
  );
}
