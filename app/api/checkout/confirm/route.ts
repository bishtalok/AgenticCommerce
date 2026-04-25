import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkoutConfirmBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { confirmCheckout } from "@/services/checkoutService";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`checkout:${ip}`, 10);
    if (!rl.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many requests", "Please slow down.", 429);
    }

    const body = checkoutConfirmBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    const order = await confirmCheckout({
      checkoutSessionId: body.checkoutSessionId,
      mandateId: body.mandateId,
    });

    await logAuditEvent({
      sessionId,
      eventType: "ORDER_CONFIRMED",
      payload: {
        checkoutSessionId: body.checkoutSessionId,
        mandateId: body.mandateId,
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your request.")
      );
    }
    return errorResponse(err);
  }
}
