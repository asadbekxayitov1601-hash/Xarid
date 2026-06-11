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
        className="h-8 w-8 shrink-0 rounded-full border border-stone-300 font-bold text-stone-700"
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
        className="w-14 rounded-lg border border-stone-300 px-1 py-1 text-center text-sm font-semibold"
        aria-label="Miqdor"
      />
      <span className="w-9 shrink-0 text-xs text-stone-500">{unitLabel}</span>
      <button
        type="button"
        onClick={() => onChange(integer ? qty + step : Math.round((qty + step) * 100) / 100)}
        className="h-8 w-8 shrink-0 rounded-full border border-stone-300 font-bold text-stone-700"
      >
        +
      </button>
    </div>
  );
}
