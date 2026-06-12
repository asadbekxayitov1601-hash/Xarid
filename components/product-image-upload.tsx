"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Camera button: picks a photo, downscales it to 320px JPEG in the browser
// (so uploads stay ~20-40KB even from a 12MP phone camera), posts it.
export function ProductImageUpload({ productId }: { productId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

      const res = await fetch(`/api/products/${productId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (res.ok) router.refresh();
      else alert("Surat yuklanmadi, qayta urinib ko'ring");
    } catch {
      alert("Surat yuklanmadi, qayta urinib ko'ring");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        title="Surat yuklash"
        className="grid h-8 w-8 place-items-center rounded-full border border-stone-300 text-stone-500 transition hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50"
      >
        <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-camera"} text-xs`} />
      </button>
    </>
  );
}
