"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, ClipboardList, Route, Users, Wallet,
  TrendingUp, Clock, Truck, CheckCircle, ChevronRight,
  Package, ArrowUpRight, Menu, X, HelpCircle
} from "lucide-react";
import { triggerCutoff } from "@/app/admin/actions";

type PipelineOrder = {
  id: string;
  org: string;
  total: number;
  itemsCount: number;
  status: string;
  address: string;
};

type AdminClientProps = {
  activeOrdersCount: number;
  activeGmv: number;
  pendingPosCount: number;
  leadsCount: number;
  awaitingCutoffCount: number;
  pipelineOrders: PipelineOrder[];
  statusBreakdown: { status: string; count: number; gmv: number }[];
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Buyurtmalar", icon: ClipboardList },
  { id: "routes", label: "Marshrut varaqlari", icon: Route },
  { id: "suppliers", label: "Yetkazib beruvchilar", icon: Users },
  { id: "finance", label: "Moliya", icon: Wallet },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PLACED: { label: "Joylashtirildi", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  CONFIRMED: { label: "Tasdiqlandi", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  PARTIAL: { label: "Qisman tasdiqlandi", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  DELIVERING: { label: "Yetkazilmoqda", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  DELIVERED: { label: "Yetkazildi", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  CANCELLED: { label: "Bekor qilindi", color: "#78716c", bg: "rgba(120,113,108,0.12)" },
};

// Weekly mock revenue data for visual chart
const chartData = [
  { day: "Dush", value: 4200000 },
  { day: "Sesh", value: 6800000 },
  { day: "Chor", value: 5100000 },
  { day: "Pay", value: 8900000 },
  { day: "Jum", value: 7300000 },
  { day: "Shan", value: 3200000 },
  { day: "Yak", value: 1800000 },
];

export function AdminClient({
  activeOrdersCount,
  activeGmv,
  pendingPosCount,
  leadsCount,
  awaitingCutoffCount,
  pipelineOrders,
  statusBreakdown,
}: AdminClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cutoffRunning, setCutoffRunning] = useState(false);


  const formatPrice = (n: number) => n.toLocaleString("ru-RU") + " so'm";

  const cards = [
    { label: "Faol buyurtmalar", value: `${activeOrdersCount} ta`, sub: "Bugungi navbat", icon: Package, color: "var(--accent)" },
    { label: "Faol GMV", value: formatPrice(activeGmv), sub: "Bozor aylanmasi", icon: TrendingUp, color: "#60a5fa" },
    { label: "Tasdiq kutilmoqda (PO)", value: `${pendingPosCount} ta`, sub: "Yetkazib beruvchilarda", icon: Clock, color: "#f59e0b" },
    { label: "Leadlar", value: `${leadsCount} ta`, sub: "Yangi arizalar", icon: Users, color: "#818cf8" },
  ];

  async function handleCutoff() {
    setCutoffRunning(true);
    try {
      await triggerCutoff();
      alert("Cutoff bajarildi! Purchase Orderlar yetkazib beruvchilarga yuborildi.");
      window.location.reload();
    } catch (e) {
      alert("Xatolik yuz berdi.");
    } finally {
      setCutoffRunning(false);
    }
  }

  return (
    <div className="flex h-screen pt-16 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-shrink-0 w-60 h-full flex flex-col overflow-hidden z-30 border-r border-border-primary bg-bg-secondary/65 backdrop-blur-xl"
          >
            <div className="px-4 py-5 border-b border-border-primary">
              <div className="flex items-center gap-2">
                <div className="relative h-7 w-7 overflow-hidden rounded-lg">
                  <Image
                    src="/logo.png"
                    alt="Xarid"
                    fill
                    sizes="28px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>Xarid Admin</div>
                  <div className="text-xs text-text-secondary" style={{ fontFamily: "Inter" }}>Boshqaruv paneli</div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer"
                    style={{
                      background: active ? "rgba(89,199,73,0.15)" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      border: active ? "1px solid rgba(89,199,73,0.25)" : "1px solid transparent",
                      fontFamily: "Outfit",
                    }}
                  >
                    <Icon size={16} />
                    {label}
                    {active && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                );
              })}
            </nav>

            <div className="px-4 py-4 border-t border-border-primary">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-secondary/40 border border-border-primary/50">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))" }}
                >
                  A
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary" style={{ fontFamily: "Outfit" }}>Admin</div>
                  <div className="text-xs text-text-secondary" style={{ fontFamily: "Inter" }}>admin@xarid.uz</div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-bg-primary">
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center gap-4 px-6 py-3 border-b border-border-primary bg-bg-secondary/85 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer text-text-secondary"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <h1 className="text-lg font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
            {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/12 text-emerald-400 border border-emerald-500/25">
              ● Jonli
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI Cards Row */}
          {(activeSection === "dashboard" || activeSection === "orders") && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map(({ label, value, sub, icon: Icon, color }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-2xl p-4 border border-border-primary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${color}20`, border: `1px solid ${color}30` }}
                    >
                      <Icon size={16} style={{ color }} />
                    </div>
                    <ArrowUpRight size={14} className="text-text-secondary" />
                  </div>
                  <div
                    className="text-lg sm:text-xl font-bold mb-0.5 text-text-primary"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {value}
                  </div>
                  <div className="text-xs font-semibold mb-0.5 text-text-secondary" style={{ fontFamily: "Outfit" }}>
                    {label}
                  </div>
                  <div className="text-[10px] text-text-secondary" style={{ fontFamily: "Inter" }}>
                    {sub}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Revenue Chart Section */}
          {activeSection === "dashboard" && (
            <div className="glass-card rounded-2xl p-5 border border-border-primary">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
                  Haftalik buyurtmalar qiymati
                </h3>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">
                  Demo grafika
                </span>
              </div>

              {/* Pure CSS/Framer Motion Bar Chart */}
              <div className="flex items-end justify-between h-48 pt-4 px-2 relative">
                {chartData.map((d, idx) => {
                  const maxVal = 10000000;
                  const pct = (d.value / maxVal) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group gap-2 h-full justify-end">
                      <div className="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 select-none">
                        {(d.value / 1000000).toFixed(1)}M
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ delay: idx * 0.05, duration: 0.6 }}
                        className="w-8 sm:w-10 rounded-t-lg bg-emerald-500 shadow-[0_0_12px_rgba(89,199,73,0.3)] group-hover:bg-emerald-400 transition-colors"
                      />
                      <div className="text-xs text-text-secondary font-medium font-sans">
                        {d.day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cutoff Manager Panel */}
          {activeSection === "dashboard" && (
            <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5">
              <h3 className="font-bold text-amber-500 flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
                ⚠️ Cutoff boshqaruvi
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed" style={{ fontFamily: "Inter" }}>
                Tizim har kuni soat <strong>22:00 da</strong> avtomatik ravishda buyurtmalarni cutoff qiladi va
                yetkazib beruvchilar uchun yig'ma Purchase Orderlarni generatsiya qiladi.
              </p>
              <div className="mt-4 p-4 rounded-xl bg-bg-secondary/40 border border-border-primary/50 flex flex-wrap justify-between items-center gap-4">
                <span className="text-sm text-text-primary">
                  Hozirda <strong>{awaitingCutoffCount} ta</strong> faol buyurtma yuborilmagan.
                </span>
                <button
                  type="button"
                  disabled={cutoffRunning || awaitingCutoffCount === 0}
                  onClick={handleCutoff}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 text-white hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  style={{ fontFamily: "Outfit" }}
                >
                  {cutoffRunning ? "Bajarilmoqda..." : "Cutoffni hozir ishga tushirish"}
                </button>
              </div>
            </div>
          )}

          {/* Orders Pipeline Table */}
          {(activeSection === "dashboard" || activeSection === "orders") && (
            <div className="glass-card rounded-2xl overflow-hidden border border-border-primary">
              <div className="px-5 py-4 border-b border-border-primary flex items-center justify-between">
                <h3 className="font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
                  Buyurtmalar vodoprovodi (GMV pipeline)
                </h3>
                <span className="text-xs text-text-secondary" style={{ fontFamily: "Inter" }}>
                  {pipelineOrders.length} ta faol buyurtma
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border-primary">
                      {["#ID", "Mijoz (Tashkilot)", "Mahsulotlar", "Qiymati", "Manzili", "Holati", ""].map(
                        (h, i) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-left text-xs font-semibold text-text-secondary"
                            style={{ fontFamily: "Outfit", whiteSpace: "nowrap" }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineOrders.map((order) => {
                      const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PLACED;
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-border-primary/60 hover:bg-emerald-500/5 transition-colors"
                        >
                          <td
                            className="px-4 py-3 text-sm font-mono text-text-secondary"
                            style={{ fontFamily: "JetBrains Mono" }}
                          >
                            #{order.id}
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-semibold text-text-primary"
                            style={{ fontFamily: "Outfit" }}
                          >
                            {order.org}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary" style={{ fontFamily: "Inter" }}>
                            {order.itemsCount} dona
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-bold text-emerald-500"
                            style={{ fontFamily: "JetBrains Mono" }}
                          >
                            {order.total.toLocaleString("ru-RU")} so'm
                          </td>
                          <td
                            className="px-4 py-3 text-xs text-text-secondary max-w-48 truncate"
                            style={{ fontFamily: "Inter" }}
                          >
                            {order.address}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-bold border"
                              style={{
                                background: sc.bg,
                                color: sc.color,
                                borderColor: `${sc.color}35`,
                                fontFamily: "Outfit",
                              }}
                            >
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => router.push(`/orders?expanded=${order.id}`)}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-bold border border-border-primary text-text-primary hover:bg-emerald-500/10 cursor-pointer transition-colors"
                              style={{ fontFamily: "Outfit" }}
                            >
                              Ko'rish
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {pipelineOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-sm text-text-secondary">
                          Faol buyurtmalar mavjud emas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status Breakdown details */}
          {activeSection === "finance" && (
            <div className="glass-card rounded-2xl p-5 border border-border-primary">
              <h3 className="font-bold text-text-primary mb-4" style={{ fontFamily: "Outfit" }}>
                Holatlar kesimida GMV
              </h3>
              <ul className="space-y-3">
                {statusBreakdown.map((sb) => {
                  const cfg = STATUS_CONFIG[sb.status] ?? STATUS_CONFIG.PLACED;
                  return (
                    <li key={sb.status} className="flex justify-between items-center text-sm border-b border-border-primary/40 pb-2 last:border-0 last:pb-0">
                      <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-text-secondary" style={{ fontFamily: "JetBrains Mono" }}>
                        {sb.count} ta buyurtma · <strong>{sb.gmv.toLocaleString("ru-RU")} so'm</strong>
                      </span>
                    </li>
                  );
                })}
                {statusBreakdown.length === 0 && (
                  <li className="text-text-secondary text-sm">Faol ma'lumotlar mavjud emas.</li>
                )}
              </ul>
            </div>
          )}

          {/* Mock sections */}
          {activeSection === "routes" && (
            <div className="glass-card rounded-2xl p-6 border border-border-primary space-y-4">
              <h3 className="font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
                Bugungi marshrut varaqlari
              </h3>
              <div className="divide-y divide-border-primary">
                {[
                  { driver: "Alisher Toshmatov", vehicle: "01 A 123 BC", orders: 3, zones: ["Yunusobod", "Shayxontohur"], status: "Yo'lda" },
                  { driver: "Bobur Karimov", vehicle: "10 B 456 DE", orders: 4, zones: ["Chilonzor", "Uchtepa"], status: "Kutmoqda" },
                ].map((route, i) => (
                  <div key={i} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <div className="font-semibold text-sm text-text-primary" style={{ fontFamily: "Outfit" }}>{route.driver}</div>
                      <div className="text-xs text-text-secondary mt-0.5">{route.vehicle} · {route.orders} ta buyurtma</div>
                      <div className="flex gap-2 mt-2">
                        {route.zones.map((z) => (
                          <span key={z} className="text-[10px] px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-primary">
                            {z}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${route.status === "Yo'lda" ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {route.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "suppliers" && (
            <div className="glass-card rounded-2xl p-6 border border-border-primary space-y-4">
              <h3 className="font-bold text-text-primary" style={{ fontFamily: "Outfit" }}>
                Ro'yxatdan o'tgan yetkazib beruvchilar
              </h3>
              <div className="divide-y divide-border-primary">
                {[
                  { name: "Chorsu Agro", categories: "Sabzavotlar, Bakaleya", rating: "4.9", orders: 42, active: true },
                  { name: "Halol Go'sht Savdo", categories: "Go'sht mahsulotlari", rating: "4.8", orders: 25, active: true },
                  { name: "Toshkent Sut", categories: "Sut mahsulotlari, Ichimliklar", rating: "4.6", orders: 19, active: true },
                  { name: "Farhod Ulgurji", categories: "Sabzavotlar, Bakaleya", rating: "4.5", orders: 31, active: true },
                ].map((sup, i) => (
                  <div key={i} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <div className="font-semibold text-sm text-text-primary" style={{ fontFamily: "Outfit" }}>{sup.name}</div>
                      <div className="text-xs text-text-secondary mt-0.5">{sup.categories}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-amber-500">★ {sup.rating}</span>
                      <span className="text-xs text-text-secondary font-mono">{sup.orders} ta PO</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold">Faol</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
