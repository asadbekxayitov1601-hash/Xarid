"use client";

import { useRef, useState } from "react";
import { Building2, Image as ImageIcon, Phone, Save, Upload } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { updateMyProfile } from "@/app/supplier/actions";

// Downscale a picked image to a 320px-max JPEG data URL in the browser, mirroring
// the proven compression in components/product-image-upload.tsx so even a 12MP
// phone photo lands as a ~20-40KB string the existing profile action can store
// straight into Organization.logoUrl (no server action / endpoint changes).
async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export type AboutCompanyFormProps = {
  locale: Locale;
  initial: {
    name: string;
    district: string;
    phone: string;
    about: string;
    logoUrl: string;
  };
};

export function AboutCompanyForm({ locale, initial }: AboutCompanyFormProps) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<"saved" | "error" | null>(null);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [name, setName] = useState(initial.name);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    setLogoError(false);
    try {
      setLogoUrl(await fileToCompressedDataUrl(file));
    } catch {
      setLogoError(true);
    } finally {
      setLogoBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onSubmit(form: FormData) {
    setBusy(true);
    setToast(null);
    try {
      const res = await updateMyProfile(form);
      if (res?.ok) setToast("saved");
      else setToast("error");
    } catch {
      setToast("error");
    } finally {
      setBusy(false);
    }
  }

  const initial1 = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <form
      action={onSubmit}
      className="space-y-6"
      aria-busy={busy}
    >
      <header className="space-y-1">
        <h1
          className="text-2xl sm:text-3xl font-extrabold text-text-primary"
          style={{ fontFamily: "var(--font-display, Inter)" }}
        >
          {t(locale, "profile_title")}
        </h1>
        <p className="text-sm text-text-secondary">{t(locale, "profile_subtitle")}</p>
      </header>

      <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3 text-text-primary">
          <Building2
            size={16}
            style={{ color: "var(--accent)" }}
            aria-hidden
          />
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display, Inter)" }}
          >
            {t(locale, "profile_section_basic")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">
              {t(locale, "profile_field_name")}
            </span>
            <input
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input rounded-xl px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">
              {t(locale, "profile_field_district")}
            </span>
            <input
              name="district"
              type="text"
              required
              defaultValue={initial.district}
              className="glass-input rounded-xl px-3 py-2.5 text-sm"
            />
          </label>
          <label className="sm:col-span-2 flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary inline-flex items-center gap-1.5">
              <Phone size={12} aria-hidden />
              {t(locale, "profile_field_phone")}
            </span>
            <input
              name="phone"
              type="tel"
              required
              defaultValue={initial.phone}
              className="glass-input rounded-xl px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 text-text-primary">
          <Building2
            size={16}
            style={{ color: "var(--accent-2)" }}
            aria-hidden
          />
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display, Inter)" }}
          >
            {t(locale, "profile_section_about")}
          </h2>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-secondary">
            {t(locale, "profile_field_about")}
          </span>
          <textarea
            name="about"
            rows={6}
            defaultValue={initial.about}
            className="glass-input rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-y min-h-32"
          />
          <span className="text-xs text-text-secondary">
            {t(locale, "profile_field_about_help")}
          </span>
        </label>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 text-text-primary">
          <ImageIcon
            size={16}
            style={{ color: "var(--accent-3)" }}
            aria-hidden
          />
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display, Inter)" }}
          >
            {t(locale, "profile_section_logo")}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={t(locale, "co_logo_preview_alt")}
              className="h-16 w-16 rounded-2xl object-cover border border-border-primary"
            />
          ) : (
            <div
              className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 60%, var(--bg-primary)))",
                color: "var(--bg-primary)",
                fontFamily: "var(--font-display, Inter)",
              }}
              aria-hidden
            >
              {initial1}
            </div>
          )}
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Hidden field carries the compressed data URL into the unchanged
                updateMyProfile action (Organization.logoUrl). */}
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={logoBusy}
              className="glass-input inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:text-[color:var(--accent)] disabled:opacity-50"
            >
              <Upload size={14} aria-hidden />
              {logoBusy
                ? t(locale, "co_logo_uploading")
                : logoUrl
                ? t(locale, "co_logo_replace")
                : t(locale, "co_logo_upload")}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={onPickLogo}
              className="hidden"
            />
            <span className="text-xs text-text-secondary">
              {t(locale, "co_logo_help")}
            </span>
            {logoError ? (
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--status-danger)" }}
                role="alert"
              >
                {t(locale, "co_logo_error")}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
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
          <Save size={14} aria-hidden />
          {busy ? t(locale, "common_loading") : t(locale, "profile_save")}
        </button>
        {toast === "saved" ? (
          <span
            className="text-xs font-semibold rounded-full px-3 py-1.5"
            style={{
              background: "var(--status-success-bg)",
              color: "var(--status-success)",
            }}
            role="status"
          >
            {t(locale, "profile_saved")}
          </span>
        ) : toast === "error" ? (
          <span
            className="text-xs font-semibold rounded-full px-3 py-1.5"
            style={{
              background: "var(--status-danger-bg)",
              color: "var(--status-danger)",
            }}
            role="alert"
          >
            {t(locale, "profile_save_error")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
