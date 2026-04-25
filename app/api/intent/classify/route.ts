import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { intentClassifyBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { classifyIntent } from "@/domain/agent/intentClassifier";
import { isClinicalAdviceQuery, CLINICAL_ADVICE_REFUSAL } from "@/domain/agent/policyEngine";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`intent:${ip}`);
    if (!rl.allowed) {
      throw new ApiError(
        "RATE_LIMITED",
        "Too many requests",
        "Please slow down and try again in a moment.",
        429
      );
    }

    const body = intentClassifyBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    if (isClinicalAdviceQuery(body.query)) {
      await logAuditEvent({
        sessionId,
        eventType: "SAFETY_REFUSAL",
        payload: { query: body.query },
      });
      return NextResponse.json({
        missionCode: null,
        confidence: 0,
        alternatives: [],
        refusal: CLINICAL_ADVICE_REFUSAL,
      });
    }

    const result = classifyIntent(body.query);

    await logAuditEvent({
      sessionId,
      eventType: "INTENT_CLASSIFIED",
      payload: { query: body.query, result },
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_QUERY", "Invalid input", "Please enter a valid search query.", 400)
      );
    }
    return errorResponse(err);
  }
}
