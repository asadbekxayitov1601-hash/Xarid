"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";

// Counts a number up when scrolled into view (21st.dev "animated counter").
// `format` lets callers keep uzs()/locale formatting on the rounded value.
// Reduced motion: renders the final value immediately, no tween.
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className = "",
  duration = 1.2,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(() => format(reduce ? value : 0));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(format(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.215, 0.61, 0.355, 1],
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
    // format is intentionally excluded — callers pass inline fns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
    </span>
  );
}
