import { describe, it, expect } from "vitest";
import {
  getNextQuestion,
  validateAnswer,
  answerKeyForQuestion,
} from "@/domain/agent/questionFlow";
import type { MissionAnswers } from "@/domain/types";

const MISSION = "TRAVEL" as const;

describe("getNextQuestion", () => {
  it("returns the first question when no answers given", () => {
    const r = getNextQuestion(MISSION, {});
    expect(r.done).toBe(false);
    expect(r.question?.id).toBe("q_destination_type");
    expect(r.progress.current).toBe(1);
  });

  it("advances to q_duration_days after destination answered", () => {
    const answers: MissionAnswers = { destinationType: "beach" };
    const r = getNextQuestion(MISSION, answers);
    expect(r.question?.id).toBe("q_duration_days");
    expect(r.progress.current).toBe(2);
  });

  it("advances to q_traveller_type after first two answered", () => {
    const answers: MissionAnswers = { destinationType: "city", durationDays: 3 };
    const r = getNextQuestion(MISSION, answers);
    expect(r.question?.id).toBe("q_traveller_type");
  });

  it("marks done after all 3 critical questions answered (early-stop)", () => {
    const answers: MissionAnswers = {
      destinationType: "beach",
      durationDays: 7,
      travellerType: "adult",
    };
    const r = getNextQuestion(MISSION, answers);
    expect(r.done).toBe(true);
    expect(r.question).toBeNull();
  });

  it("still done even if optional questions remain unanswered", () => {
    const answers: MissionAnswers = {
      destinationType: "city",
      durationDays: 5,
      travellerType: "family",
      // no sensitivities, no urgency
    };
    const r = getNextQuestion(MISSION, answers);
    expect(r.done).toBe(true);
  });

  it("marks done when all 5 questions answered", () => {
    const answers: MissionAnswers = {
      destinationType: "mixed",
      durationDays: 10,
      travellerType: "adult",
      sensitivities: ["sensitive_skin"],
      urgency: "1_3_days",
    };
    const r = getNextQuestion(MISSION, answers);
    expect(r.done).toBe(true);
    expect(r.question).toBeNull();
  });

  it("includes progress totals", () => {
    const r = getNextQuestion(MISSION, {});
    expect(r.progress.total).toBe(5);
  });
});

describe("validateAnswer", () => {
  const choiceQ = {
    id: "q_destination_type",
    order: 1,
    text: "?",
    type: "choice" as const,
    options: [
      { value: "beach", label: "Beach" },
      { value: "city", label: "City" },
    ],
    critical: true,
  };

  const numberQ = {
    id: "q_duration_days",
    order: 2,
    text: "?",
    type: "number" as const,
    validation: { min: 1, max: 60 },
    critical: true,
  };

  const multiQ = {
    id: "q_sensitivities",
    order: 4,
    text: "?",
    type: "multi" as const,
    options: [
      { value: "sensitive_skin", label: "Sensitive skin" },
      { value: "fragrance_free_preference", label: "Fragrance-free" },
    ],
    critical: false,
  };

  it("accepts a valid choice answer", () => {
    const r = validateAnswer(choiceQ, "beach");
    expect(r.ok).toBe(true);
  });

  it("rejects an invalid choice option", () => {
    const r = validateAnswer(choiceQ, "jungle");
    expect(r.ok).toBe(false);
  });

  it("accepts a valid number", () => {
    const r = validateAnswer(numberQ, 7);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(7);
  });

  it("rejects a number below min", () => {
    const r = validateAnswer(numberQ, 0);
    expect(r.ok).toBe(false);
  });

  it("rejects a number above max", () => {
    const r = validateAnswer(numberQ, 100);
    expect(r.ok).toBe(false);
  });

  it("accepts valid multi-select values", () => {
    const r = validateAnswer(multiQ, ["sensitive_skin"]);
    expect(r.ok).toBe(true);
  });

  it("accepts empty multi-select (no sensitivity)", () => {
    const r = validateAnswer(multiQ, []);
    expect(r.ok).toBe(true);
  });

  it("rejects multi-select with unknown option", () => {
    const r = validateAnswer(multiQ, ["unknown_value"]);
    expect(r.ok).toBe(false);
  });

  it("rejects non-integer for number question", () => {
    const r = validateAnswer(numberQ, 3.5);
    expect(r.ok).toBe(false);
  });
});

describe("answerKeyForQuestion", () => {
  it.each([
    ["q_destination_type", "destinationType"],
    ["q_duration_days", "durationDays"],
    ["q_traveller_type", "travellerType"],
    ["q_sensitivities", "sensitivities"],
    ["q_urgency", "urgency"],
  ])("%s → %s", (id, key) => {
    expect(answerKeyForQuestion(id)).toBe(key);
  });

  it("returns null for unknown question id", () => {
    expect(answerKeyForQuestion("q_unknown")).toBeNull();
  });
});
