"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";
import { t, type Locale } from "@/lib/i18n";

// Scroll-scrubbed reading-progress bar. Binds page scroll progress to scaleX
// (the cheapest scrub there is). Mount once near the top of a page; it is fixed
// under the 64px header. Pure decoration -> returns null under reduced motion.
export function ScrollProgress({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // Smooth the scrub a touch so it doesn't feel jittery on trackpads.
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  if (reduce) return null;

  return (
    <motion.div
      role="progressbar"
      aria-label={t(locale, "scroll_progress_aria")}
      className="scroll-progress-bar fixed left-0 right-0 top-16 z-40 h-0.5 origin-left"
      style={{ scaleX }}
    />
  );
}
