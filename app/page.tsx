import Link from "next/link";
import { TopNav } from "@/components/shared/top-nav";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <DisclaimerBanner />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 md:py-16">
        <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-boots-blue">
              Boots Ireland · Travel
            </p>
            <h1 className="text-3xl font-bold text-boots-navy md:text-5xl">
              Pack smart. Travel well.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Tell us about your trip and we&apos;ll assemble your travel health &amp; essentials kit
              in under 90 seconds — with a clear reason for every item.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/mission"
                className="inline-flex items-center justify-center rounded-md bg-boots-navy px-6 py-3 text-base font-semibold text-white transition hover:bg-boots-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue"
              >
                Start travel mission
              </Link>
              <Link
                href="/mission?q=travel+kit+for+Spain+next+week"
                className="inline-flex items-center justify-center rounded-md border border-boots-navy px-6 py-3 text-base font-semibold text-boots-navy transition hover:bg-boots-sky"
              >
                Try the example query
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border bg-boots-sky/40 p-6 md:min-w-[300px]">
            <p className="text-sm font-semibold text-boots-navy">What you get</p>
            <ul className="flex flex-col gap-2 text-sm text-foreground">
              <li>A guided 2–5 question conversation</li>
              <li>A governed kit: SPF, toiletries, hygiene, first aid, hydration</li>
              <li>Click &amp; Collect or Delivery, based on urgency</li>
              <li>Buy-in-chat with an explicit approval step</li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
