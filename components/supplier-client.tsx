"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Coins,
  Plus,
} from "lucide-react";
import { productEmoji } from "@/lib/product-emoji";
import { resolvePoWeb } from "@/app/supplier/actions";
import type { Locale } from "@/lib/i18n";
import { t, unitLabel, uzs } from "@/lib/i18n";

type PurchaseOrderLine = {
  id: string;
  qty: number;
  qtyActual: number | null;
  price: number;
  costPrice: number;
  offer: {
    product: {
      nameUz: string;
      nameRu: string;
      unit: string;
      category: string;
    };
  };
};

type WebPurchaseOrder = {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  address: string;
  deliveryDate: string;
  lines: PurchaseOrderLine[];
};

type WebOffer = {
  id: string;
  productId: string;
  costPrice: number;
  price: number;
  available: boolean;
  product: {
    nameUz: string;
    nameRu: string;
    category: string;
    unit: string;
    imageUrl: string | null;
  };
};

type SupplierClientProps = {
  locale: Locale;
  payoutGross: number;
  payoutOrders: number;
  payoutLines: number;
  initialOffers: WebOffer[];
  purchaseOrders: WebPurchaseOrder[];
};

// Order management + price list body. Rendered inside SupplierShell (which
// owns the page chrome: header card, 4-tab nav, ambient blobs) — see
// docs/SUPPLIER_DASHBOARD.md section 5.
export function SupplierClient({
  locale,
  payoutGross,
  payoutOrders,
  payoutLines,
  initialOffers,
  purchaseOrders,
}: SupplierClientProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "offers">("orders");
  const [expanded, setExpanded] = useState<string | null>(
    purchaseOrders.length > 0 ? purchaseOrders[0].id : null
  );
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const localized = (p: { nameUz: string; nameRu: string }) =>
    (locale === "ru" ? p.nameRu : p.nameUz) || p.nameUz;

  async function handleConfirmPO(poId: string, action: "confirm" | "reject") {
    setLoadingAction(poId + action);
    try {
      const res = await resolvePoWeb(poId, action);
      if (res?.error) {
        alert(
          res.error === "forbidden"
            ? t(locale, "sp_err_forbidden")
            : res.error === "already_resolved"
            ? t(locale, "sp_err_already")
            : t(locale, "error_generic")
        );
      } else {
        alert(t(locale, "sp_po_resolved"));
        window.location.reload();
      }
    } catch {
      alert(t(locale, "error_generic"));
    } finally {
      setLoadingAction(null);
    }
  }

  const newCount = purchaseOrders.filter((po) => po.status === "SENT").length;

  return (
    <div className="space-y-6">
      {/* Weekly payout statement */}
      <section
        className="glass-card rounded-2xl p-5"
        style={{
          border: "1px solid color-mix(in oklab, var(--accent) 25%, transparent)",
          background: "var(--status-success-bg)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--accent)", fontFamily: "var(--font-display, Inter)" }}
            >
              {t(locale, "sp_payout_week_title")}
            </h2>
            <p
              className="mt-1 text-2xl font-bold tabular-nums"
              style={{ color: "var(--accent)" }}
            >
              {uzs(locale, payoutGross)}
            </p>
          </div>
          <Coins className="w-8 h-8 opacity-40" style={{ color: "var(--accent)" }} aria-hidden />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {payoutGross > 0
            ? t(locale, "sp_payout_summary", { orders: payoutOrders, lines: payoutLines })
            : t(locale, "sp_payout_none")}{" "}
          · {t(locale, "sp_payout_note")}
        </p>
      </section>

      {/* Orders / Prices tabs */}
      <div className="flex rounded-xl p-1 bg-bg-secondary border border-border-primary">
        <button
          onClick={() => setActiveTab("orders")}
          className="flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer"
          style={
            activeTab === "orders"
              ? {
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  fontFamily: "var(--font-display, Inter)",
                }
              : { color: "var(--text-secondary)", fontFamily: "var(--font-display, Inter)" }
          }
        >
          {t(locale, "sp_tab_orders", { n: newCount })}
        </button>
        <button
          onClick={() => setActiveTab("offers")}
          className="flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer"
          style={
            activeTab === "offers"
              ? {
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  fontFamily: "var(--font-display, Inter)",
                }
              : { color: "var(--text-secondary)", fontFamily: "var(--font-display, Inter)" }
          }
        >
          {t(locale, "sp_tab_prices", { n: initialOffers.length })}
        </button>
      </div>

      {/* Dynamic content rendering */}
      <AnimatePresence mode="wait">
        {activeTab === "orders" ? (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {purchaseOrders.map((po) => {
              const isOpen = expanded === po.id;
              const total = po.lines.reduce((s, l) => s + l.qty * l.costPrice, 0);

              return (
                <div
                  key={po.id}
                  className="glass-card rounded-2xl border border-border-primary overflow-hidden shadow-md"
                >
                  {/* Accordion trigger */}
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : po.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-sm text-text-primary"
                        style={{ fontFamily: "var(--font-display, Inter)" }}
                      >
                        {t(locale, "order_number_prefix")}
                        {po.id.slice(-6).toUpperCase()} — {po.buyerName}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {t(locale, "sp_delivery_label")} {po.deliveryDate} · {po.address}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      {po.status !== "SENT" ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold"
                          style={
                            po.status === "CONFIRMED"
                              ? {
                                  background: "var(--status-success-bg)",
                                  color: "var(--status-success)",
                                  fontFamily: "var(--font-display, Inter)",
                                }
                              : {
                                  background: "var(--status-danger-bg)",
                                  color: "var(--status-danger)",
                                  fontFamily: "var(--font-display, Inter)",
                                }
                          }
                        >
                          {po.status === "CONFIRMED"
                            ? t(locale, "sp_po_confirmed")
                            : t(locale, "sp_po_rejected")}
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{
                            background: "var(--status-warning-bg)",
                            color: "var(--status-warning)",
                            fontFamily: "var(--font-display, Inter)",
                          }}
                        >
                          {t(locale, "sp_po_new")}
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp size={16} className="text-text-secondary" />
                      ) : (
                        <ChevronDown size={16} className="text-text-secondary" />
                      )}
                    </div>
                  </button>

                  {/* Accordion content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div className="border-t border-border-primary/50 mb-4" />

                          <div className="space-y-3 mb-5">
                            {po.lines.map((l) => (
                              <div
                                key={l.id}
                                className="flex items-center gap-3 p-3 rounded-xl border border-border-primary/40 bg-bg-secondary/20"
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-bg-secondary/50 border border-border-primary flex-shrink-0">
                                  {productEmoji(l.offer.product.nameUz, l.offer.product.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-sm font-semibold text-text-primary truncate"
                                    style={{ fontFamily: "var(--font-display, Inter)" }}
                                  >
                                    {localized(l.offer.product)}
                                  </div>
                                  <div className="text-xs text-text-secondary tabular-nums">
                                    {l.qty} {unitLabel(locale, l.offer.product.unit)} ·{" "}
                                    {uzs(locale, l.costPrice)} / {unitLabel(locale, l.offer.product.unit)}
                                  </div>
                                </div>
                                <div className="text-sm font-bold text-text-primary tabular-nums">
                                  {uzs(locale, l.qty * l.costPrice)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {po.status === "SENT" ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-primary/50">
                              <div className="text-left">
                                <div className="text-xs text-text-secondary">
                                  {t(locale, "sp_you_get")}
                                </div>
                                <div
                                  className="font-bold tabular-nums"
                                  style={{ color: "var(--accent)" }}
                                >
                                  {uzs(locale, total)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  disabled={loadingAction !== null}
                                  onClick={() => handleConfirmPO(po.id, "reject")}
                                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
                                  style={{
                                    background: "var(--status-danger-bg)",
                                    color: "var(--status-danger)",
                                    border:
                                      "1px solid color-mix(in oklab, var(--status-danger) 25%, transparent)",
                                    fontFamily: "var(--font-display, Inter)",
                                  }}
                                >
                                  {loadingAction === po.id + "reject" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <XCircle size={14} />
                                  )}
                                  {t(locale, "sp_reject_btn")}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  disabled={loadingAction !== null}
                                  onClick={() => handleConfirmPO(po.id, "confirm")}
                                  className="glow-button flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50"
                                  style={{
                                    background: "var(--accent)",
                                    color: "var(--bg-primary)",
                                    fontFamily: "var(--font-display, Inter)",
                                  }}
                                >
                                  {loadingAction === po.id + "confirm" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={14} />
                                  )}
                                  {t(locale, "sp_confirm_btn")}
                                </motion.button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-3 border-t border-border-primary/50 flex justify-between text-xs text-text-secondary tabular-nums">
                              <span>
                                {t(locale, "sp_status_label")}:{" "}
                                {po.status === "CONFIRMED"
                                  ? t(locale, "sp_po_confirmed")
                                  : t(locale, "sp_po_rejected")}
                              </span>
                              <span>
                                {t(locale, "sp_value_label")}: {uzs(locale, total)}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {purchaseOrders.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                {t(locale, "sp_no_pos")}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="offers"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Read-only price list. Adding/editing products lives only under
                the Mahsulotlar tab — see ProductUploadForm. */}
            <div className="glass-card rounded-2xl border border-border-primary overflow-hidden shadow-md">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-primary bg-bg-secondary/40">
                <h3
                  className="text-xs font-semibold text-text-secondary uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-display, Inter)" }}
                >
                  {t(locale, "sp_my_products_header")}
                </h3>
                <Link
                  href="/supplier/products/new"
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  style={{
                    background: "var(--accent-glow)",
                    color: "var(--accent)",
                    fontFamily: "var(--font-display, Inter)",
                  }}
                >
                  <Plus size={13} aria-hidden />
                  {t(locale, "sp_manage_products_cta")}
                </Link>
              </div>
              <ul className="divide-y divide-border-primary/40">
                {initialOffers.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                  >
                    {o.product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.product.imageUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-xl object-cover border border-border-primary"
                      />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-secondary/50 border border-border-primary text-lg">
                        {productEmoji(o.product.nameUz, o.product.category)}
                      </span>
                    )}

                    <span
                      className="min-w-0 flex-1 truncate font-semibold text-text-primary"
                      style={{ fontFamily: "var(--font-display, Inter)" }}
                    >
                      {localized(o.product)}
                      <span className="text-xs font-normal text-text-secondary">
                        {" "}
                        / {unitLabel(locale, o.product.unit)}
                      </span>
                    </span>

                    <span className="font-bold tabular-nums text-text-primary">
                      {uzs(locale, o.costPrice)}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={
                        o.available
                          ? {
                              background: "var(--status-success-bg)",
                              color: "var(--status-success)",
                            }
                          : {
                              background: "var(--status-danger-bg)",
                              color: "var(--status-danger)",
                            }
                      }
                    >
                      {o.available
                        ? t(locale, "sp_available")
                        : t(locale, "sp_unavailable")}
                    </span>
                  </li>
                ))}
                {initialOffers.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-text-secondary">
                    {t(locale, "sp_no_offers")}
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
