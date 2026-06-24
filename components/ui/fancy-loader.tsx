"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { t, type Locale } from "@/lib/i18n";

/**
 * FancyLoader — branded route-level loader.
 *
 * A little green delivery van drives in place while speed lines stream past it
 * and the wheels bounce over the road — on-brand for a grocery-delivery app.
 * The real Xarid logo sits above with a soft pulse; wordmark + hint sit below.
 * The van illustration is drawn entirely in CSS and themed through the semantic
 * tokens (--accent, --accent-2, --bg-primary, --text-*) so it tracks light/dark.
 *
 * Reduced motion: when the user prefers reduced motion we freeze the van, its
 * wheels and the speed lines, and fall back to a calm opacity pulse on the logo.
 */
export function FancyLoader({
  locale,
  fullscreen = true,
}: {
  locale: Locale;
  fullscreen?: boolean;
}) {
  const reduce = useReducedMotion();

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
      <div className="flex flex-col items-center gap-9">
        {/* ---- Brand mark ---- */}
        <motion.div
          className="relative h-14 w-14 overflow-hidden rounded-2xl"
          style={{ boxShadow: "var(--shadow-glow-accent)" }}
          animate={
            reduce ? { opacity: [0.55, 1, 0.55] } : { scale: [1, 1.06, 1] }
          }
          transition={{
            repeat: Infinity,
            ease: "easeInOut",
            duration: reduce ? 1.8 : 2.2,
          }}
        >
          <Image
            src="/logo.png"
            alt=""
            aria-hidden
            fill
            sizes="56px"
            className="object-contain"
            priority
          />
        </motion.div>

        {/* ---- Delivery van (CSS illustration) ---- */}
        <div className="grid h-[100px] w-[200px] place-items-center">
          <span
            aria-hidden
            className={reduce ? "van van--still" : "van"}
          />
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
        /* --- Van body: cargo box + cab, drawn with three solid fills --- */
        .van {
          position: relative;
          width: 130px;
          height: 100px;
          background-repeat: no-repeat;
          background-image: linear-gradient(var(--accent-2), var(--accent-2)),
            linear-gradient(var(--accent), var(--accent)),
            linear-gradient(var(--accent), var(--accent));
          background-size: 80px 70px, 30px 50px, 30px 30px;
          background-position: 0 0, 80px 20px, 100px 40px;
        }
        /* --- Wheels: dark tire + light hub, bouncing over the road --- */
        .van:after {
          content: "";
          position: absolute;
          bottom: 10px;
          left: 12px;
          width: 10px;
          height: 10px;
          background: var(--bg-secondary);
          border-radius: 50%;
          box-sizing: content-box;
          border: 10px solid var(--text-primary);
          box-shadow: 78px 0 0 -10px var(--bg-secondary), 78px 0 var(--text-primary);
          animation: vanWheel 0.75s ease-in infinite alternate;
        }
        /* --- Speed lines streaming past the van --- */
        .van:before {
          content: "";
          position: absolute;
          right: 100%;
          top: 0px;
          height: 70px;
          width: 70px;
          background-image: linear-gradient(var(--accent) 45px, transparent 0),
            linear-gradient(var(--accent) 45px, transparent 0),
            linear-gradient(var(--accent) 45px, transparent 0);
          background-repeat: no-repeat;
          background-size: 30px 4px;
          background-position: 0px 11px, 8px 35px, 0px 60px;
          animation: vanLines 0.75s linear infinite;
        }
        .van--still:after,
        .van--still:before {
          animation: none;
        }

        @keyframes vanWheel {
          0%,
          50%,
          100% {
            transform: translatey(0);
          }
          30%,
          90% {
            transform: translatey(-3px);
          }
        }
        @keyframes vanLines {
          0% {
            background-position: 100px 11px, 115px 35px, 105px 60px;
            opacity: 1;
          }
          50% {
            background-position: 0px 11px, 20px 35px, 5px 60px;
          }
          60% {
            background-position: -30px 11px, 0px 35px, -10px 60px;
          }
          75%,
          100% {
            background-position: -30px 11px, -30px 35px, -30px 60px;
            opacity: 0;
          }
        }

        /* --- Shimmering wordmark --- */
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
          .van:after,
          .van:before {
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
