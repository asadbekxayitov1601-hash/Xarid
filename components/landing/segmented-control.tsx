"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";
import { springSnappy } from "@/lib/motion-presets";

export type Segment = { id: string; label: string };

// Animated segmented tabs (DESIGN_SYSTEM §7.2). A single shared-layout pill
// slides between options. Equal-flex, >=40px tap height (mobile-first).
// Reduced motion: the layout transition becomes instant.
export function SegmentedControl({
  segments,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  segments: Segment[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`glass-card inline-flex items-center gap-1 rounded-full p-1 ${className}`}
    >
      {segments.map((seg) => {
        const active = seg.id === value;
        return (
          <button
            key={seg.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(seg.id)}
            className="relative min-h-10 flex-1 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            style={{ color: active ? "var(--bg-primary)" : "var(--text-secondary)" }}
          >
            {active && (
              <motion.span
                layoutId="seg-active"
                transition={reduce ? { duration: 0 } : springSnappy}
                className="absolute inset-0 -z-[1] rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
            <span className="font-display relative z-[1]">{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
