import { getMissionConfig } from "@/domain/mission/config";
import type {
  MissionCode,
  MissionAnswers,
  NextQuestion,
  QuestionDef,
} from "@/domain/types";

/**
 * Question flow engine (PRD §4 FR-011).
 *
 * - Walks the ordered question set for a mission.
 * - Skips questions whose answer has already been provided.
 * - Early-stop: after 3 critical questions are answered we mark `done`,
 *   leaving non-critical questions as optional refinements.
 */
export function getNextQuestion(
  missionCode: MissionCode,
  answers: MissionAnswers
): NextQuestion {
  const cfg = getMissionConfig(missionCode);
  const questions = [...cfg.questions].sort((a, b) => a.order - b.order) as QuestionDef[];
  const total = questions.length;

  const answeredIds = collectAnsweredIds(answers);
  const criticalAnswered = questions.filter(
    (q) => q.critical && answeredIds.has(q.id)
  ).length;

  for (const q of questions) {
    if (answeredIds.has(q.id)) continue;

    // If the next unanswered question is non-critical AND we have all critical
    // answers, we consider the flow done (user can still refine via UI).
    if (!q.critical && criticalAnswered >= countCritical(questions)) {
      return {
        question: null,
        progress: { current: total, total },
        done: true,
      };
    }

    return {
      question: q,
      progress: { current: answeredIds.size + 1, total },
      done: false,
    };
  }

  return { question: null, progress: { current: total, total }, done: true };
}

export function validateAnswer(
  q: QuestionDef,
  value: unknown
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (q.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, error: "Please enter a whole number." };
    }
    if (q.validation?.min !== undefined && n < q.validation.min) {
      return { ok: false, error: `Must be at least ${q.validation.min}.` };
    }
    if (q.validation?.max !== undefined && n > q.validation.max) {
      return { ok: false, error: `Must be at most ${q.validation.max}.` };
    }
    return { ok: true, value: n };
  }

  if (q.type === "choice") {
    const allowed = q.options?.map((o) => o.value) ?? [];
    if (typeof value !== "string" || !allowed.includes(value)) {
      return { ok: false, error: "Please pick one of the options." };
    }
    return { ok: true, value };
  }

  if (q.type === "multi") {
    if (!Array.isArray(value)) return { ok: false, error: "Expected a list." };
    const allowed = new Set(q.options?.map((o) => o.value) ?? []);
    for (const v of value) {
      if (typeof v !== "string" || !allowed.has(v)) {
        return { ok: false, error: "Unexpected option." };
      }
    }
    return { ok: true, value };
  }

  return { ok: false, error: "Unsupported question type." };
}

function collectAnsweredIds(answers: MissionAnswers): Set<string> {
  const out = new Set<string>();
  if (answers.destinationType) out.add("q_destination_type");
  if (typeof answers.durationDays === "number") out.add("q_duration_days");
  if (answers.travellerType) out.add("q_traveller_type");
  if (answers.sensitivities !== undefined) out.add("q_sensitivities");
  if (answers.urgency) out.add("q_urgency");
  return out;
}

function countCritical(questions: QuestionDef[]): number {
  return questions.filter((q) => q.critical).length;
}

export function answerKeyForQuestion(questionId: string): keyof MissionAnswers | null {
  switch (questionId) {
    case "q_destination_type":
      return "destinationType";
    case "q_duration_days":
      return "durationDays";
    case "q_traveller_type":
      return "travellerType";
    case "q_sensitivities":
      return "sensitivities";
    case "q_urgency":
      return "urgency";
    default:
      return null;
  }
}
