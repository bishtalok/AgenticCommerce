"use client";

import { useState } from "react";
import type { QuestionDef } from "@/domain/types";
import { QuickReplies } from "./quick-replies";

export function QuestionCard({
  question,
  progress,
  onAnswer,
  onSkip,
  busy,
}: {
  question: QuestionDef;
  progress: { current: number; total: number };
  onAnswer: (value: unknown) => void;
  onSkip?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-boots-blue">
          Question {progress.current} of {progress.total}
        </p>
        {!question.critical && onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
          >
            Skip
          </button>
        ) : null}
      </div>
      <p className="pb-4 text-base font-semibold text-boots-navy">{question.text}</p>
      <QuestionInput question={question} onAnswer={onAnswer} busy={busy} />
    </div>
  );
}

function QuestionInput({
  question,
  onAnswer,
  busy,
}: {
  question: QuestionDef;
  onAnswer: (value: unknown) => void;
  busy?: boolean;
}) {
  if (question.type === "choice" && question.options) {
    return (
      <QuickReplies
        options={question.options}
        onPick={(v) => onAnswer(v)}
        disabled={busy}
      />
    );
  }

  if (question.type === "multi" && question.options) {
    return <MultiChoice question={question} onAnswer={onAnswer} busy={busy} />;
  }

  if (question.type === "number") {
    return <NumberInput question={question} onAnswer={onAnswer} busy={busy} />;
  }

  return null;
}

function MultiChoice({
  question,
  onAnswer,
  busy,
}: {
  question: QuestionDef;
  onAnswer: (value: unknown) => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (v: string) => {
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };
  return (
    <div className="flex flex-col gap-3">
      <QuickReplies
        options={question.options!}
        onPick={toggle}
        disabled={busy}
        selected={selected}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onAnswer(selected)}
          disabled={busy}
          className="rounded-md bg-boots-navy px-4 py-2 text-sm font-semibold text-white hover:bg-boots-blue disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function NumberInput({
  question,
  onAnswer,
  busy,
}: {
  question: QuestionDef;
  onAnswer: (value: unknown) => void;
  busy?: boolean;
}) {
  const [val, setVal] = useState<string>("");
  const min = question.validation?.min ?? 1;
  const max = question.validation?.max ?? 30;
  const parsed = Number(val);
  const valid = val !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max;
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onAnswer(parsed);
      }}
    >
      <label className="sr-only" htmlFor={`q-${question.id}`}>
        {question.text}
      </label>
      <input
        id={`q-${question.id}`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        disabled={busy}
        className="w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-boots-blue"
        placeholder={`Between ${min} and ${max}`}
      />
      <button
        type="submit"
        disabled={!valid || busy}
        className="rounded-md bg-boots-navy px-4 py-2 text-sm font-semibold text-white hover:bg-boots-blue disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
}
