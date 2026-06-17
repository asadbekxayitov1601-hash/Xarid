"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket } from "./basket-provider";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";
import { paynetPayUrl, uzumPayUrl } from "@/lib/payments/links";
import { ChevronDown, ChevronUp, RefreshCw, CreditCard, CheckCircle, Clock, Truck, PackageCheck, XCircle, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

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
  // Consumer pivot: "ASAP" renders a live relative ETA; "SCHEDULED" renders the
  // pre-formatted chosen day + window (`scheduledLabel`).
  deliverMode: "ASAP" | "SCHEDULED";
  deliveryTargetMs: number; // epoch ms target time (for ASAP ETA)
  scheduledLabel: string; // pre-formatted day + window (for SCHEDULED)
  status: string;
  address: string;
  // `total` is the items subtotal (the money model keeps Order.total = subtotal).
  total: number;
  // Surge-applied delivery fee the customer pays in cash. null on legacy orders
  // (predating Phase 2) -> we show just the subtotal with no delivery breakdown.
  // 0 means free delivery (basket cleared the threshold).
  deliveryFee: number | null;
  paidAt: boolean;
  items: OrderItemWithDetails[];
};

// Statuses that mean the courier is actively bringing the order — used to show
// the consumer "on the way" banner + a live-tracking link.
const ON_THE_WAY = new Set(["DELIVERING"]);

/**
 * Consumer-facing delivery line for an order. ASAP orders show a live relative
 * ETA ("Today, in ~45 min"); once the target passes (or for in-flight orders)
 * we soften to "Today, very soon". Scheduled orders show their chosen window.
 */
function deliveryLine(locale: Locale, order: OrderWithItems): string {
  if (order.deliverMode !== "ASAP") return order.scheduledLabel;
  const diffMs = order.deliveryTargetMs - Date.now();
  const mins = Math.round(diffMs / 60000);
  // Terminal states don't need a countdown.
  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    return t(locale, "b2c_ord_asap");
  }
  if (mins < 5) return t(locale, "b2c_ord_asap_soon");
  // Round up to the nearest 5 minutes for a friendly, non-jittery estimate.
  const rounded = Math.min(90, Math.ceil(mins / 5) * 5);
  return t(locale, "b2c_ord_asap_eta", { min: rounded });
}

// Status pill colors pull from the design-system semantic tokens
// (docs/DESIGN_SYSTEM.md): amber = waiting / partial, sky = in motion,
// emerald = done, red = cancelled. Both dark and light values live in
// app/globals.css, so no raw hex here.
const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ComponentType<any> }
> = {
  PLACED: { color: "var(--status-warning)", bg: "var(--status-warning-bg)", icon: Clock },
  CONFIRMED: { color: "var(--status-info)", bg: "var(--status-info-bg)", icon: CheckCircle },
  PARTIAL: { color: "var(--status-warning)", bg: "var(--status-warning-bg)", icon: CheckCircle },
  DELIVERING: { color: "var(--accent-3)", bg: "var(--accent-3-glow)", icon: Truck },
  DELIVERED: { color: "var(--status-success)", bg: "var(--status-success-bg)", icon: PackageCheck },
  CANCELLED: { color: "var(--status-danger)", bg: "var(--status-danger-bg)", icon: XCircle },
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
              {t(locale, "go_catalog")} →
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
          style={{ width: 500, height: 500, top: "30%", right: "-10%", background: "var(--accent-3)" }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1
          className="mb-1 font-extrabold text-2xl tracking-tight text-text-primary"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {t(locale, "orders_title")}
        </h1>
        <p
          className="mb-8 text-sm text-text-secondary"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {t(locale, "b2c_ord_subtitle")}
        </p>

        {placed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl p-4 text-sm font-semibold flex items-center gap-2"
            style={{
              background: "var(--status-success-bg)",
              border: "1px solid color-mix(in srgb, var(--status-success) 25%, transparent)",
              color: "var(--status-success)",
              fontFamily: "var(--font-display, Outfit), sans-serif",
            }}
          >
            <CheckCircle size={16} aria-hidden="true" />
            {t(locale, "b2c_ord_placed_banner")}
          </motion.div>
        )}

        <div className="space-y-4">
          {initialOrders.map((order) => {
            const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PLACED;
            const StatusIcon = sc.icon;
            const isOpen = expanded === order.id;
            const statusKey = `status_${order.status}`;
            const deliveryText = deliveryLine(locale, order);
            const isOnTheWay = ON_THE_WAY.has(order.status);
            // Phase 2 fee breakdown. `total` is the items subtotal; the customer
            // pays subtotal + deliveryFee. Legacy rows (deliveryFee null) show no
            // breakdown and the grand total is just the subtotal.
            const hasFee = order.deliveryFee != null;
            const fee = order.deliveryFee ?? 0;
            const isFreeDelivery = hasFee && fee === 0;
            const grandTotal = order.total + fee;

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
                        style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
                      >
                        {t(locale, "order_number_prefix")}
                        {order.id}
                      </span>
                    </div>
                    <div
                      className="text-xs text-text-secondary"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {deliveryText} · {order.address}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status Pill */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-primary"
                      style={{
                        background: sc.bg,
                        borderColor: `color-mix(in srgb, ${sc.color} 30%, transparent)`,
                      }}
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

                        {/* "On the way" banner + live tracking link */}
                        {isOnTheWay && (
                          <Link
                            href={`/track/${order.id}`}
                            className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all hover:opacity-90"
                            style={{
                              background: "var(--accent-3-glow)",
                              borderColor: "color-mix(in srgb, var(--accent-3) 30%, transparent)",
                            }}
                          >
                            <Truck size={18} style={{ color: "var(--accent-3)" }} aria-hidden="true" />
                            <span
                              className="flex-1 text-sm font-semibold"
                              style={{ color: "var(--accent-3)", fontFamily: "Outfit, sans-serif" }}
                            >
                              {t(locale, "b2c_ord_on_the_way")}
                            </span>
                            <span
                              className="flex items-center gap-1 text-xs font-bold"
                              style={{ color: "var(--accent-3)", fontFamily: "Outfit, sans-serif" }}
                            >
                              <MapPin size={12} aria-hidden="true" />
                              {t(locale, "b2c_ord_track")}
                            </span>
                          </Link>
                        )}

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

                        {/* Fee breakdown: items + delivery = grand total.
                            Only when the order carries a Phase 2 delivery fee. */}
                        {hasFee && (
                          <div className="mb-4 space-y-1.5 rounded-2xl px-4 py-3 bg-bg-secondary/50 border border-border-primary">
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: "var(--text-secondary)", fontFamily: "Inter, sans-serif" }}>
                                {t(locale, "df_items")}
                              </span>
                              <span
                                className="font-semibold text-text-primary tabular-nums"
                                style={{ fontFamily: "JetBrains Mono, monospace" }}
                              >
                                {uzs(locale, order.total)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span style={{ color: "var(--text-secondary)", fontFamily: "Inter, sans-serif" }}>
                                {t(locale, "df_delivery")}
                              </span>
                              {isFreeDelivery ? (
                                <span
                                  className="font-bold tabular-nums"
                                  style={{ color: "var(--status-success)", fontFamily: "Outfit, sans-serif" }}
                                >
                                  {t(locale, "df_free")}
                                </span>
                              ) : (
                                <span
                                  className="font-semibold text-text-primary tabular-nums"
                                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                                >
                                  {uzs(locale, fee)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-border-primary/50">
                              <span
                                className="text-sm font-bold text-text-primary"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                {t(locale, "df_grand_total")}
                              </span>
                              <span
                                className="text-sm font-bold text-emerald-500 tabular-nums"
                                style={{ fontFamily: "JetBrains Mono, monospace" }}
                              >
                                {uzs(locale, grandTotal)}
                              </span>
                            </div>
                          </div>
                        )}

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
                                className="flex items-center gap-1.5 text-sm font-semibold"
                                style={{ color: "var(--status-warning)" }}
                              >
                                <Clock size={14} />
                                <span style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}>
                                  {t(locale, "pay_on_delivery")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Grand total the customer pays (subtotal + delivery).
                                Equals the subtotal on legacy rows with no fee. */}
                            <span
                              className="font-bold text-emerald-500 mr-2 tabular-nums"
                              style={{ fontFamily: "JetBrains Mono, monospace" }}
                            >
                              {uzs(locale, grandTotal)}
                            </span>

                            {/* Payment links if unpaid */}
                            {!order.paidAt && order.status !== "CANCELLED" && (
                              <>
                                {uzumPayUrl(order.id, grandTotal) && (
                                  <motion.a
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    href={uzumPayUrl(order.id, grandTotal)!}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600/20 text-violet-400 border border-violet-600/30 transition-all select-none"
                                  >
                                    <CreditCard size={12} />
                                    Uzum Pay
                                  </motion.a>
                                )}
                                {paynetPayUrl(order.id, grandTotal) && (
                                  <motion.a
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    href={paynetPayUrl(order.id, grandTotal)!}
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
