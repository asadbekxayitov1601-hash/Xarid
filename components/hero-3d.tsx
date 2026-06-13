"use client";

import { useRef, useState } from "react";

export type HeroRow = { emoji: string; name: string; price: string };

// CSS-3D hero: a floating "order card" with satellite product tiles in
// real 3D space (preserve-3d + translateZ), tilting toward the pointer.
// Zero WebGL, zero extra bundle — runs at 60fps inside Telegram's webview.
export function Hero3D({
  rows,
  title,
  deliveredLabel,
  totalLabel,
}: {
  rows: HeroRow[];
  title: string;
  deliveredLabel: string;
  totalLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: -8, ry: 14 });

  function onMove(e: React.PointerEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -8 + py * -14, ry: 14 + px * 18 });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ rx: -8, ry: 14 })}
      className="scene-perspective relative mx-auto h-[420px] w-full max-w-md select-none"
      aria-hidden
    >
      {/* rotating dashed orbit rings */}
      <div className="ring-spin absolute left-1/2 top-1/2 h-[360px] w-[360px] rounded-full border border-dashed border-emerald-500/20" />
      <div className="ring-spin-reverse absolute left-1/2 top-1/2 h-[460px] w-[460px] rounded-full border border-dashed border-amber-500/10" />

      <div
        className="scene-3d absolute inset-0"
        style={{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
      >
        {/* central order card */}
        <div className="depth-2 float-a glass-card absolute left-1/2 top-1/2 w-76 -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5.5 text-text-primary">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold tracking-wide text-emerald-500">{title}</p>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              06:00–10:00
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-bg-secondary/60 border border-border-primary text-base">{r.emoji}</span>
                <span className="flex-1 truncate font-medium text-text-primary">{r.name}</span>
                <span className="font-bold text-text-secondary">{r.price}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-border-primary pt-4">
            <span className="text-xs text-text-secondary font-medium">{totalLabel}</span>
            <span className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-white px-3.5 py-1 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all duration-300">{deliveredLabel} ✓</span>
          </div>
        </div>

        {/* satellite illustration tiles at different 3D depths */}
        <img src="/hero/tomato.svg" alt="" className="depth-3 float-b glass-card absolute left-[3%] top-[10%] h-20 w-20 rounded-3xl p-2.5 border-emerald-500/20 shadow-lg shadow-emerald-500/10" />
        <img src="/hero/meat.svg" alt="" className="depth-1 float-c glass-card absolute right-[0%] top-[4%] h-18 w-18 rounded-2xl p-2 border-amber-500/20 shadow-lg shadow-amber-500/10" />
        <img src="/hero/milk.svg" alt="" className="depth-3 float-c glass-card absolute bottom-[8%] left-[8%] h-18 w-18 rounded-2xl p-2 border-emerald-500/20 shadow-lg shadow-emerald-500/10" />
        <img src="/hero/rice.svg" alt="" className="depth-2 float-b glass-card absolute bottom-[3%] right-[6%] h-20 w-20 rounded-3xl p-2.5 border-amber-500/20 shadow-lg shadow-amber-500/10" />
        <img src="/hero/onion.svg" alt="" className="depth-1 float-a glass-card absolute right-[16%] top-[44%] h-16 w-16 rounded-2xl p-2 border-emerald-500/20 shadow-lg shadow-emerald-500/10" />
        <img src="/hero/tea.svg" alt="" className="depth-2 float-a glass-card absolute left-[-4%] top-[46%] h-16 w-16 rounded-2xl p-2 border-amber-500/20 shadow-lg shadow-amber-500/10" />
      </div>
    </div>
  );
}
