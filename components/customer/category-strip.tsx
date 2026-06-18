"use client";

import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export type StripCategory = {
  id: string;
  emoji: string;
  label: string;
};

// CategoryStrip
// -------------
// Horizontal pill row of categories with a subtle scroll-driven parallax that
// shifts the strip a few pixels in the opposite direction as the user scrolls
// the catalog. The strip remains fully interactive — parallax never moves the
// hit area more than 6px so taps stay reliable on the iPhone-SE viewport. The
// movement is disabled automatically by the @media (prefers-reduced-motion)
// block in app/globals.css (we honour it via a matchMedia check).
export function CategoryStrip({
  categories,
  active,
  onChange,
  locale,
}: {
  categories: StripCategory[];
  active: string | null;
  onChange: (id: string | null) => void;
  locale: Locale;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    function onScroll() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      // Stronger response when the strip is near the top of the viewport.
      const offset = Math.max(-1, Math.min(1, -rect.top / 200));
      setParallax(offset * 6);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      className="flex gap-2 mb-8 overflow-x-auto pb-2"
      style={{
        scrollbarWidth: "none",
        transform: `translate3d(${parallax}px, 0, 0)`,
        transition: "transform 400ms var(--ease-glide, cubic-bezier(0.25,0.8,0.25,1))",
        willChange: "transform",
      }}
      role="tablist"
      aria-label={t(locale, "all")}
    >
      <button
        role="tab"
        aria-selected={!active}
        onClick={() => onChange(null)}
        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
        style={{
          background: !active ? "var(--accent)" : "var(--glass-bg)",
          color: !active ? "var(--on-accent)" : "var(--text-secondary)",
          border: "1px solid var(--glass-border)",
          boxShadow: !active ? "var(--shadow-glow-accent, 0 0 16px rgba(89,199,73,0.35))" : "none",
          fontFamily: "var(--font-display, Outfit), sans-serif",
          backdropFilter: "blur(16px)",
        }}
      >
        {t(locale, "all")}
      </button>
      {categories.map((cat) => {
        const selected = active === cat.id;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(cat.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer"
            style={{
              background: selected ? "var(--accent)" : "var(--glass-bg)",
              color: selected ? "var(--on-accent)" : "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
              boxShadow: selected
                ? "var(--shadow-glow-accent, 0 0 16px rgba(89,199,73,0.35))"
                : "none",
              fontFamily: "var(--font-display, Outfit), sans-serif",
              backdropFilter: "blur(16px)",
            }}
          >
            <span aria-hidden="true">{cat.emoji}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
