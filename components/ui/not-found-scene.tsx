"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { t, type Locale } from "@/lib/i18n";

/**
 * NotFoundScene — immersive, on-brand 404 (Agent 4).
 *
 * Ambient emerald/amber blobs drift behind a parallax stage of floating produce
 * tiles (reusing /hero/*.svg + glass-card). A ghost "404" sits at the back
 * plane; the headline + subcopy + two CTAs float in front. The whole stage
 * tilts toward the pointer in real 3D (scene-perspective + translateZ via the
 * depth-* utilities). Mobile-first, fully tokenized, reduced-motion aware.
 */

type Tile = {
  src: string;
  className: string; // position + size + float utility (all token/utility based)
  depth: number; // parallax strength multiplier
};

const TILES: Tile[] = [
  { src: "/hero/tomato.svg", className: "left-[4%] top-[12%] h-16 w-16 sm:h-20 sm:w-20 float-b border-emerald-500/20", depth: 1.4 },
  { src: "/hero/meat.svg", className: "right-[2%] top-[6%] h-14 w-14 sm:h-18 sm:w-18 float-c border-amber-500/20", depth: 1.0 },
  { src: "/hero/milk.svg", className: "bottom-[10%] left-[8%] h-14 w-14 sm:h-18 sm:w-18 float-c border-emerald-500/20", depth: 1.2 },
  { src: "/hero/rice.svg", className: "bottom-[6%] right-[6%] h-16 w-16 sm:h-20 sm:w-20 float-b border-amber-500/20", depth: 1.5 },
  { src: "/hero/onion.svg", className: "right-[16%] top-[40%] h-12 w-12 sm:h-16 sm:w-16 float-a border-emerald-500/20", depth: 0.8 },
  { src: "/hero/tea.svg", className: "left-[-2%] top-[44%] h-12 w-12 sm:h-16 sm:w-16 float-a border-amber-500/20", depth: 0.9 },
];

export function NotFoundScene({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 0, py: 0 });

  function onMove(e: React.PointerEvent) {
    if (reduce) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -10, ry: px * 14, px, py });
  }

  function reset() {
    setTilt({ rx: 0, ry: 0, px: 0, py: 0 });
  }

  return (
    <section className="relative isolate flex min-h-[calc(100vh-8rem)] w-full items-center justify-center overflow-hidden px-6 py-16">
      {/* ---- Ambient blobs (behind everything) ---- */}
      <div
        aria-hidden
        className="blob h-72 w-72 -left-10 top-10"
        style={{ background: "var(--accent-glow)" }}
      />
      <div
        aria-hidden
        className="blob blob-2 h-80 w-80 right-0 bottom-0"
        style={{ background: "var(--accent-2-glow)" }}
      />
      <div
        aria-hidden
        className="blob blob-3 h-64 w-64 left-1/3 top-1/4"
        style={{ background: "var(--accent-3-glow)" }}
      />

      {/* ---- Parallax 3D stage ---- */}
      <div
        ref={stageRef}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="scene-perspective relative z-10 mx-auto w-full max-w-2xl"
      >
        {/* Floating produce tiles + ghost 404 share the tilting 3D plane */}
        <div
          aria-label={t(locale, "nf_scene_aria")}
          role="img"
          className="scene-3d pointer-events-none absolute inset-0 -z-0"
          style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
        >
          {/* Ghost 404 at the back plane */}
          <div
            aria-hidden
            className="depth-neg-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[7rem] font-extrabold leading-none tracking-tighter opacity-[0.07] sm:text-[11rem]"
            style={{ color: "var(--text-primary)" }}
          >
            {t(locale, "nf_code")}
          </div>

          {TILES.map((tile) => (
            <img
              key={tile.src}
              src={tile.src}
              alt=""
              aria-hidden
              className={`glass-card absolute rounded-2xl p-2 shadow-[var(--shadow-lg)] ${tile.className}`}
              style={{
                transform: reduce
                  ? undefined
                  : `translate(${tilt.px * 18 * tile.depth}px, ${tilt.py * 18 * tile.depth}px) translateZ(${tile.depth * 28}px)`,
                transition: "transform 0.35s var(--ease-glide)",
              }}
            />
          ))}
        </div>

        {/* ---- Foreground content ---- */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
          className="relative z-10 mx-auto flex max-w-md flex-col items-center px-2 py-24 text-center sm:py-28"
        >
          {/* Brand mark chip */}
          <span
            className="mb-6 grid h-12 w-12 place-items-center rounded-2xl"
            style={{
              background: "var(--accent)",
              boxShadow: "var(--shadow-glow-accent)",
            }}
          >
            <span className="relative text-xl font-extrabold leading-none text-white">
              X
              <span
                aria-hidden
                className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2"
                style={{
                  background: "var(--accent-2)",
                  borderColor: "var(--bg-primary)",
                }}
              />
            </span>
          </span>

          {/* Foreground 404 code, accent-tinted */}
          <p
            className="text-sm font-bold uppercase tracking-[0.35em]"
            style={{ color: "var(--accent)" }}
          >
            {t(locale, "nf_code")}
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {t(locale, "nf_title")}
          </h1>

          <p className="mt-4 max-w-sm text-base leading-relaxed text-text-secondary">
            {t(locale, "nf_subtitle")}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/catalog"
              className="glow-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              <i className="fa-solid fa-store text-xs" aria-hidden />
              {t(locale, "nf_cta_catalog")}
            </Link>
            <Link
              href="/"
              className="glass-card inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-text-primary transition-colors"
            >
              <i className="fa-solid fa-house text-xs" aria-hidden />
              {t(locale, "nf_cta_home")}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
