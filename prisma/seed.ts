import { PrismaClient, InventoryStatus } from "@prisma/client";
import products from "../data/products.json";
import stores from "../data/stores.json";
import inventory from "../data/inventory.json";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding products...");
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        subCategory: p.subCategory ?? null,
        brand: p.brand ?? null,
        priceEur: p.priceEur,
        attributes: p.attributes ?? {},
        warnings: p.warnings ?? null,
      },
      update: {
        name: p.name,
        category: p.category,
        subCategory: p.subCategory ?? null,
        brand: p.brand ?? null,
        priceEur: p.priceEur,
        attributes: p.attributes ?? {},
        warnings: p.warnings ?? null,
      },
    });
  }

  console.log("Seeding stores...");
  for (const s of stores) {
    await prisma.store.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        postcode: s.postcode,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        supportsClickCollect: s.supportsClickCollect,
      },
      update: {
        name: s.name,
        postcode: s.postcode,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        supportsClickCollect: s.supportsClickCollect,
      },
    });
  }

  console.log("Seeding inventory...");
  // Clear existing inventory snapshots and re-insert to keep seed idempotent.
  await prisma.inventorySnapshot.deleteMany({});
  for (const inv of inventory) {
    await prisma.inventorySnapshot.create({
      data: {
        storeId: inv.storeId,
        sku: inv.sku,
        qty: inv.qty,
        status: inv.status as InventoryStatus,
      },
    });
  }

  console.log(
    `Seeded: ${products.length} products, ${stores.length} stores, ${inventory.length} inventory rows.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
