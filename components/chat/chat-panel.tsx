"use client";

import { useState } from "react";
import type { QuestionDef, NextQuestion } from "@/domain/types";
import { MessageList } from "./message-list";
import { QuestionCard } from "./question-card";
import { DemoPersonaBar } from "./demo-persona-bar";
import type { Persona } from "./demo-persona-bar";
import type { ChatMessage } from "@/stores/missionStore";

export function ChatPanel({
  messages,
  currentQuestion,
  progress,
  stage,
  busy,
  error,
  onSubmitFreeText,
  onAnswerQuestion,
  onSkipQuestion,
  onRestart,
  onSelectPersona,
}: {
  messages: ChatMessage[];
  currentQuestion: QuestionDef | null;
  progress: NextQuestion["progress"] | null;
  stage: "intent" | "questions" | "building" | "ready";
  busy: boolean;
  error: string | null;
  onSubmitFreeText: (text: string) => void;
  onAnswerQuestion: (value: unknown) => void;
  onSkipQuestion: () => void;
  onRestart: () => void;
  onSelectPersona: (query: string, persona: Persona) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <section
      aria-labelledby="chat-heading"
      className="flex h-full flex-col bg-white"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 id="chat-heading" className="text-lg font-bold text-boots-navy">
          Travel mission chat
        </h2>
        <button
          type="button"
          onClick={onRestart}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Start over
        </button>
      </header>

      <MessageList messages={messages} busy={busy} />

      <div className="border-t bg-boots-sky/30 p-4">
        {error ? (
          <div
            role="alert"
            className="mb-3 rounded-md border border-destructive bg-destructive/10 p-2 text-xs text-destructive"
          >
            {error}
          </div>
        ) : null}

        {stage === "intent" ? (
          <>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim().length >= 3 && !busy) {
                  onSubmitFreeText(draft.trim());
                  setDraft("");
                }
              }}
            >
              <label htmlFor="intent-input" className="sr-only">
                Describe your trip
              </label>
              <input
                id="intent-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={busy}
                placeholder="e.g. family beach holiday Thailand 2 weeks"
                autoComplete="off"
                className="w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue"
              />
              <button
                type="submit"
                disabled={busy || draft.trim().length < 3}
                className="rounded-md bg-boots-navy px-4 py-2 text-sm font-semibold text-white hover:bg-boots-blue disabled:opacity-50"
              >
                {busy ? "Thinking…" : "Start"}
              </button>
            </form>
            <DemoPersonaBar onSelect={onSelectPersona} />
          </>
        ) : null}

        {stage === "questions" && currentQuestion && progress ? (
          <QuestionCard
            question={currentQuestion}
            progress={progress}
            onAnswer={onAnswerQuestion}
            onSkip={onSkipQuestion}
            busy={busy}
          />
        ) : null}

        {stage === "building" ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md bg-white p-3 text-sm text-boots-navy"
          >
            Building your travel kit…
          </div>
        ) : null}

        {stage === "ready" ? (
          <div className="rounded-md bg-white p-3 text-sm text-boots-navy">
            Your kit is ready on the right. Remove items you don&apos;t need, try a different price
            band, or continue to checkout.
          </div>
        ) : null}
      </div>
    </section>
  );
}
