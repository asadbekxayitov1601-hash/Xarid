"use client";

import { motion, useReducedMotion } from "motion/react";
import { t, type Locale } from "@/lib/i18n";

/**
 * FancyLoader — branded route-level loader (Agent 4).
 *
 * Not a plain spinner: the Xarid mark (emerald tile + amber dot) sits inside a
 * morphing conic gradient ring, with three produce dots orbiting it on a stagger.
 * A soft shimmer sweeps the brand wordmark. Everything is themed through the
 * semantic CSS tokens (--accent, --accent-2, --accent-3, --bg-*, --text-*).
 *
 * Reduced motion: when the user prefers reduced motion we drop every spin /
 * orbit / shimmer and fall back to a calm opacity pulse on the mark only.
 */
export function FancyLoader({
  locale,
  fullscreen = true,
}: {
  locale: Locale;
  fullscreen?: boolean;
}) {
  const reduce = useReducedMotion();

  // Three orbiting produce dots, evenly spaced, each its own token color.
  const dots = [
    { color: "var(--accent)", delay: 0 },
    { color: "var(--accent-2)", delay: 0.25 },
    { color: "var(--accent-3)", delay: 0.5 },
  ];

  return (
    <div
      role="status"
      aria-label={t(locale, "loader_aria")}
      aria-live="polite"
      className={
        fullscreen
          ? "grid min-h-[60vh] w-full place-items-center px-6 py-16"
          : "grid w-full place-items-center px-6 py-12"
      }
    >
      <div className="flex flex-col items-center gap-7">
        {/* ---- Orbit stage ---- */}
        <div className="relative h-32 w-32 [transform-style:preserve-3d]">
          {/* Morphing conic gradient ring */}
          <motion.div
            aria-hidden
            className="loader-ring absolute inset-0 rounded-full"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={
              reduce
                ? undefined
                : { repeat: Infinity, ease: "linear", duration: 3.2 }
            }
          />
          {/* Inner mask so the ring reads as a thick stroke, not a disc */}
          <div className="loader-ring-mask absolute inset-[6px] rounded-full" />

          {/* Orbiting produce dots */}
          {!reduce &&
            dots.map((d, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: d.color, boxShadow: `0 0 12px ${d.color}` }}
                animate={{
                  rotate: 360,
                  x: [0, 54, 0, -54, 0],
                  y: [-54, 0, 54, 0, -54],
                }}
                transition={{
                  repeat: Infinity,
                  ease: "easeInOut",
                  duration: 2.6,
                  delay: d.delay,
                }}
              />
            ))}

          {/* ---- Brand mark (center) ---- */}
          <motion.div
            className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl"
            style={{
              background: "var(--accent)",
              boxShadow: "var(--shadow-glow-accent)",
            }}
            animate={
              reduce
                ? { opacity: [0.55, 1, 0.55] }
                : { scale: [1, 1.06, 1] }
            }
            transition={{
              repeat: Infinity,
              ease: "easeInOut",
              duration: reduce ? 1.8 : 2.2,
            }}
          >
            <span className="text-2xl font-extrabold leading-none text-white">
              X
            </span>
            {/* amber accent dot — the brand's signature */}
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2"
              style={{
                background: "var(--accent-2)",
                borderColor: "var(--bg-primary)",
              }}
            />
          </motion.div>
        </div>

        {/* ---- Wordmark + label ---- */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="loader-wordmark text-lg font-extrabold tracking-tight text-text-primary">
            {t(locale, "loader_brand")}
          </span>
          <span className="text-sm font-medium text-text-secondary">
            {t(locale, "loader_hint")}
          </span>
        </div>
      </div>

      {/* Visually-hidden text for assistive tech */}
      <span className="sr-only">{t(locale, "loader_label")}</span>

      <style jsx>{`
        .loader-ring {
          background: conic-gradient(
            from 0deg,
            var(--accent) 0deg,
            var(--accent-3) 120deg,
            var(--accent-2) 240deg,
            var(--accent) 360deg
          );
          opacity: 0.9;
          filter: blur(0.5px);
        }
        .loader-ring-mask {
          background: var(--bg-primary);
        }
        .loader-wordmark {
          position: relative;
          background: linear-gradient(
            100deg,
            var(--text-primary) 0%,
            var(--text-primary) 40%,
            var(--accent) 50%,
            var(--text-primary) 60%,
            var(--text-primary) 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: loader-shimmer 2.4s ease-in-out infinite;
        }
        @keyframes loader-shimmer {
          0% {
            background-position: 140% 0;
          }
          100% {
            background-position: -40% 0;
          }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .loader-ring {
            animation: none !important;
          }
          .loader-wordmark {
            animation: none;
            -webkit-text-fill-color: var(--text-primary);
            background: none;
          }
        }
      `}</style>
    </div>
  );
}
