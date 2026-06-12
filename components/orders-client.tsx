"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";
import { paynetPayUrl, uzumPayUrl } from "@/lib/payments/links";
import { ChevronDown, ChevronUp, RefreshCw, CreditCard, CheckCircle, Clock, Truck, PackageCheck, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type OrderItemWithDetails = {
  id: string;
  qty: number;
  qtyActual: number | null;
  price: number;
  offer: {
    offerId: string;
    product: {
      nameUz: string;
      nameRu: string;
      unit: string;
      category: string;
      image: string | null;
    };
    supplier: {
      name: string;
    };
  };
};

type OrderWithItems = {
  id: string;
  deliveryDate: string; // pre-formatted or parsed
  status: string;
  address: string;
  total: number;
  paidAt: boolean;
  items: OrderItemWithDetails[];
};

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ComponentType<any> }
> = {
  PLACED: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: Clock },
  CONFIRMED: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: CheckCircle },
  PARTIAL: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: CheckCircle },
  DELIVERING: { color: "#818cf8", bg: "rgba(129,140,248,0.12)", icon: Truck },
  DELIVERED: { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: PackageCheck },
  CANCELLED: { color: "#78716c", bg: "rgba(120,113,108,0.12)", icon: XCircle },
};

export function OrdersClient({
  initialOrders,
  locale,
  placed,
}: {
  initialOrders: OrderWithItems[];
  locale: Locale;
  placed?: boolean;
}) {
  const router = useRouter();
  const { setQty } = useBasket();
  const [expanded, setExpanded] = useState<string | null>(
    initialOrders.length > 0 ? initialOrders[0].id : null
  );
  const [reorderBusy, setReorderBusy] = useState<string | null>(null);

  async function handleReorder(orderId: string) {
    setReorderBusy(orderId);
    const res = await fetch(`/api/orders/${orderId}/reorder?locale=${locale}`).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    if (!data || data.items.length === 0) {
      alert(t(locale, "error_generic"));
      setReorderBusy(null);
      return;
    }
    for (const item of data.items) {
      const { qty, ...rest } = item;
      setQty(item.offerId, qty, rest);
    }
    router.push("/basket");
  }

  if (initialOrders.length === 0 && !placed) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-6">📋</div>
          <h2 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, color: "var(--text-primary)", fontSize: "1.5rem" }}>
            {t(locale, "orders_empty")}
          </h2>
          <p className="mt-2" style={{ color: "var(--text-secondary)", fontFamily: "Inter, sans-serif" }}>
            <button
              onClick={() => router.push("/catalog")}
              className="text-emerald-500 font-semibold hover:underline cursor-pointer"
            >
              {t(locale, "go_catalog")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-8"
          style={{ width: 500, height: 500, top: "30%", right: "-10%", background: "#818cf8" }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1
          className="mb-8 font-extrabold text-2xl tracking-tight text-text-primary"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {t(locale, "orders_title")}
        </h1>

        {placed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-sm font-semibold text-emerald-400"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {t(locale, "order_placed_banner")}
          </motion.div>
        )}

        <div className="space-y-4">
          {initialOrders.map((order) => {
            const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PLACED;
            const StatusIcon = sc.icon;
            const isOpen = expanded === order.id;
            const statusKey = `status_${order.status}`;

            return (
              <motion.div
                key={order.id}
                layout
                className="glass-card rounded-2xl overflow-hidden border border-border-primary shadow-lg"
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-bold text-sm text-text-primary"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {locale === "uz" ? "Buyurtma #" : "Заказ #"}{order.id}
                      </span>
                    </div>
                    <div
                      className="text-xs text-text-secondary"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {order.deliveryDate} · {order.address}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status Pill */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-primary"
                      style={{ background: sc.bg, borderColor: `${sc.color}40` }}
                    >
                      <StatusIcon size={12} style={{ color: sc.color }} />
                      <span
                        className="text-xs font-bold"
                        style={{ color: sc.color, fontFamily: "Outfit, sans-serif" }}
                      >
                        {t(locale, statusKey as any)}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-text-secondary" />
                    ) : (
                      <ChevronDown size={16} className="text-text-secondary" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="border-t border-border-primary mb-4" />

                        {/* Items */}
                        <div className="space-y-3 mb-5">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-bg-secondary/50 border border-border-primary">
                                {productEmoji(
                                  item.offer.product.nameUz,
                                  item.offer.product.category
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-sm font-semibold text-text-primary truncate"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  {locale === "ru"
                                    ? item.offer.product.nameRu
                                    : item.offer.product.nameUz}
                                </div>
                                <div
                                  className="text-xs text-text-secondary truncate"
                                  style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                  {item.offer.supplier.name} ·{" "}
                                  <span className="font-semibold text-text-primary">
                                    {item.qtyActual ?? item.qty}{" "}
                                    {unitLabel(locale, item.offer.product.unit)}
                                  </span>
                                </div>
                              </div>
                              <div
                                className="text-sm font-bold flex-shrink-0 text-text-primary"
                                style={{ fontFamily: "JetBrains Mono, monospace" }}
                              >
                                {uzs(locale, (item.qtyActual ?? item.qty) * item.price)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer details */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-primary/50">
                          {/* Payment status */}
                          <div className="flex items-center gap-2">
                            {order.paidAt ? (
                              <div
                                className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400"
                              >
                                <CheckCircle size={14} />
                                <span style={{ fontFamily: "Outfit, sans-serif" }}>
                                  {t(locale, "paid")}
                                </span>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-1.5 text-sm font-semibold text-amber-500"
                              >
                                <Clock size={14} />
                                <span style={{ fontFamily: "Outfit, sans-serif" }}>
                                  {locale === "uz" ? "Yetkazishda to'lov" : "Оплата при доставке"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Total price */}
                            <span
                              className="font-bold text-emerald-500 mr-2"
                              style={{ fontFamily: "JetBrains Mono, monospace" }}
                            >
                              {uzs(locale, order.total)}
                            </span>

                            {/* Payment links if unpaid */}
                            {!order.paidAt && order.status !== "CANCELLED" && (
                              <>
                                {uzumPayUrl(order.id, order.total) && (
                                  <motion.a
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    href={uzumPayUrl(order.id, order.total)!}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600/20 text-violet-400 border border-violet-600/30 transition-all select-none"
                                  >
                                    <CreditCard size={12} />
                                    Uzum Pay
                                  </motion.a>
                                )}
                                {paynetPayUrl(order.id, order.total) && (
                                  <motion.a
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    href={paynetPayUrl(order.id, order.total)!}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 transition-all select-none"
                                  >
                                    <CreditCard size={12} />
                                    Paynet
                                  </motion.a>
                                )}
                              </>
                            )}

                            {/* Reorder button */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={reorderBusy === order.id}
                              onClick={() => handleReorder(order.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50 cursor-pointer select-none"
                            >
                              <RefreshCw
                                size={12}
                                className={reorderBusy === order.id ? "animate-spin" : ""}
                              />
                              {reorderBusy === order.id ? "..." : t(locale, "reorder")}
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
