"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Package, Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t, unitLabel } from "@/lib/i18n";
import { addMyOffer } from "@/app/supplier/actions";

type WebProduct = {
  id: string;
  nameUz: string;
  nameRu: string;
  unit: string;
};

export function ProductUploadForm({
  locale,
  products,
}: {
  locale: Locale;
  products: WebProduct[];
}) {
  const [busy, setBusy] = useState(false);

  const localized = (p: WebProduct) =>
    (locale === "ru" ? p.nameRu : p.nameUz) || p.nameUz;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/supplier"
          className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft size={14} aria-hidden />
          {t(locale, "product_new_back")}
        </Link>
        <h1
          className="text-2xl sm:text-3xl font-extrabold text-text-primary"
          style={{ fontFamily: "var(--font-display, Inter)" }}
        >
          {t(locale, "product_new_title")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t(locale, "product_new_subtitle")}
        </p>
      </header>

      {products.length === 0 ? (
        <section
          className="glass-card rounded-3xl p-8 text-center"
          role="status"
        >
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
            style={{
              background: "var(--accent-glow)",
              color: "var(--accent)",
            }}
            aria-hidden
          >
            <Package size={26} />
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            {t(locale, "product_new_empty")}
          </p>
        </section>
      ) : (
        <form
          action={async (fd) => {
            setBusy(true);
            try {
              await addMyOffer(fd);
              window.location.href = "/supplier";
            } finally {
              setBusy(false);
            }
          }}
          className="glass-card rounded-2xl p-5 sm:p-6 space-y-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">
              {t(locale, "product_new_pick")}
            </span>
            <select
              name="productId"
              required
              className="glass-input rounded-xl px-3 py-2.5 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {localized(p)} / {unitLabel(locale, p.unit)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">
              {t(locale, "product_new_cost")}
            </span>
            <input
              name="costPrice"
              type="number"
              inputMode="numeric"
              min={1}
              required
              className="glass-input rounded-xl px-3 py-2.5 text-sm tabular-nums"
            />
            <span className="text-xs text-text-secondary">
              {t(locale, "product_new_help")}
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="glow-button inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "var(--bg-primary)",
              fontFamily: "var(--font-display, Inter)",
            }}
          >
            <Plus size={14} aria-hidden />
            {busy ? t(locale, "common_loading") : t(locale, "product_new_submit")}
          </button>
        </form>
      )}
    </div>
  );
}
