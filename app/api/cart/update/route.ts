import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cartUpdateBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { updateBasketQuantities } from "@/services/cartService";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const body = cartUpdateBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();
    const cart = await updateBasketQuantities(body);
    await logAuditEvent({
      sessionId,
      eventType: "ITEM_REMOVED",
      payload: { basketId: body.basketId, updates: body.updates },
    });
    return NextResponse.json(cart);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(
        new ApiError("INVALID_INPUT", "Invalid input", "Please check your request.")
      );
    }
    return errorResponse(err);
  }
}
