import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Secure-boots_session" : "boots_session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getOrCreateSession(): Promise<{ sessionId: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;

  if (existing) {
    const found = await prisma.session.findUnique({ where: { id: existing } });
    if (found) {
      await prisma.session
        .update({ where: { id: found.id }, data: { lastSeenAt: new Date() } })
        .catch(() => null);
      return { sessionId: found.id, isNew: false };
    }
  }

  const created = await prisma.session.create({
    data: { locale: "en-IE" },
  });

  jar.set(COOKIE_NAME, created.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { sessionId: created.id, isNew: true };
}

export async function touchSession(sessionId: string): Promise<void> {
  await prisma.session
    .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
    .catch(() => null);
}
