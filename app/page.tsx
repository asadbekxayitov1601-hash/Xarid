import Link from "next/link";
import { LeadForm } from "@/components/lead-form";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function LandingPage() {
  const locale = await getLocale();

  const steps = [
    { n: "1", title: t(locale, "step1_title"), text: t(locale, "step1_text") },
    { n: "2", title: t(locale, "step2_title"), text: t(locale, "step2_text") },
    { n: "3", title: t(locale, "step3_title"), text: t(locale, "step3_text") },
  ];

  return (
    <div className="space-y-12 py-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          {t(locale, "hero_title_pre")} <span className="text-emerald-700">{t(locale, "hero_title_accent")}</span>
        </h1>
        <p className="mx-auto max-w-xl text-stone-600">{t(locale, "hero_text")}</p>
        <div className="flex justify-center gap-3">
          <Link
            href="/catalog"
            className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            {t(locale, "cta_catalog")}
          </Link>
          <a
            href="#signup"
            className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:bg-stone-100"
          >
            {t(locale, "cta_signup")}
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              {s.n}
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{s.text}</p>
          </div>
        ))}
      </section>

      <section id="signup" className="grid gap-6 sm:grid-cols-2">
        <LeadForm
          locale={locale}
          role="BUYER"
          title={t(locale, "form_buyer_title")}
          text={t(locale, "form_buyer_text")}
        />
        <LeadForm
          locale={locale}
          role="SUPPLIER"
          title={t(locale, "form_supplier_title")}
          text={t(locale, "form_supplier_text")}
        />
      </section>
    </div>
  );
}
