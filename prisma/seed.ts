import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "../lib/seed";

const prisma = new PrismaClient();

seedCatalog(prisma)
  .then((r) => console.log(`Seeded ${r.products} products, ${r.suppliers} suppliers.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
