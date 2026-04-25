import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bundleGenerateBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/db";
import { listAllProducts } from "@/services/catalogService";
import { buildBundle } from "@/domain/agent/bundleBuilder";
import { logAuditEvent } from "@/services/auditService";
import type { TravelPlan } from "@/domain/types";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`mission:${ip}`);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many requests", "Please slow down.", 429);
    }

    const body = bundleGenerateBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    const plan = await prisma.travelPlan.findUnique({ where: { id: body.planId } });
    if (!plan) {
      throw new ApiError("NOT_FOUND", "Plan not found", "Plan not found.", 404);
    }

    const planObj = plan.planJson as unknown as TravelPlan;
    const catalog = await listAllProducts();
    const bundle = buildBundle(planObj, catalog, {
      priceBand: body.priceBand ?? planObj.constraints.priceBand,
      exclusions: body.exclusions,
      removedSkus: body.removedSkus,
      destinationContext: body.destinationContext,
    });

    await logAuditEvent({
      sessionId,
      eventType: "BUNDLE_GENERATED",
      payload: {
        planId: body.planId,
        itemCount: bundle.itemCount,
        estimatedTotal: bundle.estimatedTotal,
        warnings: bundle.warnings,
      },
    });

    return NextResponse.json({
      bundleItems: bundle.items,
      bundleMeta: {
        itemCount: bundle.itemCount,
        estimatedTotal: bundle.estimatedTotal,
        warnings: bundle.warnings,
      },
      bundleReasoning: bundle.reasoning ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your request.")
      );
    }
    return errorResponse(err);
  }
}
