"use client";

import { useRef, useState } from "react";

// Admin-side image picker for server-action forms. Picks a photo, downscales it
// to a 320px JPEG data URL in the browser (so uploads stay ~20-40KB even from a
// phone camera), and exposes the result as a hidden input so the surrounding
// server action receives it on submit. Mirrors the seller-side picker
// (components/supplier/NewProductImagePicker) but is uncontrolled + form-native
// and stays in the admin's Uzbek-only chrome.
export function AdminImageField({
  name,
  label = "Surat",
  size = 96,
}: {
  name: string;
  label?: string;
  size?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      setValue(canvas.toDataURL("image/jpeg", 0.78));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name={name} value={value} />
      <input ref={input} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={label}
        className="grid shrink-0 place-items-center overflow-hidden rounded-xl border border-stone-300 bg-stone-50 text-stone-400 transition hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50"
        style={{ width: size, height: size, borderStyle: value ? "solid" : "dashed" }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-camera"}`} />
        )}
      </button>
      <div className="text-xs text-stone-500">
        {value ? (
          <button type="button" onClick={() => setValue("")} className="font-semibold text-stone-600 hover:text-red-600">
            Suratni o'chirish
          </button>
        ) : (
          <span>{label}</span>
        )}
      </div>
    </div>
  );
}
