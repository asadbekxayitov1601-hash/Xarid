"use client";

import { t, type Locale } from "@/lib/i18n";
import type { GoPhase } from "@/lib/driver";

export type RouteStop = {
  id: string;
  shortId: string;
  buyerName: string;
  address: string;
  total: number;
  phase: GoPhase;
};

/**
 * Compact vertical list of stops. Used in two places:
 *   1. Driver "today" panel (no actions, just current/upcoming).
 *   2. Dispatcher "active routes" column.
 */
export function RouteList({
  locale,
  stops,
  emptyLabel,
  onClickItem,
  highlightId,
}: {
  locale: Locale;
  stops: RouteStop[];
  emptyLabel: string;
  onClickItem?: (id: string) => void;
  highlightId?: string;
}) {
  if (stops.length === 0) {
    return (
      <p
        className="rounded-2xl border px-4 py-8 text-center text-sm"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
          color: "var(--text-secondary)",
        }}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {stops.map((s) => {
        const phaseKey = `go_status_${s.phase}` as const;
        const isHighlighted = highlightId === s.id;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onClickItem?.(s.id)}
              className={
                "glass-card group flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all " +
                (isHighlighted ? "depth-1" : "")
              }
              style={{
                boxShadow: isHighlighted ? "var(--shadow-lg), var(--shadow-glow-accent)" : "var(--shadow-md)",
                cursor: onClickItem ? "pointer" : "default",
              }}
            >
              <span
                aria-hidden
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: phaseColor(s.phase), boxShadow: "0 0 8px " + phaseColor(s.phase) }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    #{s.shortId}
                  </span>
                  <span
                    className="truncate text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.buyerName}
                  </span>
                </span>
                <span
                  className="mt-0.5 block truncate text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.address}
                </span>
                <span
                  className="mt-1 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: phaseColor(s.phase), letterSpacing: "0.06em" }}
                >
                  {t(locale, phaseKey)}
                </span>
              </span>
              <span
                className="shrink-0 text-sm font-bold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {new Intl.NumberFormat("ru-RU").format(s.total)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function phaseColor(phase: GoPhase): string {
  switch (phase) {
    case "PLACED":     return "var(--status-warning)";
    case "CONFIRMED":  return "var(--status-info)";
    case "ASSIGNED":   return "var(--status-info)";
    case "PICKED_UP":  return "var(--status-info)";
    case "EN_ROUTE":   return "var(--status-info)";
    case "DELIVERED":  return "var(--status-success)";
    case "CANCELLED":  return "var(--status-danger)";
  }
}
