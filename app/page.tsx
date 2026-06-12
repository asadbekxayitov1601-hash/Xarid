import Link from "next/link";
import { LeadForm } from "@/components/lead-form";
import { Hero3D } from "@/components/hero-3d";
import { Reveal } from "@/components/reveal";
import { TiltCard } from "@/components/tilt-card";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function LandingPage() {
  const locale = await getLocale();
  const ru = locale === "ru";

  const heroRows = ru
    ? [
        { emoji: "🧅", name: "Лук репчатый · 10 кг", price: "43 000" },
        { emoji: "🥩", name: "Говядина · 8 кг", price: "813 000" },
        { emoji: "🍚", name: "Рис лазер · 15 кг", price: "257 000" },
      ]
    : [
        { emoji: "🧅", name: "Piyoz · 10 kg", price: "43 000" },
        { emoji: "🥩", name: "Mol go'shti · 8 kg", price: "813 000" },
        { emoji: "🍚", name: "Guruch lazer · 15 kg", price: "257 000" },
      ];

  const stats = [
    { k: "22:00", v: t(locale, "stat1") },
    { k: "06–10", v: t(locale, "stat2") },
    { k: "1", v: t(locale, "stat3") },
    { k: "0 " + t(locale, "sum"), v: t(locale, "stat4") },
  ];

  const steps = [
    { icon: "🌙", title: t(locale, "step1_title"), text: t(locale, "step1_text") },
    { icon: "✅", title: t(locale, "step2_title"), text: t(locale, "step2_text") },
    { icon: "🚚", title: t(locale, "step3_title"), text: t(locale, "step3_text") },
  ];

  const categories = ru
    ? [
        { emoji: "🥬", name: "Овощи" },
        { emoji: "🥩", name: "Мясо" },
        { emoji: "🥛", name: "Молочные" },
        { emoji: "🌾", name: "Бакалея" },
        { emoji: "🍵", name: "Напитки" },
      ]
    : [
        { emoji: "🥬", name: "Sabzavotlar" },
        { emoji: "🥩", name: "Go'sht" },
        { emoji: "🥛", name: "Sut mahsulotlari" },
        { emoji: "🌾", name: "Quruq mahsulotlar" },
        { emoji: "🍵", name: "Ichimliklar" },
      ];

  return (
    <div className="space-y-16 pb-8">
      {/* ---------- 3D hero (full-bleed dark panel) ---------- */}
      <section className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[2.5rem] bg-stone-950 px-6 pb-10 pt-12 text-white">
        <div className="blob left-[-60px] top-[-40px] h-72 w-72 bg-emerald-600/70" />
        <div className="blob blob-2 right-[-80px] top-[30%] h-80 w-80 bg-teal-500/40" />
        <div className="blob blob-3 bottom-[-60px] left-[30%] h-64 w-64 bg-amber-500/30" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {t(locale, "hero_badge")}
          </span>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t(locale, "hero_title_pre")}{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
              {t(locale, "hero_title_accent")}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-stone-300">{t(locale, "hero_text")}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="rounded-full bg-emerald-500 px-7 py-3 font-bold text-stone-950 shadow-lg shadow-emerald-500/25 transition hover:scale-[1.03] hover:bg-emerald-400"
            >
              {t(locale, "cta_catalog")} →
            </Link>
            <a
              href="#signup"
              className="rounded-full border border-white/20 px-7 py-3 font-semibold text-white/90 backdrop-blur transition hover:bg-white/10"
            >
              {t(locale, "cta_signup")}
            </a>
          </div>

          <Hero3D
            rows={heroRows}
            title={t(locale, "hero_card_title")}
            deliveredLabel={t(locale, "delivered_badge")}
            totalLabel={t(locale, "total")}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.v} className="glass rounded-2xl px-4 py-3 text-center">
                <p className="text-xl font-extrabold text-emerald-300">{s.k}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-white/70">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section>
        <Reveal>
          <h2 className="text-center text-2xl font-extrabold tracking-tight">{t(locale, "how_title")}</h2>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 120}>
              <TiltCard className="h-full rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-2xl">{s.icon}</span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{s.text}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- categories ---------- */}
      <section>
        <Reveal>
          <h2 className="text-center text-2xl font-extrabold tracking-tight">{t(locale, "categories_title")}</h2>
        </Reveal>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {categories.map((c, i) => (
            <Reveal key={c.name} delay={i * 80}>
              <Link
                href="/catalog"
                className="flex items-center gap-2.5 rounded-full border border-stone-200 bg-white px-5 py-2.5 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
              >
                <span className="text-xl">{c.emoji}</span>
                {c.name}
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- signup ---------- */}
      <section id="signup">
        <Reveal>
          <h2 className="text-center text-2xl font-extrabold tracking-tight">{t(locale, "signup_title")}</h2>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Reveal>
            <LeadForm
              locale={locale}
              role="BUYER"
              title={t(locale, "form_buyer_title")}
              text={t(locale, "form_buyer_text")}
            />
          </Reveal>
          <Reveal delay={120}>
            <LeadForm
              locale={locale}
              role="SUPPLIER"
              title={t(locale, "form_supplier_title")}
              text={t(locale, "form_supplier_text")}
            />
          </Reveal>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="-mx-4 rounded-t-[2rem] bg-stone-950 px-6 py-10 text-center text-white">
        <div className="mx-auto flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 font-extrabold text-stone-950">
            X
          </span>
          <span className="text-xl font-extrabold tracking-tight">arid</span>
        </div>
        <p className="mt-2 text-sm text-stone-400">
          {t(locale, "hero_title_pre")} {t(locale, "hero_title_accent")}
        </p>
        <p className="mt-4 text-xs text-stone-500">
          © {new Date().getFullYear()} Xarid · {t(locale, "footer_rights")}
        </p>
      </footer>
    </div>
  );
}
