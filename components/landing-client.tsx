"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, Clock, Truck, Package, Coins, ChevronRight, LayoutDashboard, Store } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface LandingClientProps {
  locale: Locale;
}

const T = {
  badge: {
    uz: "✨ Toshkentdagi HoReCa uchun ertalabki ta'minot bozori",
    ru: "✨ Утренний рынок снабжения для HoReCa в Ташкенте",
  },
  h1a: {
    uz: "Har kuni, ",
    ru: "Каждый день, ",
  },
  h1b: {
    uz: "hammasi bir joyda",
    ru: "всё в одном месте",
  },
  sub: {
    uz: "Ertalabki qo'ng'iroqlar yo'q. Turli yetkazib beruvchilardan sabzavot, go'sht va quruq mahsulotlarni bir savatga soling. Soat 10:00 gacha bitta yetkazib berishda barchasini olamiz.",
    ru: "Никаких утренних звонков. Добавьте овощи, мясо и бакалею от разных поставщиков в одну корзину. Мы доставим всё одной поставкой до 10:00.",
  },
  cta1: {
    uz: "Katalogga o'tish",
    ru: "Перейти в каталог",
  },
  cta2: {
    uz: "Buyurtma tarixi",
    ru: "История заказов",
  },
  howTitle: {
    uz: "Xarid qanday ishlaydi",
    ru: "Как работает Xarid",
  },
  step1t: {
    uz: "22:00 gacha buyurtma bering",
    ru: "Закажите до 22:00",
  },
  step1d: {
    uz: "Turli yetkazib beruvchilar ro'yxatidan yangi oziq-ovqatlar qo'shing.",
    ru: "Добавьте свежие продукты из списков разных поставщиков.",
  },
  step2t: {
    uz: "Tunda tasdiqlash",
    ru: "Ночное подтверждение",
  },
  step2d: {
    uz: "Tizim mahsulotlarni zonalar bo'yicha guruhlaydi va yetkazib beruvchilar zahirani tasdiqlaydi.",
    ru: "Система группирует позиции по зонам, поставщики подтверждают наличие.",
  },
  step3t: {
    uz: "Birlashtirilgan yetkazib berish",
    ru: "Консолидированная доставка",
  },
  step3d: {
    uz: "Xarid avtomobillari barcha mahsulotlarni bitta ertalabki tashishda yetkazib beradi (06:00–10:00).",
    ru: "Автомобили Xarid доставляют всё одной поставкой утром (06:00–10:00).",
  },
  catTitle: {
    uz: "Mahsulot kategoriyalari",
    ru: "Категории продуктов",
  },
};

const categories = [
  { emoji: "🥬", name: { uz: "Sabzavotlar", ru: "Овощи" }, color: "#10b981" },
  { emoji: "🥩", name: { uz: "Go'sht", ru: "Мясо" }, color: "#ef4444" },
  { emoji: "🥛", name: { uz: "Sut mahsulotlari", ru: "Молочные" }, color: "#60a5fa" },
  { emoji: "🌾", name: { uz: "Bakaleya", ru: "Бакалея" }, color: "#f59e0b" },
  { emoji: "🧃", name: { uz: "Ichimliklar", ru: "Напитки" }, color: "#a855f7" },
];

const stats = [
  { value: "22:00", label: { uz: "Buyurtma vaqti", ru: "Время заказа" }, icon: Clock },
  { value: "06–10", label: { uz: "Yetkazib berish", ru: "Доставка" }, icon: Truck },
  { value: "1", label: { uz: "Savat - butun ta'minot", ru: "Все закупки в 1 месте" }, icon: Package },
  { value: "0 so'm", label: { uz: "Yetkazib berish narxi", ru: "Цена доставки" }, icon: Coins },
];

function Card3D({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
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

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full blur-3xl"
          style={{ width: 500, height: 500, top: "-10%", left: "-5%", background: "rgba(16,185,129,0.12)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute rounded-full blur-3xl"
          style={{ width: 400, height: 400, top: "30%", right: "-5%", background: "rgba(245,158,11,0.08)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, 20, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          className="absolute rounded-full blur-3xl"
          style={{ width: 350, height: 350, bottom: "10%", left: "20%", background: "rgba(124,58,237,0.07)" }}
        />
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-20">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-400/25 bg-emerald-500/10 text-emerald-400"
              style={{
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {T.badge[locale]}
            </motion.div>

            <h1 className="mb-6 leading-tight text-text-primary" style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(2.2rem,5vw,3.8rem)", fontWeight: 800 }}>
              {T.h1a[locale]}{" "}
              <span style={{ background: "linear-gradient(135deg, #6ee7b7, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {T.h1b[locale]}
              </span>
            </h1>

            <p className="mb-10 leading-relaxed max-w-lg text-text-secondary" style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05rem" }}>
              {T.sub[locale]}
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(16,185,129,0.5)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/catalog")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-base transition-all cursor-pointer"
                style={{ background: "#10b981", color: "#0c0a09", fontFamily: "Outfit, sans-serif", boxShadow: "0 0 20px rgba(16,185,129,0.35)" }}
              >
                {T.cta1[locale]} <ArrowRight size={18} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/orders")}
                className="flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-base transition-all border border-border-primary bg-bg-secondary/40 text-text-primary cursor-pointer"
                style={{
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {T.cta2[locale]} <ChevronRight size={18} />
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map(({ value, label, icon: Icon }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="glass-card rounded-2xl p-3 text-center"
                >
                  <Icon size={18} className="mx-auto mb-1 text-emerald-500" />
                  <div className="font-bold text-base text-emerald-500" style={{ fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
                  <div className="text-xs mt-0.5 text-text-secondary" style={{ fontFamily: "Inter, sans-serif" }}>{label[locale]}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Floating Order Card */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <Card3D className="w-full max-w-sm">
              <div
                className="glass-card rounded-3xl p-6 shadow-2xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium mb-0.5 text-text-secondary" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {locale === "uz" ? "Buyurtma #" : "Заказ #"}2847
                    </div>
                    <div className="text-xs text-text-secondary" style={{ fontFamily: "Inter, sans-serif" }}>
                      {locale === "uz" ? "15 iyun · 06:00–10:00" : "15 июня · 06:00–10:00"}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {locale === "uz" ? "Yetkazildi" : "Доставлено"}
                  </span>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { emoji: "🧅", name: { uz: "Piyoz · 10 kg", ru: "Лук · 10 кг" }, price: "43 000", sup: "Agro-Fresh" },
                    { emoji: "🥩", name: { uz: "Mol go'shti · 8 kg", ru: "Говядина · 8 кг" }, price: "813 000", sup: "Toshkent Meat" },
                    { emoji: "🥬", name: { uz: "Karam · 15 kg", ru: "Капуста · 15 кг" }, price: "67 500", sup: "Agro-Fresh" },
                    { emoji: "🧄", name: { uz: "Sarimsoq · 2 kg", ru: "Чеснок · 2 кг" }, price: "32 000", sup: "Fermer+" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-bg-secondary/50 border border-border-primary">
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>{item.name[locale]}</div>
                        <div className="text-xs text-text-secondary" style={{ fontFamily: "Inter, sans-serif" }}>{item.sup}</div>
                      </div>
                      <div className="text-sm font-bold flex-shrink-0 text-emerald-400" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {item.price} <span className="text-xs font-normal">so'm</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border-primary">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-secondary" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {locale === "uz" ? "Jami" : "Итого"}
                    </span>
                    <span className="font-bold text-emerald-500" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.1rem" }}>
                      955 500 so'm
                    </span>
                  </div>
                </div>
              </div>
            </Card3D>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <div className="w-px h-10 bg-gradient-to-b from-text-secondary/35 to-transparent" />
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-text-primary" style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800 }}>
              {T.howTitle[locale]}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: T.step1t, desc: T.step1d, icon: "🕙", color: "#10b981" },
              { step: "02", title: T.step2t, desc: T.step2d, icon: "🌙", color: "#60a5fa" },
              { step: "03", title: T.step3t, desc: T.step3d, icon: "🚚", color: "#f59e0b" },
            ].map(({ step, title, desc, icon, color }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card3D
                  className="glass-card rounded-3xl p-7 h-full relative overflow-hidden cursor-default border border-border-primary hover:border-emerald-500/20"
                >
                  <div className="absolute top-4 right-4 text-5xl font-black opacity-5" style={{ fontFamily: "Outfit, sans-serif", color }}>
                    {step}
                  </div>
                  <div className="text-4xl mb-4">{icon}</div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-3"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                    {locale === "uz" ? `Qadam ${step}` : `Шаг ${step}`}
                  </div>
                  <h3 className="mb-3 text-text-primary" style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>
                    {title[locale]}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary" style={{ fontFamily: "Inter, sans-serif" }}>
                    {desc[locale]}
                  </p>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 relative bg-bg-secondary/10 border-t border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-text-primary" style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800 }}>
              {T.catTitle[locale]}
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-5">
            {categories.map(({ emoji, name, color }, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.08, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/catalog")}
                className="glass-card rounded-full w-32 h-32 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                style={{ boxShadow: `0 0 0 0 ${color}`, transition: "box-shadow 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 24px ${color}40`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                <span className="text-4xl">{emoji}</span>
                <span className="text-sm font-bold text-text-primary" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {name[locale]}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
