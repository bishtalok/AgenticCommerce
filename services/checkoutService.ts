import { prisma } from "@/lib/db";
import { Prisma, FulfilmentMode, CheckoutStatus } from "@prisma/client";
import { ApiError } from "@/lib/errors";
import { validateMandate } from "@/services/consentService";

export interface CheckoutDto {
  checkoutSessionId: string;
  basketId: string;
  fulfilmentMode: FulfilmentMode;
  storeId: string | null;
  status: CheckoutStatus;
  totals: { subtotal: number; shipping: number; total: number };
  nextActions: string[];
}

export async function createCheckoutSession(args: {
  basketId: string;
  fulfilmentMode: FulfilmentMode;
  storeId?: string;
  deliveryAddress?: Record<string, unknown>;
}): Promise<CheckoutDto> {
  const basket = await prisma.basket.findUnique({ where: { id: args.basketId } });
  if (!basket) throw new ApiError("NOT_FOUND", "Basket not found", "Basket not found.", 404);

  const items = (basket.items as unknown as Array<{ qty: number }>) ?? [];
  if (items.length === 0) {
    throw new ApiError(
      "INVALID_INPUT",
      "Empty basket",
      "Your basket is empty — add items before checkout.",
      400
    );
  }

  const subtotal = Number(basket.subtotal.toString());
  const shipping = args.fulfilmentMode === "DELIVERY" ? (subtotal >= 30 ? 0 : 3.99) : 0;
  const total = round2(subtotal + shipping);

  const created = await prisma.checkoutSession.create({
    data: {
      basketId: args.basketId,
      fulfilmentMode: args.fulfilmentMode,
      storeId: args.storeId ?? null,
      deliveryAddress: (args.deliveryAddress ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
      status: "CREATED",
      totals: { subtotal, shipping, total } as unknown as Prisma.InputJsonValue,
    },
  });

  return toDto(created, { subtotal, shipping, total });
}

export async function updateCheckoutSession(args: {
  checkoutSessionId: string;
  fulfilmentMode?: FulfilmentMode;
  storeId?: string | null;
  deliveryAddress?: Record<string, unknown> | null;
}): Promise<CheckoutDto> {
  const existing = await prisma.checkoutSession.findUnique({
    where: { id: args.checkoutSessionId },
    include: { basket: true },
  });
  if (!existing) throw new ApiError("NOT_FOUND", "Not found", "Checkout session not found.", 404);
  if (existing.status === "CONFIRMED") {
    throw new ApiError(
      "CONFLICT",
      "Cannot update confirmed checkout",
      "This checkout has already been confirmed.",
      409
    );
  }

  const fulfilmentMode = args.fulfilmentMode ?? existing.fulfilmentMode;
  const subtotal = Number(existing.basket.subtotal.toString());
  const shipping = fulfilmentMode === "DELIVERY" ? (subtotal >= 30 ? 0 : 3.99) : 0;
  const total = round2(subtotal + shipping);

  const updated = await prisma.checkoutSession.update({
    where: { id: args.checkoutSessionId },
    data: {
      fulfilmentMode,
      storeId: args.storeId === undefined ? existing.storeId : args.storeId,
      deliveryAddress:
        args.deliveryAddress === undefined
          ? ((existing.deliveryAddress ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull)
          : ((args.deliveryAddress ?? Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull),
      status: "UPDATED",
      totals: { subtotal, shipping, total } as unknown as Prisma.InputJsonValue,
    },
  });

  return toDto(updated, { subtotal, shipping, total });
}

export async function confirmCheckout(args: {
  checkoutSessionId: string;
  mandateId: string;
}): Promise<{
  orderNumber: string;
  status: "PROCESSING";
  fulfilment: { mode: FulfilmentMode; storeId: string | null; etaText: string };
}> {
  const existing = await prisma.checkoutSession.findUnique({
    where: { id: args.checkoutSessionId },
    include: { orders: true },
  });
  if (!existing) throw new ApiError("NOT_FOUND", "Not found", "Checkout session not found.", 404);

  // Idempotency — if already confirmed, return the existing order.
  if (existing.status === "CONFIRMED" && existing.orders.length > 0) {
    const o = existing.orders[0];
    return {
      orderNumber: o.orderNumber,
      status: "PROCESSING",
      fulfilment: {
        mode: existing.fulfilmentMode,
        storeId: existing.storeId,
        etaText: etaTextFor(existing.fulfilmentMode),
      },
    };
  }

  const mandateValid = await validateMandate({
    mandateId: args.mandateId,
    checkoutSessionId: args.checkoutSessionId,
  });
  if (!mandateValid.ok) {
    if (mandateValid.reason === "EXPIRED") {
      throw new ApiError(
        "CONFLICT",
        "Consent mandate expired",
        "Your approval has expired — please review and approve again.",
        409
      );
    }
    if (mandateValid.reason === "HASH_MISMATCH") {
      throw new ApiError(
        "CONFLICT",
        "Order changed since approval",
        "Your basket or fulfilment has changed — please approve again.",
        409
      );
    }
    throw new ApiError("NOT_FOUND", "Mandate not found", "Approval record not found.", 404);
  }

  const orderNumber = generateOrderNumber();
  const order = await prisma.$transaction(async (tx) => {
    await tx.checkoutSession.update({
      where: { id: args.checkoutSessionId },
      data: { status: "CONFIRMED" },
    });
    return tx.order.create({
      data: {
        checkoutSessionId: args.checkoutSessionId,
        orderNumber,
        status: "PROCESSING",
        statusHistory: [
          { status: "PROCESSING", at: new Date().toISOString() },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
  });

  return {
    orderNumber: order.orderNumber,
    status: "PROCESSING",
    fulfilment: {
      mode: existing.fulfilmentMode,
      storeId: existing.storeId,
      etaText: etaTextFor(existing.fulfilmentMode),
    },
  };
}

function etaTextFor(mode: FulfilmentMode): string {
  return mode === "CLICK_COLLECT" ? "Ready in ~2 hours" : "Arrives in 1–3 days";
}

function generateOrderNumber(): string {
  const rand = Math.floor(Math.random() * 900_000) + 100_000;
  return `ROI-TRV-${rand}`;
}

function toDto(
  cs: {
    id: string;
    basketId: string;
    fulfilmentMode: FulfilmentMode;
    storeId: string | null;
    status: CheckoutStatus;
  },
  totals: { subtotal: number; shipping: number; total: number }
): CheckoutDto {
  return {
    checkoutSessionId: cs.id,
    basketId: cs.basketId,
    fulfilmentMode: cs.fulfilmentMode,
    storeId: cs.storeId,
    status: cs.status,
    totals,
    nextActions: cs.status === "CONFIRMED" ? [] : ["CONSENT_REQUIRED"],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
