import { getLocale } from "@/lib/locale";
import { BasketClient } from "@/components/basket-client";

export default async function BasketPage() {
  const locale = await getLocale();
  return <BasketClient locale={locale} />;
}
