"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type PieSlice = {
  id: string;
  label: string;
  value: number;
};

// Token-driven palette: emerald (accent), amber (accent-2), sky (accent-3),
// then derived tints. Keeps light/dark mode coherent — see DESIGN_SYSTEM v2.
const PALETTE = [
  "var(--accent)",
  "var(--accent-2)",
  "var(--accent-3)",
  "color-mix(in oklab, var(--accent) 65%, var(--bg-primary))",
  "color-mix(in oklab, var(--accent-2) 65%, var(--bg-primary))",
  "color-mix(in oklab, var(--accent-3) 65%, var(--bg-primary))",
  "var(--text-secondary)",
];

export function ProductPieChart({
  data,
  locale,
}: {
  data: PieSlice[];
  locale: Locale;
}) {
  const formatNumber = (n: number) =>
    new Intl.NumberFormat("ru-RU").format(Math.round(n));

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="var(--bg-primary)"
            strokeWidth={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--glass-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
              backdropFilter: "blur(12px)",
            }}
            itemStyle={{ color: "var(--text-primary)" }}
            formatter={(value: number | string, name: string) => [
              formatNumber(Number(value)) + " " + t(locale, "sum"),
              name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
