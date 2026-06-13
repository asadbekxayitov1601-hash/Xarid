"use client";

import { useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";

// Pointer-follow radial glow wrapper (21st.dev "spotlight card" idiom, rebuilt
// on tokens). The glow itself lives in the `.spotlight-card::before` CSS rule;
// this component just updates the --mx/--my custom properties on mouse move.
// Mouse-only: touch leaves the glow centered/off (handled by CSS default).
export function SpotlightCard({
  children,
  className = "",
  contentClassName = "",
}: {
  children: React.ReactNode;
  className?: string;
  // Layout classes for the inner content wrapper (e.g. flex flex-col). Use this
  // instead of putting flex on `className`, since children live in the wrapper.
  contentClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} onPointerMove={onMove} className={`spotlight-card ${className}`}>
      {/* content sits above the ::before glow */}
      <div className={`relative z-[1] h-full ${contentClassName}`}>{children}</div>
    </div>
  );
}
