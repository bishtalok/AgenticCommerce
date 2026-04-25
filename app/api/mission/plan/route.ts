import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { missionPlanBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/db";
import { buildPlan } from "@/domain/agent/planBuilder";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`mission:${ip}`);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many requests", "Please slow down.", 429);
    }

    const body = missionPlanBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    const plan = buildPlan(body.missionCode, body.answers);

    const stored = await prisma.travelPlan.create({
      data: {
        sessionId,
        planJson: plan as unknown as Prisma.InputJsonValue,
      },
    });

    await logAuditEvent({
      sessionId,
      eventType: "PLAN_CREATED",
      payload: { planId: stored.id, plan },
    });

    return NextResponse.json({
      planId: stored.id,
      planSummary: plan.summary,
      plan,
      constraints: plan.constraints,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your answers.")
      );
    }
    return errorResponse(err);
  }
}
