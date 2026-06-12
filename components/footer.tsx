import { t, type Locale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="w-full border-t border-border-primary bg-bg-secondary/30 px-6 py-10 text-center text-text-primary transition-colors duration-300">
      <div className="mx-auto flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 text-sm font-extrabold text-stone-950 shadow-md">
          X
        </span>
        <span className="text-lg font-extrabold tracking-tight">arid</span>
      </div>
      <p className="mt-2 text-xs font-semibold text-text-secondary">
        {t(locale, "hero_title_pre")} {t(locale, "hero_title_accent")}
      </p>
      <p className="mt-4 text-[10px] font-bold text-text-secondary/50">
        © {new Date().getFullYear()} Xarid · {t(locale, "footer_rights")}
      </p>
    </footer>
  );
}
