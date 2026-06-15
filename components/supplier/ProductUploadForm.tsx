"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import type { Locale, MessageKey } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { createMyProduct } from "@/app/supplier/actions";
import { NewProductImagePicker } from "@/components/supplier/NewProductImagePicker";

// Canonical Product.category strings (see lib/seed.ts) paired with their
// translated label key (b2c_cat_* in lib/i18n.ts). Keeping the value = the DB
// string means the catalog's category filter groups new products correctly.
const CATEGORIES: { value: string; labelKey: MessageKey }[] = [
  { value: "Mevalar", labelKey: "b2c_cat_mevalar" },
  { value: "Sabzavotlar", labelKey: "b2c_cat_sabzavotlar" },
  { value: "Sut va tuxum", labelKey: "b2c_cat_sut_tuxum" },
  { value: "Non", labelKey: "b2c_cat_non" },
  { value: "Go'sht", labelKey: "b2c_cat_gosht" },
  { value: "Quruq mahsulotlar", labelKey: "b2c_cat_quruq" },
  { value: "Ichimliklar", labelKey: "b2c_cat_ichimliklar" },
  { value: "Sut mahsulotlari", labelKey: "b2c_cat_sut" },
];

const UNITS: { value: string; labelKey: MessageKey }[] = [
  { value: "KG", labelKey: "unit_KG" },
  { value: "PIECE", labelKey: "unit_PIECE" },
  { value: "LITER", labelKey: "unit_LITER" },
  { value: "BLOCK", labelKey: "unit_BLOCK" },
];

export function ProductUploadForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("imageUrl", imageUrl);
      const res = await createMyProduct(fd);
      if (res.ok) {
        router.push("/supplier");
        router.refresh();
      } else {
        setError(
          res.error === "name"
            ? t(locale, "product_new_err_name")
            : t(locale, "product_new_err_price")
        );
        setBusy(false);
      }
    } catch {
      setError(t(locale, "error_generic"));
      setBusy(false);
    }
  }

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

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="glass-card rounded-3xl p-5 sm:p-7 space-y-6"
      >
        {/* Image at the top of the card */}
        <NewProductImagePicker
          locale={locale}
          value={imageUrl}
          onChange={setImageUrl}
        />

        {/* Name */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-secondary">
            {t(locale, "product_new_name")}
          </span>
          <input
            name="nameUz"
            required
            maxLength={80}
            placeholder={t(locale, "product_new_name_ph")}
            className="glass-input rounded-xl px-3 py-2.5 text-sm"
          />
        </label>

        {/* Russian name (optional, helps RU buyers) */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-secondary">
            {t(locale, "product_new_name_ru")}
          </span>
          <input
            name="nameRu"
            maxLength={80}
            placeholder={t(locale, "product_new_name_ru_ph")}
            className="glass-input rounded-xl px-3 py-2.5 text-sm"
          />
        </label>

        {/* Category + unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">
              {t(locale, "product_new_category")}
            </span>
            <select
              name="category"
              defaultValue="Mevalar"
              className="glass-input rounded-xl px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {t(locale, c.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">
              {t(locale, "product_new_unit")}
            </span>
            <select
              name="unit"
              defaultValue="KG"
              className="glass-input rounded-xl px-3 py-2.5 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {t(locale, u.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Price — plain typeable number, no steppers/toggles */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-secondary">
            {t(locale, "product_new_cost")}
          </span>
          <div className="relative">
            <input
              name="costPrice"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              placeholder={t(locale, "product_new_price_ph")}
              onInput={(e) => {
                const el = e.currentTarget;
                el.value = el.value.replace(/[^0-9]/g, "");
              }}
              className="glass-input w-full rounded-xl px-3 py-2.5 pr-16 text-sm tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-text-secondary">
              {t(locale, "product_new_price_suffix")}
            </span>
          </div>
        </label>

        {error && (
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--status-danger)" }}
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="glow-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-50"
          style={{
            background: "var(--accent)",
            color: "var(--bg-primary)",
            fontFamily: "var(--font-display, Inter)",
          }}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Plus size={15} aria-hidden />
          )}
          {busy ? t(locale, "common_loading") : t(locale, "product_new_submit")}
        </button>
      </form>
    </div>
  );
}
