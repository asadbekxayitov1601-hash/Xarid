import type { PrismaClient } from "@prisma/client";
import { seedCatalog } from "./seed";

// Schema DDL generated from prisma/schema.prisma via:
//   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
// Regenerate and replace whenever the schema changes, and add idempotent
// statements to MIGRATIONS for databases created before the change.
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
    "passwordHash" TEXT,
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
    "imageUrl" TEXT,

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

CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "botCode" TEXT NOT NULL,
    "userId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
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
    "driverId" TEXT,
    "cashTaken" INTEGER,
    "podFileId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "clickPrepareId" BIGSERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "debit" TEXT NOT NULL,
    "credit" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
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

CREATE UNIQUE INDEX "Driver_botCode_key" ON "Driver"("botCode");

CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

CREATE UNIQUE INDEX "Payment_clickPrepareId_key" ON "Payment"("clickPrepareId");

CREATE UNIQUE INDEX "Payment_provider_externalId_key" ON "Payment"("provider", "externalId");

CREATE UNIQUE INDEX "LedgerEntry_key_key" ON "LedgerEntry"("key");

CREATE UNIQUE INDEX "Payout_supplierId_periodStart_key" ON "Payout"("supplierId", "periodStart");

CREATE UNIQUE INDEX "PurchaseOrder_orderId_supplierId_key" ON "PurchaseOrder"("orderId", "supplierId");

ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SupplierOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;

// Idempotent upgrades for already-existing databases (IF NOT EXISTS only).
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "botCode" TEXT NOT NULL,
    "userId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Driver_botCode_key" ON "Driver"("botCode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Driver_userId_key" ON "Driver"("userId")`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "driverId" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashTaken" INTEGER`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "podFileId" TEXT`,
  `ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "clickPrepareId" BIGSERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_clickPrepareId_key" ON "Payment"("clickPrepareId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_externalId_key" ON "Payment"("provider", "externalId")`,
  `CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "debit" TEXT NOT NULL,
    "credit" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_key_key" ON "LedgerEntry"("key")`,
  `CREATE TABLE IF NOT EXISTS "Payout" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Payout_supplierId_periodStart_key" ON "Payout"("supplierId", "periodStart")`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`,
  // Public store profile + store-first catalog card fields (all nullable).
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "about" TEXT`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "discountPct" INTEGER`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "etaMin" INTEGER`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "etaMax" INTEGER`,
];

/** True when the schema's tables already exist in the connected database. */
export async function tablesExist(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass('public."Product"') IS NOT NULL AS exists`;
  return rows[0]?.exists ?? false;
}

/**
 * Browser-driven bootstrap for fresh deployments: creates the schema if
 * missing and applies idempotent upgrades to existing databases. Safe to call
 * repeatedly; it never touches data.
 *
 * Seeding the demo catalog is now OPT-IN (`{ seed: true }`). The store-first
 * model is manual: stores and their products are entered by an admin, so an
 * empty catalog must stay empty rather than auto-refilling with demo SKUs.
 */
export async function ensureDatabase(
  prisma: PrismaClient,
  { seed = false }: { seed?: boolean } = {}
) {
  let createdTables = false;
  if (!(await tablesExist(prisma))) {
    const statements = DDL.split(";").map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    createdTables = true;
  } else {
    for (const statement of MIGRATIONS) {
      await prisma.$executeRawUnsafe(statement);
    }
  }

  let seeded = null;
  if (seed && (await prisma.product.count()) === 0) {
    seeded = await seedCatalog(prisma);
  }

  return { createdTables, migrated: !createdTables, seeded, products: await prisma.product.count() };
}
