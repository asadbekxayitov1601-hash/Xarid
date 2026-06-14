import type { PrismaClient } from "@prisma/client";

const TAKE_RATE = 0.07; // 7% built into the buyer-facing price

type Sku = {
  nameUz: string;
  nameRu: string;
  category: string;
  unit: string;
  // base wholesale cost in UZS per unit, used to derive per-supplier costPrice
  baseCost: number;
};

// Consumer grocery catalog (B2C pivot). Canonical DB `category` strings are
// stable Latin-Uzbek; localized labels live in components/catalog-client.tsx
// (CATEGORY_MAP), the landing categories array, and lib/product-emoji.ts
// (CATEGORY_FALLBACK). Keep all four in sync — see docs/B2C_PIVOT.md section 5.
//
//   Mevalar           -> Fruits
//   Sabzavotlar       -> Vegetables
//   Sut va tuxum      -> Dairy & Eggs
//   Non               -> Bakery
//   Go'sht            -> Meat
//   Quruq mahsulotlar -> Dry goods / Grains
//   Ichimliklar       -> Drinks
const SKUS: Sku[] = [
  // Mevalar (fruits)
  { nameUz: "Olma", nameRu: "Яблоки", category: "Mevalar", unit: "KG", baseCost: 12000 },
  { nameUz: "Banan", nameRu: "Бананы", category: "Mevalar", unit: "KG", baseCost: 22000 },
  { nameUz: "Tarvuz", nameRu: "Арбуз", category: "Mevalar", unit: "KG", baseCost: 5000 },
  { nameUz: "Qovun", nameRu: "Дыня", category: "Mevalar", unit: "KG", baseCost: 7000 },
  { nameUz: "Uzum", nameRu: "Виноград", category: "Mevalar", unit: "KG", baseCost: 18000 },
  { nameUz: "Apelsin", nameRu: "Апельсины", category: "Mevalar", unit: "KG", baseCost: 20000 },
  { nameUz: "Limon", nameRu: "Лимоны", category: "Mevalar", unit: "KG", baseCost: 24000 },
  { nameUz: "Nok", nameRu: "Груши", category: "Mevalar", unit: "KG", baseCost: 16000 },
  // Sabzavotlar (vegetables)
  { nameUz: "Bodring", nameRu: "Огурцы", category: "Sabzavotlar", unit: "KG", baseCost: 10000 },
  { nameUz: "Pomidor", nameRu: "Помидоры", category: "Sabzavotlar", unit: "KG", baseCost: 12000 },
  { nameUz: "Kartoshka", nameRu: "Картофель", category: "Sabzavotlar", unit: "KG", baseCost: 6000 },
  { nameUz: "Piyoz", nameRu: "Лук репчатый", category: "Sabzavotlar", unit: "KG", baseCost: 4000 },
  { nameUz: "Sabzi", nameRu: "Морковь", category: "Sabzavotlar", unit: "KG", baseCost: 5000 },
  { nameUz: "Sarimsoq", nameRu: "Чеснок", category: "Sabzavotlar", unit: "KG", baseCost: 25000 },
  { nameUz: "Bulg'or qalampiri", nameRu: "Болгарский перец", category: "Sabzavotlar", unit: "KG", baseCost: 18000 },
  { nameUz: "Ko'katlar", nameRu: "Зелень", category: "Sabzavotlar", unit: "PIECE", baseCost: 5000 },
  // Sut va tuxum (dairy & eggs)
  { nameUz: "Sut (1L)", nameRu: "Молоко (1л)", category: "Sut va tuxum", unit: "PIECE", baseCost: 12000 },
  { nameUz: "Kefir (1L)", nameRu: "Кефир (1л)", category: "Sut va tuxum", unit: "PIECE", baseCost: 13000 },
  { nameUz: "Qaymoq (500g)", nameRu: "Сметана (500г)", category: "Sut va tuxum", unit: "PIECE", baseCost: 18000 },
  { nameUz: "Tvorog", nameRu: "Творог", category: "Sut va tuxum", unit: "KG", baseCost: 35000 },
  { nameUz: "Pishloq", nameRu: "Сыр", category: "Sut va tuxum", unit: "KG", baseCost: 85000 },
  { nameUz: "Sariyog'", nameRu: "Масло сливочное", category: "Sut va tuxum", unit: "KG", baseCost: 95000 },
  { nameUz: "Tuxum (10 dona)", nameRu: "Яйца (10 шт)", category: "Sut va tuxum", unit: "BLOCK", baseCost: 16000 },
  { nameUz: "Yogurt", nameRu: "Йогурт", category: "Sut va tuxum", unit: "PIECE", baseCost: 8000 },
  // Non (bakery)
  { nameUz: "Non (patir)", nameRu: "Лепёшка", category: "Non", unit: "PIECE", baseCost: 4000 },
  { nameUz: "Baton non", nameRu: "Батон", category: "Non", unit: "PIECE", baseCost: 5000 },
  { nameUz: "Bulochka", nameRu: "Булочка", category: "Non", unit: "PIECE", baseCost: 3000 },
  { nameUz: "Lavash", nameRu: "Лаваш", category: "Non", unit: "PIECE", baseCost: 4000 },
  // Go'sht (meat)
  { nameUz: "Mol go'shti", nameRu: "Говядина", category: "Go'sht", unit: "KG", baseCost: 95000 },
  { nameUz: "Qo'y go'shti", nameRu: "Баранина", category: "Go'sht", unit: "KG", baseCost: 110000 },
  { nameUz: "Tovuq (butun)", nameRu: "Курица (целая)", category: "Go'sht", unit: "KG", baseCost: 38000 },
  { nameUz: "Tovuq filesi", nameRu: "Куриное филе", category: "Go'sht", unit: "KG", baseCost: 52000 },
  { nameUz: "Qiyma", nameRu: "Фарш", category: "Go'sht", unit: "KG", baseCost: 85000 },
  // Quruq mahsulotlar (dry goods / grains)
  { nameUz: "Un (oliy nav)", nameRu: "Мука высший сорт", category: "Quruq mahsulotlar", unit: "KG", baseCost: 7000 },
  { nameUz: "Guruch (lazer)", nameRu: "Рис лазер", category: "Quruq mahsulotlar", unit: "KG", baseCost: 16000 },
  { nameUz: "Shakar", nameRu: "Сахар", category: "Quruq mahsulotlar", unit: "KG", baseCost: 12500 },
  { nameUz: "Tuz", nameRu: "Соль", category: "Quruq mahsulotlar", unit: "KG", baseCost: 2500 },
  { nameUz: "Makaron", nameRu: "Макароны", category: "Quruq mahsulotlar", unit: "KG", baseCost: 11000 },
  { nameUz: "O'simlik yog'i (1L)", nameRu: "Подсолнечное масло (1л)", category: "Quruq mahsulotlar", unit: "PIECE", baseCost: 22000 },
  // Ichimliklar (drinks)
  { nameUz: "Suv (1.5L)", nameRu: "Вода (1.5л)", category: "Ichimliklar", unit: "PIECE", baseCost: 5000 },
  { nameUz: "Ko'k choy (80g)", nameRu: "Чай зелёный (80г)", category: "Ichimliklar", unit: "PIECE", baseCost: 9000 },
  { nameUz: "Qora choy (80g)", nameRu: "Чай чёрный (80г)", category: "Ichimliklar", unit: "PIECE", baseCost: 9500 },
  { nameUz: "Sharbat (1L)", nameRu: "Сок (1л)", category: "Ichimliklar", unit: "PIECE", baseCost: 14000 },
  { nameUz: "Gazli ichimlik (1.5L)", nameRu: "Газировка (1.5л)", category: "Ichimliklar", unit: "PIECE", baseCost: 12000 },
];

// Fulfilling shops (Yandex-style: a consumer storefront over real shops +
// couriers). Stored as Organization type=SUPPLIER. The cart groups items by
// the shop that fulfils them. Every category is covered by at least one shop
// so every SKU gets >=1 offer (the catalog only shows products with offers).
const SUPPLIERS = [
  {
    name: "Qo'qon Bozor",
    district: "Qo'qon",
    phone: "+998901112233",
    categories: ["Mevalar", "Sabzavotlar", "Go'sht", "Quruq mahsulotlar"],
    priceFactor: 1.0,
  },
  {
    name: "Lavka Fresh",
    district: "Qo'qon",
    phone: "+998902223344",
    categories: ["Mevalar", "Sut va tuxum", "Non", "Ichimliklar"],
    priceFactor: 1.0,
  },
  {
    name: "Oila Market",
    district: "Qo'qon",
    phone: "+998903334455",
    categories: ["Sut va tuxum", "Quruq mahsulotlar", "Ichimliklar", "Non"],
    priceFactor: 1.04,
  },
];

// Round UZS prices to the nearest 100 — nobody quotes 12_437 UZS at a bazaar.
const round100 = (n: number) => Math.round(n / 100) * 100;

/**
 * Seeds the demo grocery catalog. Idempotent and safe to re-run against the
 * live DB: products and supplier shops are upserted by a stable natural key
 * (product by nameUz+category, shop by name), offers by the unique
 * (supplierId, productId) pair. Existing orders are NOT touched — re-running
 * only inserts new SKUs and refreshes prices, never duplicates or wipes data.
 */
export async function seedCatalog(prisma: PrismaClient) {
  // Upsert products by their stable natural key (nameUz + category). Product
  // has no DB unique constraint, so we look up then create/update in app code.
  const productByIndex: { id: string }[] = [];
  for (const [i, sku] of SKUS.entries()) {
    const existing = await prisma.product.findFirst({
      where: { nameUz: sku.nameUz, category: sku.category },
      select: { id: true },
    });
    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: { nameRu: sku.nameRu, unit: sku.unit, sortKey: i },
        select: { id: true },
      });
      productByIndex[i] = updated;
    } else {
      const created = await prisma.product.create({
        data: { nameUz: sku.nameUz, nameRu: sku.nameRu, category: sku.category, unit: sku.unit, sortKey: i },
        select: { id: true },
      });
      productByIndex[i] = created;
    }
  }

  for (const s of SUPPLIERS) {
    // Upsert the fulfilling shop by name (type SUPPLIER). botCode auto-fills on
    // create and is left intact on re-run.
    let supplier = await prisma.organization.findFirst({
      where: { type: "SUPPLIER", name: s.name },
      select: { id: true },
    });
    if (supplier) {
      supplier = await prisma.organization.update({
        where: { id: supplier.id },
        data: { district: s.district, phone: s.phone },
        select: { id: true },
      });
    } else {
      supplier = await prisma.organization.create({
        data: { type: "SUPPLIER", name: s.name, district: s.district, phone: s.phone },
        select: { id: true },
      });
    }

    for (const [i, sku] of SKUS.entries()) {
      if (!s.categories.includes(sku.category)) continue;
      const costPrice = round100(sku.baseCost * s.priceFactor);
      const price = round100(costPrice * (1 + TAKE_RATE));
      const minQty = sku.unit === "KG" ? 1 : 0;
      // Offer has a unique (supplierId, productId) — upsert is duplicate-safe.
      await prisma.supplierOffer.upsert({
        where: { supplierId_productId: { supplierId: supplier.id, productId: productByIndex[i].id } },
        update: { costPrice, price, available: true, minQty },
        create: {
          supplierId: supplier.id,
          productId: productByIndex[i].id,
          costPrice,
          price,
          available: true,
          minQty,
        },
      });
    }
  }

  return { products: SKUS.length, suppliers: SUPPLIERS.length };
}
