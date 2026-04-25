"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/shared/top-nav";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { ChatPanel } from "@/components/chat/chat-panel";
import { BundlePanel } from "@/components/bundle/bundle-panel";
import { useMissionStore, makeMessage } from "@/stores/missionStore";
import { answerKeyForQuestion } from "@/domain/agent/questionFlow";
import type {
  MissionAnswers,
  NextQuestion,
  QuestionDef,
  TravelPlan,
  Bundle,
  BundleReasoning,
  PriceBand,
  MissionCode,
  IntentResult,
  DestinationContext,
  InferenceResult,
} from "@/domain/types";
import type { Persona } from "@/components/chat/demo-persona-bar";

type Stage = "intent" | "questions" | "building" | "ready";

export default function MissionPage() {
  return (
    <Suspense fallback={<PageFrame />}>
      <MissionPageInner />
    </Suspense>
  );
}

function PageFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <DisclaimerBanner />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}

function MissionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = searchParams.get("q") ?? "";

  const state = useMissionStore();
  const {
    missionCode,
    answers,
    plan,
    planId,
    bundle,
    reasoning,
    priceBand,
    removedSkus,
    basket,
    currentQuestion,
    messages,
    setMission,
    setAnswer,
    setCurrentQuestion,
    setPlan,
    setBundle,
    setReasoning,
    setInference,
    setPriceBand,
    removeSku,
    setBasket,
    pushMessage,
    reset,
  } = state;

  const [stage, setStage] = useState<Stage>("intent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);

  // Destination intelligence — stored in a ref so it's accessible from stale useCallback closures.
  const destCtxRef = useRef<DestinationContext | null>(null);

  // Hydration: infer stage from persisted state
  useEffect(() => {
    if (bundle) setStage("ready");
    else if (planId) setStage("building");
    else if (missionCode && currentQuestion?.question) setStage("questions");
    else setStage("intent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On first mount greet
  useEffect(() => {
    if (messages.length === 0) {
      pushMessage(
        makeMessage({
          actor: "AGENT",
          kind: "text",
          text:
            "Hi! I'm your Boots travel assistant. Tell me about your trip and I'll put together a governed travel kit — SPF, toiletries, first aid, hydration and more.",
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIntent = useCallback(
    async (rawQuery: string) => {
      setBusy(true);
      setError(null);
      pushMessage(makeMessage({ actor: "USER", kind: "text", text: rawQuery }));
      try {
        const res = await fetch("/api/intent/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: rawQuery }),
        });
        const data = (await res.json()) as
          | (IntentResult & {
              refusal?: string;
              destinationContext?: DestinationContext;
              inferenceResult?: InferenceResult;
            })
          | { error: { userMessage: string } };

        if (!res.ok) {
          const msg = "error" in data ? data.error.userMessage : "Something went wrong.";
          throw new Error(msg);
        }
        if ("refusal" in data && data.refusal) {
          pushMessage(makeMessage({ actor: "AGENT", kind: "refusal", text: data.refusal }));
          setBusy(false);
          return;
        }
        const intent = data as IntentResult & {
          destinationContext?: DestinationContext;
          inferenceResult?: InferenceResult;
        };
        if (!intent.missionCode || intent.confidence < 0.6) {
          pushMessage(
            makeMessage({
              actor: "AGENT",
              kind: "text",
              text:
                'I couldn\'t confidently match that to a mission. Try mentioning a trip — for example, "travel kit for Spain next week".',
            })
          );
          setBusy(false);
          return;
        }
        setMission(intent.missionCode);

        // Stash destination context for use throughout this session.
        if (intent.destinationContext) {
          destCtxRef.current = intent.destinationContext;
        }

        // Stash inference result.
        const inferenceResult = intent.inferenceResult ?? null;
        setInference(inferenceResult);

        // Show destination intelligence card when we've matched a destination.
        if (intent.destinationContext?.matched) {
          pushMessage(
            makeMessage({
              actor: "AGENT",
              kind: "destination",
              context: intent.destinationContext,
            })
          );
        }

        // ── AUTONOMOUS PATH ──────────────────────────────────────────────────
        if (inferenceResult?.canSkipAllQuestions) {
          pushMessage(
            makeMessage({
              actor: "AGENT",
              kind: "inference",
              inference: inferenceResult,
            })
          );
          pushMessage(
            makeMessage({
              actor: "AGENT",
              kind: "text",
              text: "Got everything I need — building your kit now…",
            })
          );
          setStage("building");
          const inferredAnswers: MissionAnswers = {
            destinationType: inferenceResult.destinationType?.value,
            durationDays: inferenceResult.durationDays?.value,
            travellerType: inferenceResult.travellerType?.value,
            sensitivities: inferenceResult.sensitivities?.value ?? [],
            urgency: "flexible",
          };
          await buildPlanAndBundle(intent.missionCode, inferredAnswers);

        // ── PARTIAL SKIP PATH ─────────────────────────────────────────────────
        } else if (inferenceResult?.canSkipSomeQuestions) {
          pushMessage(
            makeMessage({
              actor: "AGENT",
              kind: "inference",
              inference: inferenceResult,
            })
          );
          const knownAnswers: MissionAnswers = buildKnownAnswers(inferenceResult);
          await askNext(intent.missionCode, knownAnswers);

        // ── FULL QUESTION FLOW (existing path) ────────────────────────────────
        } else {
          pushMessage(
            makeMessage({
              actor: "AGENT",
              kind: "text",
              text: intent.destinationContext?.matched
                ? `Got it — ${intent.destinationContext.displayName} travel kit. Just a couple of questions.`
                : "Got it — travel mission. Let me ask a few quick questions.",
            })
          );
          await askNext(intent.missionCode, {});
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** Build a MissionAnswers object pre-populated from high-confidence inference results. */
  function buildKnownAnswers(ir: InferenceResult): MissionAnswers {
    const known: MissionAnswers = {};
    if (ir.destinationType && ir.destinationType.confidence >= 0.7)
      known.destinationType = ir.destinationType.value;
    if (ir.durationDays && ir.durationDays.confidence >= 0.7)
      known.durationDays = ir.durationDays.value;
    if (ir.travellerType && ir.travellerType.confidence >= 0.7)
      known.travellerType = ir.travellerType.value;
    // Sensitivities always pass through (even empty array skips the question)
    if (ir.sensitivities) known.sensitivities = ir.sensitivities.value;
    return known;
  }

  const askNext = useCallback(
    async (code: MissionCode, nextAnswers: MissionAnswers) => {
      const res = await fetch("/api/mission/questions/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionCode: code, answers: nextAnswers }),
      });
      const data = (await res.json()) as NextQuestion | { error: { userMessage: string } };
      if (!res.ok) throw new Error("error" in data ? data.error.userMessage : "Failed");
      const nq = data as NextQuestion;
      setCurrentQuestion(nq);

      if (nq.done || !nq.question) {
        setStage("building");
        await buildPlanAndBundle(code, nextAnswers);
        return;
      }
      setStage("questions");
      pushMessage(makeMessage({ actor: "AGENT", kind: "question", question: nq.question }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const buildPlanAndBundle = useCallback(
    async (code: MissionCode, finalAnswers: MissionAnswers) => {
      setBundleLoading(true);
      setBundleError(null);
      try {
        const planRes = await fetch("/api/mission/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missionCode: code, answers: finalAnswers }),
        });
        const planData = (await planRes.json()) as
          | { planId: string; plan: TravelPlan }
          | { error: { userMessage: string } };
        if (!planRes.ok)
          throw new Error("error" in planData ? planData.error.userMessage : "Plan failed");
        const { planId: pid, plan: p } = planData as { planId: string; plan: TravelPlan };
        setPlan(pid, p);
        pushMessage(makeMessage({ actor: "AGENT", kind: "text", text: p.summary }));

        const bundleRes = await fetch("/api/bundle/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: pid,
            priceBand: p.constraints.priceBand,
            removedSkus: [],
            ...(destCtxRef.current ? { destinationContext: destCtxRef.current } : {}),
          }),
        });
        const bundleData = (await bundleRes.json()) as
          | { bundleItems: Bundle["items"]; bundleMeta: Omit<Bundle, "items" | "reasoning">; bundleReasoning: BundleReasoning | null }
          | { error: { userMessage: string } };
        if (!bundleRes.ok)
          throw new Error(
            "error" in bundleData ? bundleData.error.userMessage : "Bundle failed"
          );
        const b = bundleData as { bundleItems: Bundle["items"]; bundleMeta: Omit<Bundle, "items" | "reasoning">; bundleReasoning: BundleReasoning | null };
        setBundle({ items: b.bundleItems, ...b.bundleMeta });
        setReasoning(b.bundleReasoning);
        setStage("ready");
        pushMessage(
          makeMessage({
            actor: "AGENT",
            kind: "text",
            text: `I've assembled ${b.bundleMeta.itemCount} items. Check the reasons on the right — remove anything you don't need.`,
          })
        );
      } catch (e) {
        setBundleError((e as Error).message);
      } finally {
        setBundleLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const regenerateBundle = useCallback(
    async (opts: { priceBand?: PriceBand; removedSkus?: string[] }) => {
      if (!planId) return;
      setBundleLoading(true);
      setBundleError(null);
      try {
        const res = await fetch("/api/bundle/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            priceBand: opts.priceBand ?? priceBand ?? "mid",
            removedSkus: opts.removedSkus ?? removedSkus,
            ...(destCtxRef.current ? { destinationContext: destCtxRef.current } : {}),
          }),
        });
        const data = (await res.json()) as
          | { bundleItems: Bundle["items"]; bundleMeta: Omit<Bundle, "items" | "reasoning">; bundleReasoning: BundleReasoning | null }
          | { error: { userMessage: string } };
        if (!res.ok) throw new Error("error" in data ? data.error.userMessage : "Rebuild failed");
        const b = data as { bundleItems: Bundle["items"]; bundleMeta: Omit<Bundle, "items" | "reasoning">; bundleReasoning: BundleReasoning | null };
        setBundle({ items: b.bundleItems, ...b.bundleMeta });
        setReasoning(b.bundleReasoning);
      } catch (e) {
        setBundleError((e as Error).message);
      } finally {
        setBundleLoading(false);
      }
    },
    [planId, priceBand, removedSkus, setBundle]
  );

  const handleAnswer = useCallback(
    async (value: unknown) => {
      if (!currentQuestion?.question || !missionCode) return;
      const q = currentQuestion.question;
      const key = answerKeyForQuestion(q.id);
      if (!key) return;
      setBusy(true);
      setError(null);
      try {
        setAnswer(key, value);
        pushMessage(
          makeMessage({
            actor: "USER",
            kind: "text",
            text: formatAnswerText(q, value),
          })
        );
        const nextAnswers = { ...answers, [key]: value } as MissionAnswers;
        await askNext(missionCode, nextAnswers);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [answers, askNext, currentQuestion, missionCode, pushMessage, setAnswer]
  );

  const handleSkip = useCallback(async () => {
    if (!currentQuestion?.question || !missionCode) return;
    const q = currentQuestion.question;
    const key = answerKeyForQuestion(q.id);
    if (!key) return;
    const defaultValue =
      q.default !== undefined ? q.default : q.type === "multi" ? [] : undefined;
    setBusy(true);
    try {
      if (defaultValue !== undefined) setAnswer(key, defaultValue);
      pushMessage(makeMessage({ actor: "USER", kind: "text", text: "(skipped)" }));
      const nextAnswers = {
        ...answers,
        [key]: defaultValue,
      } as MissionAnswers;
      await askNext(missionCode, nextAnswers);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [answers, askNext, currentQuestion, missionCode, pushMessage, setAnswer]);

  const handleRemove = useCallback(
    async (sku: string) => {
      removeSku(sku);
      const next = [...new Set([...removedSkus, sku])];
      await regenerateBundle({ removedSkus: next });
    },
    [regenerateBundle, removeSku, removedSkus]
  );

  const handleChangeBand = useCallback(
    async (band: PriceBand) => {
      setPriceBand(band);
      await regenerateBundle({ priceBand: band });
    },
    [regenerateBundle, setPriceBand]
  );

  const handleAddToCart = useCallback(async () => {
    if (!bundle) return;
    setAddingToCart(true);
    setError(null);
    try {
      let basketId = basket?.basketId ?? null;
      if (!basketId) {
        const res = await fetch("/api/cart/create", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.userMessage ?? "Couldn't create basket");
        basketId = data.basketId as string;
        setBasket(data);
      }
      const addRes = await fetch("/api/cart/add-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basketId,
          items: bundle.items.map((i) => ({
            sku: i.sku,
            qty: i.qty,
            reasonCode: i.reasonCode,
            why: i.why,
          })),
        }),
      });
      const addData = await addRes.json();
      if (!addRes.ok)
        throw new Error(addData?.error?.userMessage ?? "Couldn't add items to basket");
      setBasket(addData);
      router.push("/checkout");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAddingToCart(false);
    }
  }, [basket?.basketId, bundle, router, setBasket]);

  const handleRestart = useCallback(() => {
    reset();
    setStage("intent");
    setError(null);
    setBundleError(null);
    pushMessage(
      makeMessage({
        actor: "AGENT",
        kind: "text",
        text: "Fresh start — tell me about your next trip.",
      })
    );
  }, [pushMessage, reset]);

  const handleSelectPersona = useCallback(
    (query: string, persona: Persona) => {
      // Show the persona card in the chat stream (labelled as Phase 2 simulation).
      pushMessage(
        makeMessage({
          actor: "AGENT",
          kind: "persona",
          label: persona.label,
          description: persona.description,
          profileNote: persona.profileNote,
          avatar: persona.avatar,
        })
      );
      // Then submit the simulated query through the normal intent path.
      handleIntent(query);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleIntent, pushMessage]
  );

  // Pre-fill from ?q=
  useEffect(() => {
    if (prefill && stage === "intent" && !missionCode && !busy && messages.length <= 1) {
      handleIntent(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const currentQ: QuestionDef | null = currentQuestion?.question ?? null;

  return (
    <PageFrame>
      <div className="mx-auto grid h-[calc(100vh-6.5rem)] max-w-6xl grid-cols-1 md:grid-cols-[minmax(0,1fr)_390px]">
        <ChatPanel
          messages={messages}
          currentQuestion={currentQ}
          progress={currentQuestion?.progress ?? null}
          stage={stage}
          busy={busy}
          error={error}
          onSubmitFreeText={handleIntent}
          onAnswerQuestion={handleAnswer}
          onSkipQuestion={handleSkip}
          onRestart={handleRestart}
          onSelectPersona={handleSelectPersona}
        />
        <BundlePanel
          bundle={bundle}
          reasoning={reasoning}
          priceBand={priceBand}
          loading={bundleLoading}
          error={bundleError}
          onRemove={handleRemove}
          onChangeBand={handleChangeBand}
          onAddToCart={handleAddToCart}
          addingToCart={addingToCart}
        />
      </div>
    </PageFrame>
  );
}

function formatAnswerText(q: QuestionDef, value: unknown): string {
  if (q.type === "number") return String(value);
  if (q.type === "multi" && Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    return value
      .map((v) => q.options?.find((o) => o.value === v)?.label ?? String(v))
      .join(", ");
  }
  if (q.type === "choice") {
    return q.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}
