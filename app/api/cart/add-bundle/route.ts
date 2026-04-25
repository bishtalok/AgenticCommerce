import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cartAddBundleBody } from "@/lib/zodSchemas";
import { errorResponse, ApiError } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { addItemsToBasket } from "@/services/cartService";
import { logAuditEvent } from "@/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const body = cartAddBundleBody.parse(await req.json());
    const { sessionId } = await getOrCreateSession();

    const cart = await addItemsToBasket({
      basketId: body.basketId,
      items: body.items,
    });

    await logAuditEvent({
      sessionId,
      eventType: "ITEM_ADDED",
      payload: { basketId: body.basketId, items: body.items },
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
