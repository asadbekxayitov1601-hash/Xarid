"use client";

import { Store } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";
import { t, type Locale } from "@/lib/i18n";

// Supplier trust marquee (21st.dev "marquee" idiom). A seamless loop of glass
// pills, duplicated x2. Edge-masked. Reduced motion: static wrapped row.
const SUPPLIERS = [
  "Agro-Fresh",
  "Qo'qon Meat",
  "Fermer+",
  "Oziq Savdo",
  "Yangi Bozor",
  "Choponota Dairy",
  "Bakaleya Plus",
  "Zarafshon Foods",
];

function Pill({ name }: { name: string }) {
  return (
    <span className="glass-card flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-text-secondary">
      <Store size={15} className="text-accent" style={{ color: "var(--accent)" }} />
      {name}
    </span>
  );
}

export function SupplierMarquee({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-10">
      <p className="font-display mb-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
        {t(locale, "marquee_trusted_title")}
      </p>

      {reduce ? (
        // Static, wrapped — no horizontal motion.
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3 px-4">
          {SUPPLIERS.map((s) => (
            <Pill key={s} name={s} />
          ))}
        </div>
      ) : (
        <div className="marquee-mask overflow-hidden">
          <div className="marquee-track flex gap-3">
            {/* duplicate the set so translateX(-50%) loops seamlessly */}
            {[...SUPPLIERS, ...SUPPLIERS].map((s, i) => (
              <Pill key={`${s}-${i}`} name={s} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
