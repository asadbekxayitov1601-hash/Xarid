"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

// Pre-creation image picker for the "add product" card. Unlike
// components/product-image-upload.tsx (which POSTs a photo to an EXISTING
// product's endpoint), this one only downscales the chosen photo to a compact
// JPEG data URL and hands it back via onChange so the create-product server
// action can persist it on the new Product in a single submit. No network call.
export function NewProductImagePicker({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
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
      onChange(canvas.toDataURL("image/jpeg", 0.78));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={t(locale, "product_new_image")}
        className="group relative grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-border-primary bg-bg-secondary/40 transition disabled:opacity-50"
        style={{ borderStyle: value ? "solid" : "dashed" }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={t(locale, "product_new_image")}
            className="h-full w-full object-cover"
          />
        ) : busy ? (
          <Loader2
            size={22}
            className="animate-spin motion-reduce:animate-none"
            style={{ color: "var(--accent)" }}
            aria-hidden
          />
        ) : (
          <ImagePlus size={26} style={{ color: "var(--accent)" }} aria-hidden />
        )}
      </button>

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <X size={12} aria-hidden />
          {t(locale, "product_new_image_remove")}
        </button>
      ) : (
        <span className="text-xs text-text-secondary">
          {t(locale, "product_new_image_hint")}
        </span>
      )}
    </div>
  );
}
