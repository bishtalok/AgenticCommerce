import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consentMandateBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { createMandate } from "@/services/consentService";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`checkout:${ip}`, 10);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many requests", "Please slow down.", 429);
    }

    const body = consentMandateBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    const mandate = await createMandate({
      checkoutSessionId: body.checkoutSessionId,
      currency: body.scope.currency,
      amount: body.scope.amount,
      ttlMinutes: body.scope.ttlMinutes,
    });

    await logAuditEvent({
      sessionId,
      eventType: "CONSENT_ISSUED",
      payload: {
        checkoutSessionId: body.checkoutSessionId,
        mandateId: mandate.mandateId,
        scope: mandate.scope,
        expiresAt: mandate.expiresAt,
      },
    });

    return NextResponse.json(mandate);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your request.")
      );
    }
    return errorResponse(err);
  }
}
