"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  MissionAnswers,
  MissionCode,
  TravelPlan,
  Bundle,
  BundleItem,
  BundleReasoning,
  QuestionDef,
  NextQuestion,
  FulfilmentMode,
  PriceBand,
  DestinationContext,
} from "@/domain/types";

export type ChatMessage =
  | { id: string; actor: "SYSTEM" | "AGENT" | "USER"; kind: "text"; text: string; at: number }
  | { id: string; actor: "AGENT"; kind: "question"; question: QuestionDef; at: number }
  | { id: string; actor: "AGENT"; kind: "refusal"; text: string; at: number }
  | { id: string; actor: "AGENT"; kind: "destination"; context: DestinationContext; at: number };

export interface CartLine {
  sku: string;
  name: string;
  category: string;
  qty: number;
  priceAtAdd: number;
  reasonCode?: string;
  why?: string;
}

export interface CartSnapshot {
  basketId: string;
  items: CartLine[];
  subtotal: number;
  total: number;
}

interface MissionState {
  missionCode: MissionCode | null;
  answers: MissionAnswers;
  planId: string | null;
  plan: TravelPlan | null;
  bundle: Bundle | null;
  reasoning: BundleReasoning | null;
  priceBand: PriceBand | null;
  removedSkus: string[];
  basket: CartSnapshot | null;
  checkoutSessionId: string | null;
  mandateId: string | null;
  fulfilmentMode: FulfilmentMode | null;
  storeId: string | null;
  orderNumber: string | null;
  currentQuestion: NextQuestion | null;
  messages: ChatMessage[];

  setMission: (missionCode: MissionCode | null) => void;
  setAnswer: (key: keyof MissionAnswers, value: unknown) => void;
  setCurrentQuestion: (q: NextQuestion | null) => void;
  setPlan: (planId: string, plan: TravelPlan) => void;
  setBundle: (bundle: Bundle) => void;
  setReasoning: (reasoning: BundleReasoning | null) => void;
  setPriceBand: (band: PriceBand) => void;
  removeSku: (sku: string) => void;
  restoreSku: (sku: string) => void;
  setBasket: (basket: CartSnapshot | null) => void;
  setCheckout: (args: { checkoutSessionId: string; fulfilmentMode: FulfilmentMode; storeId: string | null }) => void;
  setMandate: (mandateId: string) => void;
  setOrderNumber: (orderNumber: string) => void;
  pushMessage: (msg: ChatMessage) => void;
  reset: () => void;
}

const initial = {
  missionCode: null,
  answers: {} as MissionAnswers,
  planId: null,
  plan: null,
  bundle: null,
  reasoning: null as BundleReasoning | null,
  priceBand: null,
  removedSkus: [] as string[],
  basket: null,
  checkoutSessionId: null,
  mandateId: null,
  fulfilmentMode: null,
  storeId: null,
  orderNumber: null,
  currentQuestion: null,
  messages: [] as ChatMessage[],
};

export const useMissionStore = create<MissionState>()(
  persist(
    (set) => ({
      ...initial,
      setMission: (missionCode) => set({ missionCode }),
      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } as MissionAnswers })),
      setCurrentQuestion: (q) => set({ currentQuestion: q }),
      setPlan: (planId, plan) =>
        set({ planId, plan, priceBand: plan.constraints.priceBand }),
      setBundle: (bundle) => set({ bundle }),
      setReasoning: (reasoning) => set({ reasoning }),
      setPriceBand: (priceBand) => set({ priceBand }),
      removeSku: (sku) =>
        set((s) => ({
          removedSkus: s.removedSkus.includes(sku) ? s.removedSkus : [...s.removedSkus, sku],
        })),
      restoreSku: (sku) =>
        set((s) => ({ removedSkus: s.removedSkus.filter((x) => x !== sku) })),
      setBasket: (basket) => set({ basket }),
      setCheckout: ({ checkoutSessionId, fulfilmentMode, storeId }) =>
        set({ checkoutSessionId, fulfilmentMode, storeId }),
      setMandate: (mandateId) => set({ mandateId }),
      setOrderNumber: (orderNumber) => set({ orderNumber }),
      pushMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      reset: () => set({ ...initial }),
    }),
    {
      name: "boots-mission-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        missionCode: s.missionCode,
        answers: s.answers,
        planId: s.planId,
        plan: s.plan,
        bundle: s.bundle,
        reasoning: s.reasoning,
        priceBand: s.priceBand,
        removedSkus: s.removedSkus,
        basket: s.basket,
        checkoutSessionId: s.checkoutSessionId,
        mandateId: s.mandateId,
        fulfilmentMode: s.fulfilmentMode,
        storeId: s.storeId,
        orderNumber: s.orderNumber,
        messages: s.messages,
      }),
    }
  )
);

type MessageDraft =
  | { actor: "SYSTEM" | "AGENT" | "USER"; kind: "text"; text: string }
  | { actor: "AGENT"; kind: "question"; question: QuestionDef }
  | { actor: "AGENT"; kind: "refusal"; text: string }
  | { actor: "AGENT"; kind: "destination"; context: DestinationContext };

export function makeMessage(partial: MessageDraft): ChatMessage {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const at = Date.now();
  return { ...partial, id, at } as ChatMessage;
}

export function toBundleItems(bundle: Bundle): BundleItem[] {
  return bundle.items.map((i) => ({ ...i }));
}
