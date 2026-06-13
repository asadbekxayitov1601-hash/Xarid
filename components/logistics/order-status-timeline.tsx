"use client";

import { t, type Locale } from "@/lib/i18n";
import type { GoPhase } from "@/lib/driver";

type Step = { phase: GoPhase; key:
  "go_step_placed" | "go_step_confirmed" | "go_step_assigned" |
  "go_step_picked_up" | "go_step_en_route" | "go_step_delivered" };

const STEPS: Step[] = [
  { phase: "PLACED",     key: "go_step_placed" },
  { phase: "CONFIRMED",  key: "go_step_confirmed" },
  { phase: "ASSIGNED",   key: "go_step_assigned" },
  { phase: "PICKED_UP",  key: "go_step_picked_up" },
  { phase: "EN_ROUTE",   key: "go_step_en_route" },
  { phase: "DELIVERED",  key: "go_step_delivered" },
];

const ORDER: Record<GoPhase, number> = {
  PLACED: 0, CONFIRMED: 1, ASSIGNED: 2, PICKED_UP: 3, EN_ROUTE: 4, DELIVERED: 5, CANCELLED: -1,
};

export function OrderStatusTimeline({ locale, phase }: { locale: Locale; phase: GoPhase }) {
  const currentIdx = ORDER[phase] ?? 0;

  return (
    <ol
      className="relative flex flex-col gap-3 pl-2"
      aria-label={t(locale, "go_timeline_title")}
    >
      {STEPS.map((step, i) => {
        const isCurrent = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <li key={step.phase} className="relative flex items-start gap-3">
            {/* connector */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[7px] top-4 h-full w-px"
                style={{ background: isDone ? "var(--accent)" : "var(--border-color)" }}
              />
            )}
            <span
              aria-hidden
              className={"relative z-10 mt-1 inline-block h-4 w-4 shrink-0 rounded-full " + (isCurrent ? "depth-1" : "")}
              style={{
                background: isDone || isCurrent ? "var(--accent)" : "transparent",
                border: isDone || isCurrent ? "2px solid var(--accent)" : "2px solid var(--border-color)",
                boxShadow: isCurrent ? "var(--shadow-glow-accent)" : "none",
              }}
            />
            <span
              className="text-sm leading-5"
              style={{
                color: isDone || isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: isCurrent ? 700 : 500,
              }}
            >
              {t(locale, step.key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
