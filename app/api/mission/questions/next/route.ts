import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { missionQuestionsNextBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { getNextQuestion } from "@/domain/agent/questionFlow";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`mission:${ip}`);
    if (!rl.allowed) {
      throw new ApiError(
        "RATE_LIMITED",
        "Too many requests",
        "Please slow down and try again in a moment.",
        429
      );
    }

    await getOrCreateSession();
    const body = missionQuestionsNextBody.parse(await req.json());
    const result = getNextQuestion(body.missionCode, body.answers);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid request", "Please check your input and try again.")
      );
    }
    return errorResponse(err);
  }
}
