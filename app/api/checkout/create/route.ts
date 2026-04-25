import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkoutCreateBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { createCheckoutSession } from "@/services/checkoutService";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`checkout:${ip}`, 10);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many requests", "Please slow down.", 429);
    }

    const body = checkoutCreateBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    const checkout = await createCheckoutSession({
      basketId: body.basketId,
      fulfilmentMode: body.fulfilmentMode,
      storeId: body.storeId,
      deliveryAddress: body.deliveryAddress,
    });

    await logAuditEvent({
      sessionId,
      eventType: "CHECKOUT_CREATED",
      payload: {
        checkoutSessionId: checkout.checkoutSessionId,
        fulfilmentMode: body.fulfilmentMode,
        storeId: body.storeId ?? null,
      },
    });

    return NextResponse.json(checkout);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your request.")
      );
    }
    return errorResponse(err);
  }
}
