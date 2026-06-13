"use client";

import { t, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  /** Minutes until arrival. null = unknown. Negative or 0 = arriving now. */
  etaMinutes: number | null;
  /** Coarse Xarid Go phase, used to special-case DELIVERED. */
  phase: "PLACED" | "CONFIRMED" | "ASSIGNED" | "PICKED_UP" | "EN_ROUTE" | "DELIVERED" | "CANCELLED";
};

/**
 * Translated ETA chip. Three shapes:
 *   - DELIVERED:        "Delivered"   (success green glow)
 *   - etaMinutes <= 2:  "Arriving"    (warning amber glow)
 *   - etaMinutes > 2:   "{n} min"     (info sky glow, big tabular number)
 *   - null:             "Calculating" (info sky glow, dimmed)
 */
export function EtaPill({ locale, etaMinutes, phase }: Props) {
  if (phase === "DELIVERED") {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide"
        style={{
          background: "var(--status-success-bg)",
          color: "var(--status-success)",
          boxShadow: "var(--shadow-glow-accent)",
          letterSpacing: "0.05em",
        }}
      >
        <span aria-hidden>✓</span>
        {t(locale, "go_eta_delivered")}
      </div>
    );
  }

  if (etaMinutes === null) {
    return (
      <div
        className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold"
        style={{
          background: "var(--status-info-bg)",
          color: "var(--status-info)",
          boxShadow: "var(--shadow-glow-info)",
        }}
      >
        {t(locale, "go_eta_unknown")}
      </div>
    );
  }

  if (etaMinutes <= 2) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide"
        style={{
          background: "var(--status-warning-bg)",
          color: "var(--status-warning)",
          boxShadow: "var(--shadow-glow-accent-2)",
          letterSpacing: "0.05em",
        }}
      >
        <span aria-hidden className="float-c">●</span>
        {t(locale, "go_eta_arriving")}
      </div>
    );
  }

  return (
    <div
      className="inline-flex flex-col items-end rounded-2xl px-4 py-2"
      style={{
        background: "var(--status-info-bg)",
        boxShadow: "var(--shadow-glow-info)",
      }}
    >
      <span
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}
      >
        {t(locale, "go_eta_label")}
      </span>
      <span
        className="text-2xl font-bold leading-none tabular-nums"
        style={{ color: "var(--status-info)" }}
      >
        {t(locale, "go_eta_minutes", { n: etaMinutes })}
      </span>
    </div>
  );
}
