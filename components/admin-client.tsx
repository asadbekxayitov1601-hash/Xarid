"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { TrendingUp, Clock, Users, Package, ArrowUpRight } from "lucide-react";
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLACED: { label: "Joylashtirildi", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  CONFIRMED: { label: "Tasdiqlandi", color: "#0284c7", bg: "rgba(2,132,199,0.12)" },
  PARTIAL: { label: "Qisman tasdiqlandi", color: "#0284c7", bg: "rgba(2,132,199,0.12)" },
  DELIVERING: { label: "Yetkazilmoqda", color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  DELIVERED: { label: "Yetkazildi", color: "#0d9488", bg: "rgba(13,148,136,0.12)" },
  CANCELLED: { label: "Bekor qilindi", color: "#78716c", bg: "rgba(120,113,108,0.12)" },
};

// Weekly demo revenue data for the visual chart.
const chartData = [
  { day: "Dush", value: 4200000 },
  { day: "Sesh", value: 6800000 },
  { day: "Chor", value: 5100000 },
  { day: "Pay", value: 8900000 },
  { day: "Jum", value: 7300000 },
  { day: "Shan", value: 3200000 },
  { day: "Yak", value: 1800000 },
];

const fmtUzs = (n: number) => n.toLocaleString("ru-RU") + " so'm";

// Dashboard CONTENT only — the sidebar/header chrome lives in AdminShell.
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
  const [cutoffRunning, setCutoffRunning] = useState(false);

  const cards = [
    { label: "Faol buyurtmalar", value: `${activeOrdersCount} ta`, sub: "Bugungi navbat", icon: Package, color: "var(--accent)" },
    { label: "Faol GMV", value: fmtUzs(activeGmv), sub: "Bozor aylanmasi", icon: TrendingUp, color: "#0284c7" },
    { label: "Tasdiq kutilmoqda (PO)", value: `${pendingPosCount} ta`, sub: "Do'konlarda", icon: Clock, color: "#f59e0b" },
    { label: "Leadlar", value: `${leadsCount} ta`, sub: "Yangi arizalar", icon: Users, color: "#7c3aed" },
  ];

  async function handleCutoff() {
    setCutoffRunning(true);
    try {
      await triggerCutoff();
      alert("Cutoff bajarildi! Purchase Orderlar do'konlarga yuborildi.");
      window.location.reload();
    } catch {
      alert("Xatolik yuz berdi.");
    } finally {
      setCutoffRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, color }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-border-primary p-4"
            style={{ background: "var(--bg-secondary)" }}
          >
            <div className="mb-3 flex items-start justify-between">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
              >
                <Icon size={16} style={{ color }} />
              </span>
              <ArrowUpRight size={14} className="text-text-secondary" />
            </div>
            <div className="mb-0.5 text-lg font-extrabold tabular-nums text-text-primary sm:text-xl">{value}</div>
            <div className="text-xs font-semibold text-text-secondary">{label}</div>
            <div className="text-[10px] text-text-secondary/70">{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="rounded-2xl border border-border-primary p-5" style={{ background: "var(--bg-secondary)" }}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display font-bold text-text-primary">Haftalik buyurtmalar qiymati</h3>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: "var(--status-success-bg)", color: "var(--status-success)" }}
          >
            Demo grafika
          </span>
        </div>
        <div className="flex h-48 items-end justify-between px-2 pt-4">
          {chartData.map((d, idx) => {
            const pct = (d.value / 10000000) * 100;
            return (
              <div key={idx} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="select-none text-[10px] font-bold opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--accent)" }}>
                  {(d.value / 1000000).toFixed(1)}M
                </div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ delay: idx * 0.05, duration: 0.6 }}
                  className="w-8 rounded-t-lg sm:w-10"
                  style={{ background: "var(--accent)" }}
                />
                <div className="text-xs font-medium text-text-secondary">{d.day}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cutoff manager */}
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "color-mix(in srgb, var(--status-warning) 25%, transparent)", background: "var(--status-warning-bg)" }}
      >
        <h3 className="flex items-center gap-2 font-display font-bold" style={{ color: "var(--status-warning)" }}>
          Cutoff boshqaruvi
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Tizim har kuni soat <strong>22:00 da</strong> avtomatik ravishda buyurtmalarni cutoff qiladi va
          do'konlar uchun yig'ma Purchase Orderlarni generatsiya qiladi.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-primary/50 p-4" style={{ background: "color-mix(in srgb, var(--bg-primary) 50%, transparent)" }}>
          <span className="text-sm text-text-primary">
            Hozirda <strong>{awaitingCutoffCount} ta</strong> faol buyurtma yuborilmagan.
          </span>
          <button
            type="button"
            disabled={cutoffRunning || awaitingCutoffCount === 0}
            onClick={handleCutoff}
            className="cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 sm:text-sm"
            style={{ background: "var(--status-warning)", color: "#fff" }}
          >
            {cutoffRunning ? "Bajarilmoqda..." : "Cutoffni hozir ishga tushirish"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders pipeline */}
        <div className="overflow-hidden rounded-2xl border border-border-primary lg:col-span-2" style={{ background: "var(--bg-secondary)" }}>
          <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
            <h3 className="font-display font-bold text-text-primary">Buyurtmalar oqimi</h3>
            <span className="text-xs text-text-secondary">{pipelineOrders.length} ta faol</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-primary">
                  {["#ID", "Mijoz", "Mahsulot", "Qiymati", "Holati", ""].map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipelineOrders.map((order) => {
                  const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PLACED;
                  return (
                    <tr key={order.id} className="border-b border-border-primary/60 transition-colors hover:bg-[color:color-mix(in_srgb,var(--accent)_6%,transparent)]">
                      <td className="px-4 py-3 text-sm tabular-nums text-text-secondary">#{order.id.slice(-5)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">{order.org}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{order.itemsCount} dona</td>
                      <td className="px-4 py-3 text-sm font-bold tabular-nums" style={{ color: "var(--accent)" }}>{fmtUzs(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/orders`)}
                          className="cursor-pointer rounded-lg border border-border-primary px-2.5 py-1.5 text-xs font-bold text-text-primary transition-colors hover:bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)]"
                        >
                          Ko'rish
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pipelineOrders.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-text-secondary">Faol buyurtmalar mavjud emas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* GMV by status */}
        <div className="rounded-2xl border border-border-primary p-5" style={{ background: "var(--bg-secondary)" }}>
          <h3 className="mb-4 font-display font-bold text-text-primary">Holatlar kesimida GMV</h3>
          <ul className="space-y-3">
            {statusBreakdown.map((sb) => {
              const cfg = STATUS_CONFIG[sb.status] ?? STATUS_CONFIG.PLACED;
              return (
                <li key={sb.status} className="flex items-center justify-between border-b border-border-primary/40 pb-2 text-sm last:border-0 last:pb-0">
                  <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="tabular-nums text-text-secondary">{sb.count} · <strong>{sb.gmv.toLocaleString("ru-RU")}</strong></span>
                </li>
              );
            })}
            {statusBreakdown.length === 0 && <li className="text-sm text-text-secondary">Ma'lumot yo'q.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
