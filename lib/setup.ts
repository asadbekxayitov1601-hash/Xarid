import type { PrismaClient } from "@prisma/client";
import { seedCatalog } from "./seed";

// Schema DDL generated from prisma/schema.prisma via:
//   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
// Regenerate and replace whenever the schema changes.
const DDL = `
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "botCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "telegramId" BIGINT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "sortKey" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierOffer" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "minQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SupplierOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "buyerOrgId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "poId" TEXT,
    "offerId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "qtyActual" DOUBLE PRECISION,
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "district" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_botCode_key" ON "Organization"("botCode");

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

CREATE UNIQUE INDEX "SupplierOffer_supplierId_productId_key" ON "SupplierOffer"("supplierId", "productId");

CREATE UNIQUE INDEX "PurchaseOrder_orderId_supplierId_key" ON "PurchaseOrder"("orderId", "supplierId");

ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SupplierOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;

/** True when the schema's tables already exist in the connected database. */
export async function tablesExist(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass('public."Product"') IS NOT NULL AS exists`;
  return rows[0]?.exists ?? false;
}

/**
 * Browser-driven bootstrap for fresh deployments: creates the schema if
 * missing and seeds the demo catalog if empty. Idempotent — safe to call
 * repeatedly; it never touches an already-populated database.
 */
export async function ensureDatabase(prisma: PrismaClient) {
  let createdTables = false;
  if (!(await tablesExist(prisma))) {
    const statements = DDL.split(";").map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    createdTables = true;
  }

  let seeded = null;
  if ((await prisma.product.count()) === 0) {
    seeded = await seedCatalog(prisma);
  }

  return { createdTables, seeded, products: await prisma.product.count() };
}
