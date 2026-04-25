"use client";

import { useRouter } from "next/navigation";
import { TopNav } from "@/components/shared/top-nav";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { useMissionStore } from "@/stores/missionStore";

export default function HomePage() {
  const router = useRouter();
  const reset = useMissionStore((s) => s.reset);

  function go(path: string) {
    reset();
    router.push(path);
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <DisclaimerBanner />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 pb-24 pt-20"
        style={{
          background: "linear-gradient(140deg, #05054B 0%, #080860 45%, #063070 100%)",
        }}
      >
        {/* Orbs */}
        {[
          { size: 420, x: "72%", y: "-30%", opacity: 0.18 },
          { size: 240, x: "88%", y: "60%",  opacity: 0.12 },
          { size: 160, x: "55%", y: "80%",  opacity: 0.08 },
        ].map((orb, i) => (
          <div
            key={i}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-[40px]"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              background: "#0055A4",
              opacity: orb.opacity,
            }}
          />
        ))}

        <div className="relative mx-auto max-w-5xl">
          <div className="anim-fade-up max-w-xl">
            {/* Badge */}
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="rounded-2xl bg-boots-blue px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white">
                New
              </span>
              <span className="text-xs font-medium text-white/80">
                Agentic shopping — Boots Ireland
              </span>
            </div>

            <h1 className="mb-5 text-5xl font-extrabold leading-[1.08] tracking-[-0.035em] text-white md:text-6xl">
              Pack smart.<br />Travel well.
            </h1>

            <p className="mb-10 max-w-md text-base font-normal leading-relaxed text-white/65 md:text-lg">
              Tell us about your trip. We'll assemble a governed travel health kit in under 90 seconds — with a clear reason for every item.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => go("/mission")}
                className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-boots-navy shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition hover:bg-boots-sky"
              >
                Start travel mission →
              </button>
              <button
                type="button"
                onClick={() => go("/mission?q=travel+kit+for+Spain+next+week")}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Try the example query
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature strip ──────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-2">
          {[
            ["⚡", "Under 90 seconds"],
            ["🛡️", "Governed recommendations"],
            ["💬", "Natural language intent"],
            ["🏪", "Click & Collect or Delivery"],
            ["✅", "Explicit checkout approval"],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-sm">{icon}</span>
              <span className="text-xs font-semibold text-boots-navy">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-14">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <h2 className="mb-10 text-2xl font-extrabold tracking-tight text-boots-navy md:text-3xl">
          Three steps to your travel kit
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              num: "01",
              title: "Describe your trip",
              desc: "Type your trip naturally — destination, duration, who's going. No forms, no dropdowns.",
              color: "#0055A4",
            },
            {
              num: "02",
              title: "Answer 2–4 questions",
              desc: "We ask only what we need. Destination type, travellers, sensitivities. Done in under a minute.",
              color: "#059669",
            },
            {
              num: "03",
              title: "Review & approve",
              desc: "Every item shown with an explicit reason. Remove anything you don't need, then approve to basket.",
              color: "#7C3AED",
            },
          ].map((card) => (
            <div
              key={card.num}
              className="group rounded-2xl border bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${card.color}18` }}
              >
                <span className="text-sm font-extrabold" style={{ color: card.color }}>
                  {card.num}
                </span>
              </div>
              <h3 className="mb-2 text-base font-bold tracking-tight text-boots-navy">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
