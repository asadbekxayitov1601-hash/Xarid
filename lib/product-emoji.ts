// Product thumbnails without photos: an emoji per SKU, matched by name
// keywords with a per-category fallback. Cheap, fast, and surprisingly
// effective for a grocery catalog.
//
// Order matters: more specific patterns come before broader ones (e.g.
// "ko'k choy" before a bare "choy", "sariyog'" before "yog'i").

const KEYWORDS: [RegExp, string][] = [
  // Fruits (Mevalar)
  [/olma|яблок/i, "🍎"],
  [/banan|банан/i, "🍌"],
  [/tarvuz|арбуз/i, "🍉"],
  [/qovun|дын/i, "🍈"],
  [/uzum|виноград/i, "🍇"],
  [/apelsin|апельсин/i, "🍊"],
  [/limon|лимон/i, "🍋"],
  [/nok|груш/i, "🍐"],
  // Vegetables (Sabzavotlar)
  [/piyoz|лук/i, "🧅"],
  [/kartoshka|картоф/i, "🥔"],
  [/pomidor|помидор/i, "🍅"],
  [/bodring|огур/i, "🥒"],
  [/sabzi|морков/i, "🥕"],
  [/karam|капуст/i, "🥬"],
  [/qalampir|перец/i, "🫑"],
  [/baqlajon|баклажан/i, "🍆"],
  [/sarimsoq|чеснок/i, "🧄"],
  [/ko'kat|зелень/i, "🌿"],
  // Meat (Go'sht)
  [/mol go'shti|говядин|qiyma|фарш/i, "🥩"],
  [/qo'y|баранин|dumba|курдюч/i, "🍖"],
  [/tovuq|куриц|filesi|филе/i, "🍗"],
  // Dairy & eggs (Sut va tuxum)
  [/tuxum|яйц/i, "🥚"],
  [/kefir|кефир/i, "🥛"],
  [/yogurt|йогурт/i, "🥛"],
  [/sariyog|масло сливоч/i, "🧈"],
  [/qaymoq|сметан/i, "🥣"],
  [/tvorog|творог/i, "🫕"],
  [/pishloq|сыр/i, "🧀"],
  [/sut|молоко/i, "🥛"],
  // Bakery (Non)
  [/non|лепёшк|baton|батон|bulochka|булочк|lavash|лаваш|хлеб/i, "🍞"],
  // Dry goods / grains (Quruq mahsulotlar)
  [/guruch|рис/i, "🍚"],
  [/makaron|макарон/i, "🍝"],
  [/un |мука|^un$/i, "🌾"],
  [/shakar|сахар/i, "🍬"],
  [/tuz|соль/i, "🧂"],
  [/yog'i|масло/i, "🫗"],
  // Drinks (Ichimliklar)
  [/choy|чай/i, "🍵"],
  [/sharbat|сок/i, "🧃"],
  [/gazli|газиров/i, "🥤"],
  [/suv|вода/i, "💧"],
];

const CATEGORY_FALLBACK: Record<string, string> = {
  Mevalar: "🍎",
  Sabzavotlar: "🥬",
  "Sut va tuxum": "🥛",
  Non: "🍞",
  "Go'sht": "🥩",
  "Quruq mahsulotlar": "🌾",
  Ichimliklar: "🧃",
};

export function productEmoji(name: string, category: string): string {
  for (const [re, emoji] of KEYWORDS) {
    if (re.test(name)) return emoji;
  }
  return CATEGORY_FALLBACK[category] ?? "🧺";
}
