import { prisma } from "@/lib/db";
import { createHash } from "node:crypto";
import { ApiError } from "@/lib/errors";

export interface MandateDto {
  mandateId: string;
  hash: string;
  expiresAt: string;
  scope: {
    currency: "EUR";
    amount: number;
  };
}

export async function createMandate(args: {
  checkoutSessionId: string;
  currency: "EUR";
  amount: number;
  ttlMinutes: number;
}): Promise<MandateDto> {
  const checkout = await prisma.checkoutSession.findUnique({
    where: { id: args.checkoutSessionId },
    include: { basket: true },
  });
  if (!checkout) {
    throw new ApiError("NOT_FOUND", "Checkout session not found", "Checkout session not found.", 404);
  }
  if (checkout.status === "CONFIRMED") {
    throw new ApiError(
      "CONFLICT",
      "Checkout already confirmed",
      "This order has already been confirmed.",
      409
    );
  }

  const expiresAt = new Date(Date.now() + args.ttlMinutes * 60_000);
  const scope = { currency: args.currency, amount: args.amount, expiresAt: expiresAt.toISOString() };
  const hash = hashMandate({
    checkoutSessionId: args.checkoutSessionId,
    items: checkout.basket.items,
    totals: checkout.totals,
    fulfilmentMode: checkout.fulfilmentMode,
    storeId: checkout.storeId,
    scope,
  });

  const m = await prisma.consentMandate.create({
    data: {
      checkoutSessionId: args.checkoutSessionId,
      scope,
      hash,
      expiresAt,
    },
  });

  return {
    mandateId: m.id,
    hash,
    expiresAt: expiresAt.toISOString(),
    scope: { currency: args.currency, amount: args.amount },
  };
}

export async function validateMandate(args: {
  mandateId: string;
  checkoutSessionId: string;
}): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "HASH_MISMATCH" }> {
  const m = await prisma.consentMandate.findUnique({ where: { id: args.mandateId } });
  if (!m || m.checkoutSessionId !== args.checkoutSessionId) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  if (m.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }

  const checkout = await prisma.checkoutSession.findUnique({
    where: { id: args.checkoutSessionId },
    include: { basket: true },
  });
  if (!checkout) return { ok: false, reason: "NOT_FOUND" };

  const currentHash = hashMandate({
    checkoutSessionId: args.checkoutSessionId,
    items: checkout.basket.items,
    totals: checkout.totals,
    fulfilmentMode: checkout.fulfilmentMode,
    storeId: checkout.storeId,
    scope: m.scope,
  });
  if (currentHash !== m.hash) {
    return { ok: false, reason: "HASH_MISMATCH" };
  }

  return { ok: true };
}

function hashMandate(input: Record<string, unknown>): string {
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(canonical).digest("hex");
}
