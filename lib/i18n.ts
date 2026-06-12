export type Locale = "uz" | "ru";

export const LOCALES: Locale[] = ["uz", "ru"];
export const LOCALE_COOKIE = "locale";

const dict = {
  uz: {
    // header
    nav_catalog: "Katalog",
    nav_basket: "Savat",
    nav_orders: "Buyurtmalar",
    // landing
    hero_badge: "Toshkent restoranlari uchun B2B bozor",
    hero_title_pre: "Ertalabki ta'minot —",
    hero_title_accent: "bitta savatda",
    hero_text:
      "Restoran, kafe va choyxonalar uchun: o'nta yetkazib beruvchiga qo'ng'iroq qilish o'rniga, butun buyurtmani bitta ilovada bering. Shaffof narxlar, ertalab soat 10:00 gacha yetkazib berish.",
    hero_card_title: "Ertangi buyurtma",
    delivered_badge: "Yetkazildi",
    stat1: "buyurtma muddati",
    stat2: "yetkazib berish",
    stat3: "savat — butun ta'minot",
    stat4: "birinchi yetkazish",
    how_title: "Qanday ishlaydi?",
    categories_title: "Katalogda nima bor?",
    signup_title: "Boshlash uchun ariza qoldiring",
    footer_rights: "Barcha huquqlar himoyalangan",
    cta_catalog: "Katalogni ochish",
    cta_signup: "Ro'yxatdan o'tish",
    step1_title: "Kechqurun buyurtma",
    step1_text: "Soat 22:00 gacha barcha kerakli mahsulotlarni bitta savatga yig'asiz — sabzavot, go'sht, sut, quruq mahsulotlar.",
    step2_title: "Tasdiqlash",
    step2_text: "Tekshirilgan yetkazib beruvchilar buyurtmani kechasi tasdiqlaydi. Narxlar oldindan ko'rinadi — savdolashish shart emas.",
    step3_title: "Ertalab yetkazib berish",
    step3_text: "Hammasi bitta mashinada, tushlik tayyorgarligidan oldin — soat 10:00 gacha yetkazib beriladi.",
    form_buyer_title: "Restoran yoki kafe uchun",
    form_buyer_text: "Birinchi yetkazib berish — bepul. Telefon raqamingizni qoldiring, biz bog'lanamiz.",
    form_supplier_title: "Yetkazib beruvchi uchun",
    form_supplier_text: "O'nlab restoranlarning buyurtmasi bitta jamlangan ro'yxatda. Haftalik kafolatlangan to'lov.",
    // lead form
    ph_name: "Nomi (masalan: Oqtepa Lavash)",
    ph_phone: "+998 90 123 45 67",
    ph_district: "Tuman (masalan: Chilonzor)",
    btn_send: "Yuborish",
    sending: "Yuborilmoqda...",
    thanks: "Rahmat! Tez orada bog'lanamiz.",
    error_generic: "Xatolik yuz berdi, qayta urinib ko'ring.",
    // catalog
    search_placeholder: "Qidirish: piyoz, guruch, sut...",
    all: "Hammasi",
    add_to_basket: "Savatga",
    cheapest_of: "{n} ta taklifdan eng arzoni",
    basket_bar: "Savat · {n} ta mahsulot",
    // basket
    basket_title: "Savat",
    basket_empty: "Savat bo'sh. Katalogdan mahsulot qo'shing.",
    total: "Jami",
    delivery_title: "Yetkazib berish — ertaga 06:00–10:00",
    ph_org: "Muassasa nomi",
    ph_address: "Manzil (tuman, ko'cha, mo'ljal)",
    pay_note: "To'lov: yetkazib berishda naqd yoki o'tkazma orqali.",
    place_order: "Buyurtma berish",
    // orders
    orders_title: "Buyurtmalar",
    order_placed_banner: "✅ Buyurtma qabul qilindi! Ertaga 06:00–10:00 oralig'ida yetkazib beramiz.",
    orders_empty: "Hozircha buyurtmalar yo'q.",
    go_catalog: "Katalogga o'tish →",
    status_PLACED: "Qabul qilindi",
    status_CONFIRMED: "Tasdiqlandi",
    status_PARTIAL: "Qisman tasdiqlandi",
    status_DELIVERING: "Yo'lda",
    status_DELIVERED: "Yetkazildi",
    status_CANCELLED: "Bekor qilindi",
    pay_with: "To'lash",
    paid: "To'landi",
    reorder: "Qayta buyurtma berish",
    // units
    unit_KG: "kg",
    unit_PIECE: "dona",
    unit_LITER: "litr",
    unit_BLOCK: "blok",
    sum: "so'm",
  },
  ru: {
    nav_catalog: "Каталог",
    nav_basket: "Корзина",
    nav_orders: "Заказы",
    hero_badge: "B2B-маркет для ресторанов Ташкента",
    hero_title_pre: "Утренние закупки —",
    hero_title_accent: "в одной корзине",
    hero_text:
      "Для ресторанов, кафе и чайхан: вместо звонков десяти поставщикам — весь заказ в одном приложении. Прозрачные цены, доставка до 10:00 утра.",
    hero_card_title: "Завтрашний заказ",
    delivered_badge: "Доставлено",
    stat1: "приём заказов до",
    stat2: "доставка",
    stat3: "корзина — все закупки",
    stat4: "первая доставка",
    how_title: "Как это работает",
    categories_title: "Что в каталоге?",
    signup_title: "Оставьте заявку, чтобы начать",
    footer_rights: "Все права защищены",
    cta_catalog: "Открыть каталог",
    cta_signup: "Оставить заявку",
    step1_title: "Заказ вечером",
    step1_text: "До 22:00 собираете всё нужное в одну корзину — овощи, мясо, молочные и бакалею.",
    step2_title: "Подтверждение",
    step2_text: "Проверенные поставщики подтверждают заказ ночью. Цены видны заранее — торговаться не нужно.",
    step3_title: "Доставка утром",
    step3_text: "Всё одной машиной, до обеденной подготовки — доставим до 10:00.",
    form_buyer_title: "Для ресторана или кафе",
    form_buyer_text: "Первая доставка — бесплатно. Оставьте номер телефона, мы свяжемся.",
    form_supplier_title: "Для поставщика",
    form_supplier_text: "Заказы десятков ресторанов в одном сводном списке. Гарантированная еженедельная оплата.",
    ph_name: "Название (например: Oqtepa Lavash)",
    ph_phone: "+998 90 123 45 67",
    ph_district: "Район (например: Чиланзар)",
    btn_send: "Отправить",
    sending: "Отправка...",
    thanks: "Спасибо! Скоро свяжемся.",
    error_generic: "Произошла ошибка, попробуйте ещё раз.",
    search_placeholder: "Поиск: лук, рис, молоко...",
    all: "Все",
    add_to_basket: "В корзину",
    cheapest_of: "лучшая из {n} цен",
    basket_bar: "Корзина · {n} поз.",
    basket_title: "Корзина",
    basket_empty: "Корзина пуста. Добавьте товары из каталога.",
    total: "Итого",
    delivery_title: "Доставка — завтра 06:00–10:00",
    ph_org: "Название заведения",
    ph_address: "Адрес (район, улица, ориентир)",
    pay_note: "Оплата: наличными при доставке или переводом.",
    place_order: "Оформить заказ",
    orders_title: "Заказы",
    order_placed_banner: "✅ Заказ принят! Доставим завтра с 06:00 до 10:00.",
    orders_empty: "Заказов пока нет.",
    go_catalog: "Перейти в каталог →",
    status_PLACED: "Принят",
    status_CONFIRMED: "Подтверждён",
    status_PARTIAL: "Частично подтверждён",
    status_DELIVERING: "В пути",
    status_DELIVERED: "Доставлен",
    status_CANCELLED: "Отменён",
    pay_with: "Оплатить",
    paid: "Оплачен",
    reorder: "Повторить заказ",
    unit_KG: "кг",
    unit_PIECE: "шт",
    unit_LITER: "л",
    unit_BLOCK: "блок",
    sum: "сум",
  },
} as const;

export type MessageKey = keyof (typeof dict)["uz"];

export function t(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  let s: string = dict[locale][key] ?? dict.uz[key];
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function unitLabel(locale: Locale, unit: string): string {
  const key = `unit_${unit}` as MessageKey;
  return dict[locale][key] ? t(locale, key) : unit;
}

export function uzs(locale: Locale, amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " " + t(locale, "sum");
}
