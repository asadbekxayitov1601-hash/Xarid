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
    { k: "22:00", v: t(locale, "stat1"), icon: "fa-moon" },
    { k: "06–10", v: t(locale, "stat2"), icon: "fa-truck-fast" },
    { k: "1", v: t(locale, "stat3"), icon: "fa-basket-shopping" },
    { k: "0 " + t(locale, "sum"), v: t(locale, "stat4"), icon: "fa-gift" },
  ];

  const steps = [
    { icon: "fa-moon", title: t(locale, "step1_title"), text: t(locale, "step1_text") },
    { icon: "fa-circle-check", title: t(locale, "step2_title"), text: t(locale, "step2_text") },
    { icon: "fa-truck-fast", title: t(locale, "step3_title"), text: t(locale, "step3_text") },
  ];

  const categories = ru
    ? [
        { img: "/hero/tomato.svg", name: "Овощи" },
        { img: "/hero/meat.svg", name: "Мясо" },
        { img: "/hero/milk.svg", name: "Молочные" },
        { img: "/hero/rice.svg", name: "Бакалея" },
        { img: "/hero/tea.svg", name: "Напитки" },
      ]
    : [
        { img: "/hero/tomato.svg", name: "Sabzavotlar" },
        { img: "/hero/meat.svg", name: "Go'sht" },
        { img: "/hero/milk.svg", name: "Sut mahsulotlari" },
        { img: "/hero/rice.svg", name: "Quruq mahsulotlar" },
        { img: "/hero/tea.svg", name: "Ichimliklar" },
      ];

  return (
    <div>
      {/* ---------- 3D hero (full width) ---------- */}
      <section className="relative overflow-hidden bg-stone-950 text-white">
        <div className="blob left-[-60px] top-[-40px] h-80 w-80 bg-emerald-600/70" />
        <div className="blob blob-2 right-[-80px] top-[20%] h-96 w-96 bg-teal-500/40" />
        <div className="blob blob-3 bottom-[-80px] left-[35%] h-72 w-72 bg-amber-500/30" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-4 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {t(locale, "hero_badge")}
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
              {t(locale, "hero_title_pre")}{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                {t(locale, "hero_title_accent")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-300">{t(locale, "hero_text")}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="rounded-full bg-emerald-500 px-7 py-3.5 font-bold text-stone-950 shadow-lg shadow-emerald-500/25 transition hover:scale-[1.03] hover:bg-emerald-400"
              >
                <i className="fa-solid fa-store mr-2" />
                {t(locale, "cta_catalog")}
              </Link>
              <a
                href="#signup"
                className="rounded-full border border-white/20 px-7 py-3.5 font-semibold text-white/90 backdrop-blur transition hover:bg-white/10"
              >
                <i className="fa-solid fa-pen-to-square mr-2" />
                {t(locale, "cta_signup")}
              </a>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.v} className="glass rounded-2xl px-3 py-3 text-center">
                  <i className={`fa-solid ${s.icon} text-sm text-amber-300`} />
                  <p className="mt-1 text-lg font-extrabold text-emerald-300">{s.k}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-white/70">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          <Hero3D
            rows={heroRows}
            title={t(locale, "hero_card_title")}
            deliveredLabel={t(locale, "delivered_badge")}
            totalLabel={t(locale, "total")}
          />
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight">{t(locale, "how_title")}</h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 120}>
              <TiltCard className="h-full rounded-3xl border border-stone-200 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-lg text-white shadow-lg shadow-emerald-600/25">
                    <i className={`fa-solid ${s.icon}`} />
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{s.text}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- categories ---------- */}
      <section className="w-full bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold tracking-tight">{t(locale, "categories_title")}</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {categories.map((c, i) => (
              <Reveal key={c.name} delay={i * 80}>
                <Link
                  href="/catalog"
                  className="card-3d flex flex-col items-center gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-5"
                >
                  <img src={c.img} alt="" className="h-20 w-20 rounded-2xl" />
                  <span className="text-center text-sm font-bold">{c.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- signup ---------- */}
      <section id="signup" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight">{t(locale, "signup_title")}</h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
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
      <footer className="w-full bg-stone-950 px-6 py-12 text-center text-white">
        <div className="mx-auto flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 font-extrabold text-stone-950">
            X
          </span>
          <span className="text-xl font-extrabold tracking-tight">arid</span>
        </div>
        <p className="mt-2 text-sm text-stone-400">
          {t(locale, "hero_title_pre")} {t(locale, "hero_title_accent")}
        </p>
        <p className="mt-5 text-xs text-stone-500">
          © {new Date().getFullYear()} Xarid · {t(locale, "footer_rights")}
        </p>
      </footer>
    </div>
  );
}
