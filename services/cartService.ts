import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/errors";

export interface CartItem {
  sku: string;
  qty: number;
  priceAtAdd: number;
  name: string;
  category: string;
  reasonCode?: string;
  why?: string;
}

export interface CartDto {
  basketId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  updatedAt: string;
}

export async function createBasket(args: {
  sessionId: string;
  planId?: string;
}): Promise<CartDto> {
  const basket = await prisma.basket.create({
    data: {
      sessionId: args.sessionId,
      planId: args.planId ?? null,
      items: [],
      subtotal: new Prisma.Decimal(0),
      total: new Prisma.Decimal(0),
    },
  });
  return toDto(basket);
}

export async function addItemsToBasket(args: {
  basketId: string;
  items: Array<{ sku: string; qty: number; reasonCode?: string; why?: string }>;
}): Promise<CartDto> {
  const basket = await prisma.basket.findUnique({ where: { id: args.basketId } });
  if (!basket) throw new ApiError("NOT_FOUND", "Basket not found", "Basket not found.", 404);

  const skus = args.items.map((i) => i.sku);
  const products = await prisma.product.findMany({ where: { sku: { in: skus } } });
  const priceBySku = new Map(products.map((p) => [p.sku, Number(p.priceEur.toString())] as const));
  const productMeta = new Map(
    products.map((p) => [p.sku, { name: p.name, category: p.category }] as const)
  );

  const currentItems = (basket.items as unknown as CartItem[]) ?? [];
  const merged = mergeItems(
    currentItems,
    args.items.map((i) => ({
      sku: i.sku,
      qty: i.qty,
      priceAtAdd: priceBySku.get(i.sku) ?? 0,
      name: productMeta.get(i.sku)?.name ?? i.sku,
      category: productMeta.get(i.sku)?.category ?? "UNKNOWN",
      reasonCode: i.reasonCode,
      why: i.why,
    }))
  );

  const subtotal = round2(merged.reduce((s, i) => s + i.priceAtAdd * i.qty, 0));
  const total = subtotal;

  const updated = await prisma.basket.update({
    where: { id: args.basketId },
    data: {
      items: merged as unknown as Prisma.InputJsonValue,
      subtotal: new Prisma.Decimal(subtotal),
      total: new Prisma.Decimal(total),
    },
  });

  return toDto(updated);
}

export async function updateBasketQuantities(args: {
  basketId: string;
  updates: Array<{ sku: string; qty: number }>;
}): Promise<CartDto> {
  const basket = await prisma.basket.findUnique({ where: { id: args.basketId } });
  if (!basket) throw new ApiError("NOT_FOUND", "Basket not found", "Basket not found.", 404);

  const items = (basket.items as unknown as CartItem[]) ?? [];
  const updates = new Map(args.updates.map((u) => [u.sku, u.qty] as const));

  const next = items
    .map((i) => ({ ...i, qty: updates.has(i.sku) ? updates.get(i.sku)! : i.qty }))
    .filter((i) => i.qty > 0);

  const subtotal = round2(next.reduce((s, i) => s + i.priceAtAdd * i.qty, 0));

  const updated = await prisma.basket.update({
    where: { id: args.basketId },
    data: {
      items: next as unknown as Prisma.InputJsonValue,
      subtotal: new Prisma.Decimal(subtotal),
      total: new Prisma.Decimal(subtotal),
    },
  });
  return toDto(updated);
}

export async function getBasket(basketId: string): Promise<CartDto | null> {
  const b = await prisma.basket.findUnique({ where: { id: basketId } });
  return b ? toDto(b) : null;
}

function mergeItems(existing: CartItem[], incoming: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const i of existing) map.set(i.sku, i);
  for (const i of incoming) {
    const cur = map.get(i.sku);
    if (cur) {
      map.set(i.sku, { ...cur, qty: cur.qty + i.qty });
    } else {
      map.set(i.sku, i);
    }
  }
  return Array.from(map.values());
}

function toDto(b: {
  id: string;
  items: unknown;
  subtotal: { toString(): string };
  total: { toString(): string };
  updatedAt: Date;
}): CartDto {
  return {
    basketId: b.id,
    items: (b.items as CartItem[]) ?? [],
    subtotal: Number(b.subtotal.toString()),
    total: Number(b.total.toString()),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
