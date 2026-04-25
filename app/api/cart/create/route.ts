import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getOrCreateSession } from "@/lib/session";
import { createBasket } from "@/services/cartService";
import { logAuditEvent } from "@/services/auditService";

export async function POST() {
  try {
    const { sessionId } = await getOrCreateSession();
    const cart = await createBasket({ sessionId });
    await logAuditEvent({
      sessionId,
      eventType: "CART_CREATED",
      payload: { basketId: cart.basketId },
    });
    return NextResponse.json(cart);
  } catch (err) {
    return errorResponse(err);
  }
}
