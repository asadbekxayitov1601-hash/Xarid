"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type RevenueLinePoint = { date: string; revenue: number };

// Income-over-time chart. Token-driven colors so light + dark mode "just work"
// — see docs/DESIGN_SYSTEM.md sect 2.3 (no hex in JSX rule).
export function RevenueLineChart({
  data,
  locale,
}: {
  data: RevenueLinePoint[];
  locale: Locale;
}) {
  const intl = new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "uz-UZ",
    { day: "numeric", month: "short" }
  );
  const formatDate = (iso: string) => intl.format(new Date(iso));
  const formatNumber = (n: number) =>
    new Intl.NumberFormat("ru-RU").format(Math.round(n));

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="var(--text-secondary)"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickMargin={8}
            minTickGap={28}
          />
          <YAxis
            stroke="var(--text-secondary)"
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            tickFormatter={(v: number) => formatNumber(v)}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
              backdropFilter: "blur(12px)",
            }}
            labelStyle={{ color: "var(--text-secondary)", fontSize: 12 }}
            itemStyle={{ color: "var(--text-primary)" }}
            labelFormatter={(v: string | number) => formatDate(String(v))}
            formatter={(value: number | string) => [
              formatNumber(Number(value)) + " " + t(locale, "sum"),
              t(locale, "chart_legend_revenue"),
            ]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              stroke: "var(--accent)",
              strokeWidth: 2,
              fill: "var(--bg-primary)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
