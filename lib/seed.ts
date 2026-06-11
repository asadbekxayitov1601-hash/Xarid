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

const SKUS: Sku[] = [
  // Sabzavotlar (vegetables)
  { nameUz: "Piyoz (sariq)", nameRu: "Лук репчатый", category: "Sabzavotlar", unit: "KG", baseCost: 4000 },
  { nameUz: "Kartoshka", nameRu: "Картофель", category: "Sabzavotlar", unit: "KG", baseCost: 6000 },
  { nameUz: "Pomidor", nameRu: "Помидоры", category: "Sabzavotlar", unit: "KG", baseCost: 12000 },
  { nameUz: "Bodring", nameRu: "Огурцы", category: "Sabzavotlar", unit: "KG", baseCost: 10000 },
  { nameUz: "Sabzi", nameRu: "Морковь", category: "Sabzavotlar", unit: "KG", baseCost: 5000 },
  { nameUz: "Karam", nameRu: "Капуста", category: "Sabzavotlar", unit: "KG", baseCost: 4500 },
  { nameUz: "Bulg'or qalampiri", nameRu: "Болгарский перец", category: "Sabzavotlar", unit: "KG", baseCost: 18000 },
  { nameUz: "Baqlajon", nameRu: "Баклажаны", category: "Sabzavotlar", unit: "KG", baseCost: 9000 },
  { nameUz: "Sarimsoq", nameRu: "Чеснок", category: "Sabzavotlar", unit: "KG", baseCost: 25000 },
  { nameUz: "Ko'katlar to'plami", nameRu: "Зелень (набор)", category: "Sabzavotlar", unit: "PIECE", baseCost: 5000 },
  // Go'sht (meat)
  { nameUz: "Mol go'shti (son)", nameRu: "Говядина (задняя часть)", category: "Go'sht", unit: "KG", baseCost: 95000 },
  { nameUz: "Qo'y go'shti", nameRu: "Баранина", category: "Go'sht", unit: "KG", baseCost: 110000 },
  { nameUz: "Tovuq (butun)", nameRu: "Курица (целая)", category: "Go'sht", unit: "KG", baseCost: 38000 },
  { nameUz: "Tovuq filesi", nameRu: "Куриное филе", category: "Go'sht", unit: "KG", baseCost: 52000 },
  { nameUz: "Qiyma (mol)", nameRu: "Фарш говяжий", category: "Go'sht", unit: "KG", baseCost: 85000 },
  { nameUz: "Dumba", nameRu: "Курдючный жир", category: "Go'sht", unit: "KG", baseCost: 70000 },
  // Sut mahsulotlari (dairy)
  { nameUz: "Sut (1L)", nameRu: "Молоко (1л)", category: "Sut mahsulotlari", unit: "PIECE", baseCost: 12000 },
  { nameUz: "Qaymoq (500g)", nameRu: "Сметана (500г)", category: "Sut mahsulotlari", unit: "PIECE", baseCost: 18000 },
  { nameUz: "Tvorog", nameRu: "Творог", category: "Sut mahsulotlari", unit: "KG", baseCost: 35000 },
  { nameUz: "Pishloq (gollandskiy)", nameRu: "Сыр голландский", category: "Sut mahsulotlari", unit: "KG", baseCost: 85000 },
  { nameUz: "Tuxum (30 dona)", nameRu: "Яйца (30 шт)", category: "Sut mahsulotlari", unit: "BLOCK", baseCost: 38000 },
  { nameUz: "Sariyog'", nameRu: "Масло сливочное", category: "Sut mahsulotlari", unit: "KG", baseCost: 95000 },
  // Quruq mahsulotlar (dry goods)
  { nameUz: "Guruch (lazer)", nameRu: "Рис лазер", category: "Quruq mahsulotlar", unit: "KG", baseCost: 16000 },
  { nameUz: "Guruch (devzira)", nameRu: "Рис девзира", category: "Quruq mahsulotlar", unit: "KG", baseCost: 32000 },
  { nameUz: "Un (oliy nav)", nameRu: "Мука высший сорт", category: "Quruq mahsulotlar", unit: "KG", baseCost: 7000 },
  { nameUz: "Paxta yog'i (5L)", nameRu: "Хлопковое масло (5л)", category: "Quruq mahsulotlar", unit: "PIECE", baseCost: 95000 },
  { nameUz: "O'simlik yog'i (5L)", nameRu: "Подсолнечное масло (5л)", category: "Quruq mahsulotlar", unit: "PIECE", baseCost: 85000 },
  { nameUz: "Shakar", nameRu: "Сахар", category: "Quruq mahsulotlar", unit: "KG", baseCost: 12500 },
  { nameUz: "Tuz", nameRu: "Соль", category: "Quruq mahsulotlar", unit: "KG", baseCost: 2500 },
  { nameUz: "Makaron", nameRu: "Макароны", category: "Quruq mahsulotlar", unit: "KG", baseCost: 11000 },
  // Ichimliklar (beverages)
  { nameUz: "Ko'k choy (Samarqand, 80g)", nameRu: "Чай зелёный №95 (80г)", category: "Ichimliklar", unit: "PIECE", baseCost: 9000 },
  { nameUz: "Qora choy (80g)", nameRu: "Чай чёрный (80г)", category: "Ichimliklar", unit: "PIECE", baseCost: 9500 },
  { nameUz: "Mineral suv (1.5L, blok)", nameRu: "Минеральная вода (1.5л, блок)", category: "Ichimliklar", unit: "BLOCK", baseCost: 30000 },
];

const SUPPLIERS = [
  { name: "Chorsu Agro", district: "Olmazor", phone: "+998901112233", categories: ["Sabzavotlar", "Quruq mahsulotlar"], priceFactor: 1.0 },
  { name: "Halol Go'sht Savdo", district: "Chilonzor", phone: "+998902223344", categories: ["Go'sht"], priceFactor: 1.0 },
  { name: "Toshkent Sut", district: "Yunusobod", phone: "+998903334455", categories: ["Sut mahsulotlari", "Ichimliklar"], priceFactor: 1.0 },
  { name: "Farhod Ulgurji", district: "Chilonzor", phone: "+998904445566", categories: ["Sabzavotlar", "Quruq mahsulotlar", "Ichimliklar"], priceFactor: 1.04 },
];

// Round UZS prices to the nearest 100 — nobody quotes 12_437 UZS at a bazaar.
const round100 = (n: number) => Math.round(n / 100) * 100;

/** Seeds the demo catalog. Wipes existing catalog/order data first. */
export async function seedCatalog(prisma: PrismaClient) {
  await prisma.orderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.supplierOffer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.organization.deleteMany({ where: { type: "SUPPLIER" } });

  const products = [];
  for (const [i, sku] of SKUS.entries()) {
    products.push(
      await prisma.product.create({
        data: { nameUz: sku.nameUz, nameRu: sku.nameRu, category: sku.category, unit: sku.unit, sortKey: i },
      })
    );
  }

  for (const s of SUPPLIERS) {
    const supplier = await prisma.organization.create({
      data: { type: "SUPPLIER", name: s.name, district: s.district, phone: s.phone },
    });
    for (const [i, sku] of SKUS.entries()) {
      if (!s.categories.includes(sku.category)) continue;
      const costPrice = round100(sku.baseCost * s.priceFactor);
      await prisma.supplierOffer.create({
        data: {
          supplierId: supplier.id,
          productId: products[i].id,
          costPrice,
          price: round100(costPrice * (1 + TAKE_RATE)),
          available: true,
          minQty: sku.unit === "KG" ? 1 : 0,
        },
      });
    }
  }

  return { products: SKUS.length, suppliers: SUPPLIERS.length };
}
