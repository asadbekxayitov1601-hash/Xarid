"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useTransform,
  useScroll,
} from "motion/react";
import { ArrowRight, ChevronRight, Clock, Truck, Package, Coins } from "lucide-react";
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

// Consumer grocery taxonomy — mirrors the DB category strings in lib/seed.ts /
// CATEGORY_MAP (B2C pivot, section 5). Clicking a pill deep-links to /catalog.
const categories = [
  { emoji: "🍎", key: "fruits", name: { uz: "Mevalar", ru: "Фрукты", en: "Fruits" } },
  { emoji: "🥬", key: "vegetables", name: { uz: "Sabzavotlar", ru: "Овощи", en: "Vegetables" } },
  { emoji: "🥛", key: "dairy", name: { uz: "Sut va tuxum", ru: "Молочное и яйца", en: "Dairy & Eggs" } },
  { emoji: "🥖", key: "bakery", name: { uz: "Non mahsulotlari", ru: "Выпечка", en: "Bakery" } },
  { emoji: "🥩", key: "meat", name: { uz: "Go'sht", ru: "Мясо", en: "Meat" } },
  { emoji: "🌾", key: "dry", name: { uz: "Bakaleya", ru: "Бакалея", en: "Dry goods" } },
  { emoji: "🧃", key: "drinks", name: { uz: "Ichimliklar", ru: "Напитки", en: "Drinks" } },
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

  // Consumer stats — fast ETA, freshness, wide catalog, cash on delivery.
  const stats = [
    { value: "30-60", suffix: " min", label: t(locale, "landing_stat_deadline"), Icon: Truck },
    { value: "✓", label: t(locale, "landing_stat_window"), Icon: Clock },
    { value: "40+", label: t(locale, "landing_stat_basket"), Icon: Package },
    { value: "0", suffix: ` ${t(locale, "sum")}`, label: t(locale, "landing_stat_delivery_cost"), Icon: Coins },
  ];

  // Consumer-scale basket — everyday quantities from one fulfilling shop.
  const shopName = "Qo'qon Bozor";
  const orderRows = [
    { emoji: "🍎", name: { uz: "Olma · 1 kg", ru: "Яблоки · 1 кг", en: "Apples · 1 kg" }, price: "12 000", sup: shopName },
    { emoji: "🥛", name: { uz: "Sut · 1 L", ru: "Молоко · 1 л", en: "Milk · 1 L" }, price: "12 000", sup: shopName },
    { emoji: "🍞", name: { uz: "Non · 2 dona", ru: "Лепёшка · 2 шт", en: "Bread · 2 pcs" }, price: "8 000", sup: shopName },
    { emoji: "🥒", name: { uz: "Bodring · 0.5 kg", ru: "Огурцы · 0.5 кг", en: "Cucumber · 0.5 kg" }, price: "5 000", sup: shopName },
  ];

  // 3-step consumer flow: Browse -> Order -> Fast delivery (B2C pivot).
  const steps = [
    { step: "01", title: t(locale, "landing_step1_title"), desc: t(locale, "landing_step1_desc"), Icon: Package },
    { step: "02", title: t(locale, "landing_step2_title"), desc: t(locale, "landing_step2_desc"), Icon: Coins },
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
                        <>
                          {value}
                          {suffix}
                        </>
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
                        37 000 {t(locale, "sum")}
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

      {/* How it works — balanced header row + even 4-step grid (no empty corner) */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Header row: eyebrow + title + intro (replaces the lopsided feature cell) */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-14 max-w-2xl text-center"
          >
            <span
              className="mb-4 inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]"
              style={{ background: "var(--accent-glow)", color: "var(--accent)", borderColor: "var(--glass-hover-border)" }}
            >
              {t(locale, "landing_how_eyebrow")}
            </span>
            <h2
              className="mb-4 font-display text-text-primary"
              style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-0.025em" }}
            >
              {t(locale, "landing_how_title")}
            </h2>
            <p className="text-base leading-relaxed text-text-secondary">{t(locale, "landing_how_intro")}</p>
          </motion.div>

          {/* Even grid — 1 / 3 columns: three equal consumer steps, no empty corner */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: reduce ? 0 : 0.1 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {steps.map(({ step, title, desc, Icon }) => (
              <motion.div key={step} variants={revealItem}>
                <Card3D className="glass-card relative h-full overflow-hidden rounded-3xl border border-border-primary p-6">
                  {/* Large step index — clearly visible watermark (token accent, readable opacity) */}
                  <span
                    aria-hidden
                    className="absolute right-4 top-3 font-display text-5xl font-black leading-none tabular-nums"
                    style={{ color: "var(--accent)", opacity: 0.28 }}
                  >
                    {step}
                  </span>
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

          {/* Relocated community stat strip — segmented range + animated counter,
              clearly labelled so it belongs (was mis-placed inside step "00"). */}
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="mt-4"
          >
            <SpotlightCard
              className="glass-card rounded-3xl p-6 sm:p-7"
              contentClassName="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-display text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
                  {t(locale, "landing_statstrip_title")}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                    <AnimatedNumber value={activeRange.value} />
                  </span>
                  <span className="text-sm text-text-secondary">{t(locale, "landing_statstrip_orders")}</span>
                </div>
              </div>
              <SegmentedControl
                segments={ranges.map((r) => ({ id: r.id, label: r.label }))}
                value={range}
                onChange={setRange}
                ariaLabel={t(locale, "landing_statstrip_title")}
                className="w-full sm:w-auto"
              />
            </SpotlightCard>
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
