"use client";

import Link from "next/link";
import { BarChart3, Coins, Package, Trophy, Users } from "lucide-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { Locale } from "@/lib/i18n";
import { t, uzs } from "@/lib/i18n";
import { StatTile } from "./StatTile";
import { RevenueLineChart, type RevenueLinePoint } from "./RevenueLineChart";
import { ProductPieChart, type PieSlice } from "./ProductPieChart";

export type AnalyticsDashboardProps = {
  locale: Locale;
  totalRevenue: number;
  totalUnits: number;
  activeCustomers: number;
  topProduct: { nameUz: string; nameRu: string; revenue: number } | null;
  daily: RevenueLinePoint[];
  share: PieSlice[];
};

function localizedProductName(
  locale: Locale,
  p: { nameUz: string; nameRu: string }
) {
  if (locale === "ru") return p.nameRu || p.nameUz;
  if (locale === "en") return p.nameUz; // No English product names in dataset.
  return p.nameUz;
}

export function AnalyticsDashboard(props: AnalyticsDashboardProps) {
  const {
    locale,
    totalRevenue,
    totalUnits,
    activeCustomers,
    topProduct,
    daily,
    share,
  } = props;

  const hasData = totalRevenue > 0 || totalUnits > 0;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-text-primary"
            style={{ fontFamily: "var(--font-display, Inter)" }}
          >
            {t(locale, "analytics_title")}
          </h1>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: "var(--status-info-bg)",
              color: "var(--status-info)",
            }}
          >
            <BarChart3 size={12} aria-hidden />
            {t(locale, "analytics_range_30d")}
          </span>
        </div>
        <p className="text-sm text-text-secondary">{t(locale, "analytics_subtitle")}</p>
      </header>

      {!hasData ? (
        <ScrollReveal animation="fade-up">
          <section className="glass-card rounded-3xl p-8 sm:p-12 text-center">
            <div
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
              style={{
                background: "var(--accent-glow)",
                color: "var(--accent)",
                boxShadow: "var(--shadow-glow-accent)",
              }}
              aria-hidden
            >
              <BarChart3 size={26} />
            </div>
            <h2
              className="mt-5 text-xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-display, Inter)" }}
            >
              {t(locale, "analytics_empty_title")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              {t(locale, "analytics_empty_body")}
            </p>
            <Link
              href="/supplier"
              className="glow-button mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
              style={{
                background: "var(--accent)",
                color: "var(--on-accent)",
              }}
            >
              <Package size={14} aria-hidden />
              {t(locale, "analytics_empty_cta")}
            </Link>
          </section>
        </ScrollReveal>
      ) : (
        <>
          {/* Stat tiles row */}
          <ScrollReveal animation="fade-up">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                label={t(locale, "stat_revenue_30d")}
                value={uzs(locale, totalRevenue)}
                tone="accent"
                icon={<Coins size={18} />}
              />
              <StatTile
                label={t(locale, "stat_units_sold")}
                value={new Intl.NumberFormat("ru-RU").format(totalUnits)}
                tone="accent-2"
                icon={<Package size={18} />}
              />
              <StatTile
                label={t(locale, "stat_top_product")}
                value={
                  topProduct
                    ? localizedProductName(locale, topProduct)
                    : t(locale, "stat_no_top_product")
                }
                hint={topProduct ? uzs(locale, topProduct.revenue) : undefined}
                tone="accent-3"
                icon={<Trophy size={18} />}
              />
              <StatTile
                label={t(locale, "stat_active_customers")}
                value={String(activeCustomers)}
                tone="accent"
                icon={<Users size={18} />}
              />
            </section>
          </ScrollReveal>

          {/* Charts row */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ScrollReveal animation="fade-up" delay={80} className="lg:col-span-2">
              <article className="glass-card rounded-2xl p-5 h-full">
                <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2
                      className="text-base font-bold text-text-primary"
                      style={{ fontFamily: "var(--font-display, Inter)" }}
                    >
                      {t(locale, "chart_income_title")}
                    </h2>
                    <p className="text-xs text-text-secondary">
                      {t(locale, "chart_income_subtitle")}
                    </p>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {t(locale, "chart_legend_revenue")}
                    <span
                      className="ml-2 inline-block h-2 w-4 rounded-full align-middle"
                      style={{ background: "var(--accent)" }}
                      aria-hidden
                    />
                  </span>
                </header>
                <RevenueLineChart data={daily} locale={locale} />
              </article>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={160}>
              <article className="glass-card rounded-2xl p-5 h-full">
                <header className="mb-3">
                  <h2
                    className="text-base font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-display, Inter)" }}
                  >
                    {t(locale, "chart_share_title")}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    {t(locale, "chart_share_subtitle")}
                  </p>
                </header>
                <ProductPieChart data={share} locale={locale} />
              </article>
            </ScrollReveal>
          </section>
        </>
      )}
    </div>
  );
}
