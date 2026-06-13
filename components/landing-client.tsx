"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useTransform,
  useScroll,
} from "motion/react";
import { ArrowRight, ChevronRight, Clock, Truck, Package, Coins, Moon } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/use-reduced-motion-pref";
import { easeSpring } from "@/lib/motion-presets";
import { ScrollProgress } from "@/components/scroll-progress";
import { SupplierMarquee } from "@/components/landing/supplier-marquee";
import { SpotlightCard } from "@/components/landing/spotlight-card";
import { AnimatedNumber } from "@/components/landing/animated-number";
import { SegmentedControl } from "@/components/landing/segmented-control";

interface LandingClientProps {
  locale: Locale;
}

const categories = [
  { emoji: "🥬", key: "vegetables", name: { uz: "Sabzavotlar", ru: "Овощи", en: "Vegetables" } },
  { emoji: "🥩", key: "meat", name: { uz: "Go'sht", ru: "Мясо", en: "Meat" } },
  { emoji: "🥛", key: "dairy", name: { uz: "Sut mahsulotlari", ru: "Молочные", en: "Dairy" } },
  { emoji: "🌾", key: "dry", name: { uz: "Bakaleya", ru: "Бакалея", en: "Dry goods" } },
  { emoji: "🧃", key: "drinks", name: { uz: "Ichimliklar", ru: "Напитки", en: "Beverages" } },
];

// Mouse-tilt card (kept; tilt range <= 8deg per DESIGN_SYSTEM §5.3).
function Card3D({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingClient({ locale }: LandingClientProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  // B.1 hero parallax — card rises + fades, blobs drift further (back plane).
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const cardY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -80]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.85], reduce ? [1, 1] : [1, 0.45]);
  const blobY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 140]);

  // D.4 demo: range toggle for the feature cell stat.
  const ranges = [
    { id: "day", label: t(locale, "range_day"), value: 38 },
    { id: "week", label: t(locale, "range_week"), value: 264 },
    { id: "month", label: t(locale, "range_month"), value: 1130 },
  ];
  const [range, setRange] = useState("week");
  const activeRange = ranges.find((r) => r.id === range) ?? ranges[1];

  const stats = [
    { value: "22:00", label: t(locale, "landing_stat_deadline"), Icon: Clock },
    { value: "06–10", label: t(locale, "landing_stat_window"), Icon: Truck },
    { value: "1", label: t(locale, "landing_stat_basket"), Icon: Package },
    { value: "0", suffix: ` ${t(locale, "sum")}`, label: t(locale, "landing_stat_delivery_cost"), Icon: Coins },
  ];

  const orderRows = [
    { emoji: "🧅", name: { uz: "Piyoz · 10 kg", ru: "Лук · 10 кг", en: "Onion · 10 kg" }, price: "43 000", sup: "Agro-Fresh" },
    { emoji: "🥩", name: { uz: "Mol go'shti · 8 kg", ru: "Говядина · 8 кг", en: "Beef · 8 kg" }, price: "813 000", sup: "Toshkent Meat" },
    { emoji: "🥬", name: { uz: "Karam · 15 kg", ru: "Капуста · 15 кг", en: "Cabbage · 15 kg" }, price: "67 500", sup: "Agro-Fresh" },
    { emoji: "🧄", name: { uz: "Sarimsoq · 2 kg", ru: "Чеснок · 2 кг", en: "Garlic · 2 kg" }, price: "32 000", sup: "Fermer+" },
  ];

  const steps = [
    { step: "01", title: t(locale, "landing_step1_title"), desc: t(locale, "landing_step1_desc"), Icon: Clock },
    { step: "02", title: t(locale, "landing_step2_title"), desc: t(locale, "landing_step2_desc"), Icon: Moon },
    { step: "03", title: t(locale, "landing_step3_title"), desc: t(locale, "landing_step3_desc"), Icon: Truck },
  ];

  // B.2 reveal variants (collapse deltas under reduced motion).
  const revealItem = {
    hidden: { opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: easeSpring },
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ScrollProgress locale={locale} />

      {/* D.6 Aurora — token-driven blobs via .blob (reduced-motion auto-gated). */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div style={{ y: blobY }} className="absolute inset-0">
          <span className="blob aurora-emerald" style={{ width: 500, height: 500, top: "-10%", left: "-5%" }} />
          <span className="blob blob-2 aurora-amber" style={{ width: 400, height: 400, top: "30%", right: "-5%" }} />
          <span className="blob blob-3 aurora-sky" style={{ width: 350, height: 350, bottom: "10%", left: "20%" }} />
        </motion.div>
      </div>

      {/* Hero */}
      <section ref={heroRef} className="relative flex min-h-screen items-center pt-16">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-4 py-20 sm:px-6 lg:grid-cols-2">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeSpring }}
          >
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium font-display"
              style={{
                borderColor: "var(--glass-hover-border)",
                background: "var(--accent-glow)",
                color: "var(--accent)",
              }}
            >
              ✨ {t(locale, "landing_badge")}
            </motion.div>

            <h1
              className="mb-6 font-display leading-tight text-text-primary"
              style={{ fontSize: "clamp(2.2rem,5vw,3.8rem)", fontWeight: 800, letterSpacing: "-0.03em" }}
            >
              {t(locale, "landing_h1_pre")}{" "}
              <span
                style={{
                  backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }}
              >
                {t(locale, "landing_h1_accent")}
              </span>
            </h1>

            <p className="mb-10 max-w-lg leading-relaxed text-text-secondary" style={{ fontSize: "1.05rem" }}>
              {t(locale, "landing_sub")}
            </p>

            <div className="mb-12 flex flex-wrap gap-4">
              <motion.button
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                onClick={() => router.push("/catalog")}
                className="glow-button flex cursor-pointer items-center gap-2 rounded-full px-7 py-3.5 font-display text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-primary)]"
                style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
              >
                {t(locale, "landing_cta_catalog")} <ArrowRight size={18} />
              </motion.button>
              <motion.button
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                onClick={() => router.push("/orders")}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border-primary bg-bg-secondary/40 px-7 py-3.5 font-display text-base font-bold text-text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              >
                {t(locale, "landing_cta_orders")} <ChevronRight size={18} />
              </motion.button>
            </div>

            {/* Stats — iconsax Bulk icons + animated counters (D.5) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(({ value, suffix, label, Icon }, i) => {
                const numeric = /^\d+$/.test(value);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="glass-card rounded-2xl p-3 text-center"
                  >
                    <span
                      className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-xl"
                      style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="font-display text-base font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                      {numeric ? (
                        <>
                          <AnimatedNumber value={Number(value)} />
                          {suffix}
                        </>
                      ) : (
                        value
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-text-secondary">{label}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right — floating order card (B.1 parallax + spotlight glow) */}
          <motion.div
            initial={{ opacity: 0, x: reduce ? 0 : 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: easeSpring }}
            style={{ y: cardY, opacity: cardOpacity }}
            className="flex justify-center"
          >
            <Card3D className="w-full max-w-sm">
              <SpotlightCard className="glass-card rounded-3xl">
                <div className="p-6" style={{ transformStyle: "preserve-3d" }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="mb-0.5 font-display text-sm font-medium text-text-secondary">
                        {t(locale, "landing_order_label")} #2847
                      </div>
                      <div className="text-xs text-text-secondary">{t(locale, "landing_order_date")}</div>
                    </div>
                    <span
                      className="rounded-full border px-2.5 py-1 text-xs font-bold"
                      style={{
                        background: "var(--status-success-bg)",
                        color: "var(--status-success)",
                        borderColor: "var(--glass-hover-border)",
                      }}
                    >
                      {t(locale, "landing_delivered")}
                    </span>
                  </div>

                  <div className="mb-5 space-y-3">
                    {orderRows.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border-primary bg-bg-secondary/50 text-lg">
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-sm font-medium text-text-primary">{item.name[locale]}</div>
                          <div className="text-xs text-text-secondary">{item.sup}</div>
                        </div>
                        <div className="flex-shrink-0 font-display text-sm font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                          {item.price} <span className="text-xs font-normal">{t(locale, "sum")}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border-primary pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-medium text-text-secondary">{t(locale, "landing_total")}</span>
                      <span className="font-display text-lg font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                        955 500 {t(locale, "sum")}
                      </span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </Card3D>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
        >
          <div className="h-10 w-px bg-gradient-to-b from-text-secondary/35 to-transparent" />
        </motion.div>
      </section>

      {/* D.2 Supplier trust marquee */}
      <SupplierMarquee locale={locale} />

      {/* How it works — D.1 bento grid */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: reduce ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center font-display text-text-primary"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.025em" }}
          >
            {t(locale, "landing_how_title")}
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: reduce ? 0 : 0.1 }}
            className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-4 md:grid-cols-4"
          >
            {/* Feature cell — tall, spotlight + segmented range demo */}
            <motion.div variants={revealItem} className="col-span-2 md:col-span-2 md:row-span-2">
              <SpotlightCard
                className="glass-card h-full rounded-3xl p-7"
                contentClassName="flex flex-col justify-between"
              >
                <div>
                  <span
                    className="mb-4 inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)", borderColor: "var(--glass-hover-border)" }}
                  >
                    {t(locale, "landing_step_prefix")} 00
                  </span>
                  <h3 className="mb-3 font-display text-text-primary" style={{ fontWeight: 700, fontSize: "1.5rem" }}>
                    {t(locale, "landing_feature_title")}
                  </h3>
                  <p className="max-w-md text-sm leading-relaxed text-text-secondary">
                    {t(locale, "landing_feature_desc")}
                  </p>
                </div>

                <div className="mt-6">
                  <SegmentedControl
                    segments={ranges.map((r) => ({ id: r.id, label: r.label }))}
                    value={range}
                    onChange={setRange}
                    ariaLabel={t(locale, "landing_feature_title")}
                    className="mb-3 w-full"
                  />
                  <div className="font-display text-4xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                    <AnimatedNumber value={activeRange.value} />
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Three step cells */}
            {steps.map(({ step, title, desc, Icon }) => (
              <motion.div key={step} variants={revealItem} className="col-span-2 md:col-span-1 md:row-span-1">
                <Card3D className="glass-card relative h-full overflow-hidden rounded-3xl border border-border-primary p-6">
                  <div
                    className="absolute right-4 top-4 font-display text-5xl font-black opacity-[0.06]"
                    style={{ color: "var(--accent)" }}
                  >
                    {step}
                  </div>
                  <span
                    className="mb-3 grid h-11 w-11 place-items-center rounded-2xl"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)" }}
                  >
                    <Icon size={22} />
                  </span>
                  <div
                    className="mb-3 inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: "var(--accent-glow)", color: "var(--accent)", borderColor: "var(--glass-hover-border)" }}
                  >
                    {t(locale, "landing_step_prefix")} {step}
                  </div>
                  <h3 className="mb-2 font-display text-text-primary" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="relative border-b border-t border-border-primary bg-bg-secondary/10 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0, y: reduce ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center font-display text-text-primary"
            style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.025em" }}
          >
            {t(locale, "landing_categories_title")}
          </motion.h2>

          <div className="flex flex-wrap justify-center gap-5">
            {categories.map(({ emoji, name, key }, i) => (
              <motion.button
                key={key}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                whileHover={reduce ? undefined : { scale: 1.08, y: -4 }}
                whileTap={reduce ? undefined : { scale: 0.95 }}
                onClick={() => router.push("/catalog")}
                className="glass-card flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              >
                <span className="text-4xl">{emoji}</span>
                <span className="font-display text-sm font-bold text-text-primary">{name[locale]}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
