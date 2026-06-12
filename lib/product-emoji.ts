// Product thumbnails without photos: an emoji per SKU, matched by name
// keywords with a per-category fallback. Cheap, fast, and surprisingly
// effective for a produce catalog.

const KEYWORDS: [RegExp, string][] = [
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
  [/mol go'shti|говядин|qiyma|фарш/i, "🥩"],
  [/qo'y|баранин|dumba|курдюч/i, "🍖"],
  [/tovuq|куриц|filesi|филе/i, "🍗"],
  [/sut|молоко/i, "🥛"],
  [/qaymoq|сметан/i, "🥣"],
  [/tvorog|творог/i, "🫕"],
  [/pishloq|сыр/i, "🧀"],
  [/tuxum|яйц/i, "🥚"],
  [/sariyog|масло сливоч/i, "🧈"],
  [/guruch|рис/i, "🍚"],
  [/un |мука|^un$/i, "🌾"],
  [/yog'i|масло/i, "🫗"],
  [/shakar|сахар/i, "🍬"],
  [/tuz|соль/i, "🧂"],
  [/makaron|макарон/i, "🍝"],
  [/choy|чай/i, "🍵"],
  [/suv|вода/i, "💧"],
];

const CATEGORY_FALLBACK: Record<string, string> = {
  Sabzavotlar: "🥬",
  "Go'sht": "🥩",
  "Sut mahsulotlari": "🥛",
  "Quruq mahsulotlar": "🌾",
  Ichimliklar: "🍵",
};

export function productEmoji(name: string, category: string): string {
  for (const [re, emoji] of KEYWORDS) {
    if (re.test(name)) return emoji;
  }
  return CATEGORY_FALLBACK[category] ?? "🧺";
}
