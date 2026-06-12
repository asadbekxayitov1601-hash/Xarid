"use client";

import type { ReactNode } from "react";
import { TiltCard } from "@/components/tilt-card";

// Single analytics stat tile — see docs/DESIGN_SYSTEM.md sect 7.1 (StatTile).
// ImmersiveCard pattern: scene-perspective parent + tilt-card child + number
// at depth-1 so it lifts off the gradient.
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "accent" | "accent-2" | "accent-3" | "danger";
}) {
  const toneVar =
    tone === "accent-2"
      ? "var(--accent-2)"
      : tone === "accent-3"
      ? "var(--accent-3)"
      : tone === "danger"
      ? "var(--status-danger)"
      : "var(--accent)";

  return (
    <div className="scene-perspective">
      <TiltCard className="glass-card rounded-2xl p-5 h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div
              className="text-xs uppercase tracking-wider font-semibold text-text-secondary"
              style={{ fontFamily: "var(--font-display, Inter)" }}
            >
              {label}
            </div>
            <div
              className="mt-2 depth-1 truncate text-2xl sm:text-3xl font-extrabold tabular-nums"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-display, Inter)",
              }}
              title={value}
            >
              {value}
            </div>
            {hint ? (
              <div className="mt-1 text-xs text-text-secondary truncate">{hint}</div>
            ) : null}
          </div>
          {icon ? (
            <div
              className="depth-1 grid h-10 w-10 place-items-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${toneVar} 14%, transparent)`,
                color: toneVar,
                boxShadow: `0 0 18px color-mix(in oklab, ${toneVar} 18%, transparent)`,
              }}
              aria-hidden
            >
              {icon}
            </div>
          ) : null}
        </div>
      </TiltCard>
    </div>
  );
}
