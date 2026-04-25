import { prisma } from "@/lib/db";
import type { Product, ProductCategory, ProductAttributes } from "@/domain/types";

function toDomain(p: {
  sku: string;
  name: string;
  category: string;
  subCategory: string | null;
  brand: string | null;
  priceEur: { toString(): string };
  attributes: unknown;
  warnings: string | null;
}): Product {
  return {
    sku: p.sku,
    name: p.name,
    category: p.category as ProductCategory,
    subCategory: p.subCategory,
    brand: p.brand,
    priceEur: Number(p.priceEur.toString()),
    attributes: (p.attributes ?? {}) as ProductAttributes,
    warnings: p.warnings,
  };
}

export async function listAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany();
  return rows.map(toDomain);
}

export async function getProductsBySkus(skus: string[]): Promise<Product[]> {
  if (skus.length === 0) return [];
  const rows = await prisma.product.findMany({ where: { sku: { in: skus } } });
  return rows.map(toDomain);
}

export async function getProduct(sku: string): Promise<Product | null> {
  const row = await prisma.product.findUnique({ where: { sku } });
  return row ? toDomain(row) : null;
}
