"use client";

import { useEffect, useState } from "react";

// Editable quantity: type a value directly or use the −/+ buttons.
// Commits on blur/Enter; committing 0 (or emptying the field) removes the
// item; values below minQty are clamped up; non-KG units are whole numbers.
export function QtyInput({
  qty,
  minQty,
  integer,
  unitLabel,
  onChange,
}: {
  qty: number;
  minQty: number;
  integer: boolean;
  unitLabel: string;
  onChange: (qty: number) => void;
}) {
  const [text, setText] = useState(String(qty));

  useEffect(() => setText(String(qty)), [qty]);

  function commit() {
    const parsed = parseFloat(text.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onChange(0);
      return;
    }
    let next = integer ? Math.round(parsed) : Math.round(parsed * 100) / 100;
    if (next < minQty) next = minQty;
    setText(String(next));
    onChange(next);
  }

  const step = 1;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, qty - step))}
        className="h-8 w-8 shrink-0 rounded-full border border-border-primary bg-bg-secondary/60 hover:bg-bg-secondary text-text-primary active:scale-90 font-bold transition-all flex items-center justify-center text-sm cursor-pointer"
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-14 rounded-lg border border-border-primary bg-bg-secondary/60 py-1 text-center text-sm font-bold text-text-primary outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
        aria-label="Miqdor"
      />
      <span className="w-9 shrink-0 text-xs font-semibold text-text-secondary pl-1">{unitLabel}</span>
      <button
        type="button"
        onClick={() => onChange(integer ? qty + step : Math.round((qty + step) * 100) / 100)}
        className="h-8 w-8 shrink-0 rounded-full border border-border-primary bg-bg-secondary/60 hover:bg-bg-secondary text-text-primary active:scale-90 font-bold transition-all flex items-center justify-center text-sm cursor-pointer"
      >
        +
      </button>
    </div>
  );
}
