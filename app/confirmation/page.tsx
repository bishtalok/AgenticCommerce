"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/shared/top-nav";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { useMissionStore } from "@/stores/missionStore";

export default function ConfirmationPage() {
  const router = useRouter();
  const { orderNumber, fulfilmentMode, basket, reset } = useMissionStore();

  useEffect(() => {
    if (!orderNumber) {
      router.replace("/mission");
    }
  }, [orderNumber, router]);

  if (!orderNumber) {
    return <Frame />;
  }

  const etaText =
    fulfilmentMode === "CLICK_COLLECT" ? "Ready in ~2 hours" : "Arrives in 1–3 days";

  return (
    <Frame>
      <main id="main" className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-8 text-center shadow-sm">
          <div
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700"
          >
            ✓
          </div>
          <h1 className="text-2xl font-bold text-boots-navy">Order placed</h1>
          <p className="text-sm text-muted-foreground">Your travel kit is on its way.</p>
          <div className="mt-2 flex flex-col items-center gap-1 rounded-md bg-boots-sky/40 px-5 py-3">
            <p className="text-xs uppercase tracking-wide text-boots-blue">Order number</p>
            <p className="text-lg font-bold tabular-nums text-boots-navy">{orderNumber}</p>
          </div>
          <p className="text-sm text-boots-navy">{etaText}</p>
        </div>

        {basket ? (
          <section className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-boots-navy">What you ordered</h2>
            <ul className="flex flex-col gap-2 text-xs text-boots-navy">
              {basket.items.map((i) => (
                <li key={i.sku} className="flex items-start justify-between gap-2">
                  <span>
                    {i.name} <span className="text-muted-foreground">× {i.qty}</span>
                  </span>
                  <span className="tabular-nums">€{(i.priceAtAdd * i.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm font-semibold text-boots-navy">
              <span>Total paid</span>
              <span className="tabular-nums">€{basket.total.toFixed(2)}</span>
            </div>
          </section>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-boots-navy hover:bg-boots-sky/40"
          >
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => {
              reset();
              router.push("/mission");
            }}
            className="rounded-md bg-boots-navy px-5 py-2 text-sm font-semibold text-white hover:bg-boots-blue"
          >
            Start a new mission
          </button>
        </div>
      </main>
    </Frame>
  );
}

function Frame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <DisclaimerBanner />
      {children}
    </div>
  );
}
