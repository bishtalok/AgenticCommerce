import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type AuditEventType =
  | "INTENT_CLASSIFIED"
  | "QUESTION_ANSWERED"
  | "PLAN_CREATED"
  | "BUNDLE_GENERATED"
  | "ITEM_ADDED"
  | "ITEM_REMOVED"
  | "SUBSTITUTE_APPLIED"
  | "CART_CREATED"
  | "CHECKOUT_CREATED"
  | "CHECKOUT_UPDATED"
  | "CONSENT_ISSUED"
  | "CONSENT_EXPIRED"
  | "ORDER_CONFIRMED"
  | "SAFETY_REFUSAL";

export async function logAuditEvent(args: {
  sessionId: string;
  eventType: AuditEventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        sessionId: args.sessionId,
        eventType: args.eventType,
        payload: (args.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    // Audit must never fail the user request — log and swallow.
    // eslint-disable-next-line no-console
    console.error("[audit] failed", args.eventType, e);
  }
}
