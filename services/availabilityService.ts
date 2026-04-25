import { prisma } from "@/lib/db";
import type { AvailabilityResult, InventoryRecord } from "@/domain/types";

export async function getAvailability(args: {
  skus: string[];
  storeIds?: string[];
}): Promise<AvailabilityResult[]> {
  const where: Record<string, unknown> = { sku: { in: args.skus } };
  if (args.storeIds && args.storeIds.length > 0) {
    where.storeId = { in: args.storeIds };
  }

  const rows = await prisma.inventorySnapshot.findMany({
    where,
    orderBy: { snapshotAt: "desc" },
  });

  return rows.map<AvailabilityResult>((r) => ({
    sku: r.sku,
    storeId: r.storeId,
    status: r.status,
    qty: r.qty,
  }));
}

export async function getAvailabilityForStore(
  storeId: string,
  skus: string[]
): Promise<AvailabilityResult[]> {
  if (skus.length === 0) return [];
  const rows = await prisma.inventorySnapshot.findMany({
    where: { storeId, sku: { in: skus } },
  });

  // For any missing SKUs return UNKNOWN.
  const found = new Map(rows.map((r) => [r.sku, r] as const));
  return skus.map<AvailabilityResult>((sku) => {
    const r = found.get(sku);
    if (!r) return { sku, storeId, status: "UNKNOWN", qty: 0 };
    return { sku, storeId, status: r.status, qty: r.qty };
  });
}

export function summariseByStore(
  records: InventoryRecord[]
): Record<string, Record<string, { status: string; qty: number }>> {
  const byStore: Record<string, Record<string, { status: string; qty: number }>> = {};
  for (const r of records) {
    byStore[r.storeId] = byStore[r.storeId] ?? {};
    byStore[r.storeId][r.sku] = { status: r.status, qty: r.qty };
  }
  return byStore;
}
