"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket, type BasketItem } from "@/components/basket-provider";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";
import {
  DELIVERY_SLOTS,
  DEFAULT_DELIVERY_SLOT,
  defaultDeliveryDateInput,
  resolveDeliveryWindow,
  toDateInputValue,
} from "@/lib/delivery";
import { Minus, Plus, Trash2, ChevronRight, Loader2, Info, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function BasketClient({ locale }: { locale: Locale }) {
  const { items, setQty, clear, total } = useBasket();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  // Form values
  const [org, setOrg] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [address, setAddress] = useState("");
  // Customer-chosen delivery window: default to tomorrow's earliest slot.
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDateInput);
  const [deliverySlot, setDeliverySlot] = useState(DEFAULT_DELIVERY_SLOT);

  // Today (local) is the minimum selectable delivery day.
  const minDate = useMemo(() => toDateInputValue(new Date()), []);

  const bySupplier = useMemo(() => {
    const m = new Map<string, BasketItem[]>();
    for (const i of items) {
      m.set(i.supplierName, [...(m.get(i.supplierName) ?? []), i]);
    }
    return [...m.entries()];
  }, [items]);

  const totalItems = items.reduce((s, b) => s + b.qty, 0);

  async function handlePlace(e: React.FormEvent) {
    e.preventDefault();
    if (!org.trim() || !phone.trim() || !address.trim() || items.length === 0) return;

    // Validate the chosen delivery window before sending (server re-checks too).
    if (!deliveryDate || !deliverySlot) {
      setError(t(locale, "dt_err_required"));
      return;
    }
    if (!resolveDeliveryWindow(deliveryDate, deliverySlot)) {
      setError(t(locale, "dt_err_past"));
      return;
    }

    setState("sending");
    setError(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: org,
        buyerPhone: phone,
        address,
        deliveryDate,
        deliverySlot,
        items: items.map((i) => ({ offerId: i.offerId, qty: i.qty })),
      }),
    }).catch(() => null);

    if (res?.ok) {
      clear();
      router.push("/orders?placed=1");
    } else {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? t(locale, "error_generic"));
      setState("idle");
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-6" aria-hidden="true">🛒</div>
          <h2
            style={{
              fontFamily: "var(--font-display, Outfit), sans-serif",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontSize: "1.5rem",
            }}
          >
            {t(locale, "basket_empty")}
          </h2>
          <p
            className="mt-2 text-text-secondary"
            style={{ fontFamily: "var(--font-body, Inter), sans-serif" }}
          >
            {t(locale, "basket_empty_hint")}
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
          style={{ width: 500, height: 500, top: "-5%", left: "-10%", background: "var(--accent)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1
          className="mb-8 font-extrabold text-2xl tracking-tight text-text-primary"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {t(locale, "basket_title")}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Left — Supplier Groups */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {bySupplier.map(([supplier, list]) => (
                <motion.div
                  key={supplier}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card rounded-2xl overflow-hidden shadow-lg border border-border-primary"
                >
                  <div
                    className="px-5 py-3.5 border-b border-border-primary bg-bg-secondary/40"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span
                        className="font-bold text-sm text-text-primary"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {supplier}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--status-success-bg)",
                          color: "var(--status-success)",
                        }}
                      >
                        {list.length} {t(locale, "basket_items_short")}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-border-primary/50">
                    <AnimatePresence mode="popLayout">
                      {list.map((i) => (
                        <motion.div
                          key={i.offerId}
                          layout
                          exit={{ opacity: 0, x: -50 }}
                          className="flex items-center gap-4 px-5 py-4"
                        >
                          {i.image ? (
                            <img
                              src={i.image}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-border-primary flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-bg-secondary/50 border border-border-primary">
                              {productEmoji(i.productName, "")}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-semibold truncate text-text-primary"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {i.productName}
                            </div>
                            <div
                              className="text-xs mt-0.5 text-text-secondary"
                              style={{ fontFamily: "JetBrains Mono, monospace" }}
                            >
                              {uzs(locale, i.price)} / {unitLabel(locale, i.unit)}
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-2 rounded-full px-2 py-1 flex-shrink-0 select-none"
                            style={{
                              background: "var(--status-success-bg)",
                              border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setQty(i.offerId, Math.max(0, i.qty - 1))}
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                              {i.qty === 1 ? (
                                <Trash2 size={11} className="text-red-400" />
                              ) : (
                                <Minus size={11} className="text-emerald-500" />
                              )}
                            </button>
                            <span
                              className="w-12 text-center text-sm font-bold text-emerald-500"
                              style={{ fontFamily: "JetBrains Mono, monospace" }}
                            >
                              {i.qty} {unitLabel(locale, i.unit)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(i.offerId, i.qty + 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <Plus size={11} className="text-emerald-500" />
                            </button>
                          </div>

                          <div
                            className="text-sm font-bold flex-shrink-0 text-text-primary"
                            style={{ fontFamily: "JetBrains Mono, monospace" }}
                          >
                            {uzs(locale, Math.round(i.price * i.qty))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Right — Checkout Card (Sticky) */}
          <div className="lg:sticky lg:top-24 h-fit">
            <form
              onSubmit={handlePlace}
              className="glass-card rounded-2xl p-6 space-y-5 border border-border-primary shadow-xl"
            >
              <h2
                className="text-text-primary text-base font-extrabold flex items-center gap-2"
                style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
              >
                {t(locale, "basket_checkout_title")}
              </h2>

              {/* Price Summary */}
              <div
                className="space-y-2 pb-4 border-b border-border-primary"
              >
                <div className="flex justify-between text-sm text-text-secondary">
                  <span style={{ fontFamily: "var(--font-body, Inter), sans-serif" }}>
                    {t(locale, "basket_items_label")} ({totalItems})
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ fontFamily: "var(--font-display, JetBrains Mono), monospace" }}
                  >
                    {uzs(locale, total)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-text-secondary">
                  <span style={{ fontFamily: "var(--font-body, Inter), sans-serif" }}>
                    {t(locale, "dt_summary_label")}
                  </span>
                  <span
                    className="font-bold"
                    style={{
                      fontFamily: "var(--font-display, Outfit), sans-serif",
                      color: "var(--status-success)",
                    }}
                  >
                    {t(locale, "basket_delivery_free")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span
                    className="font-bold text-text-primary"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t(locale, "total")}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: "var(--font-display, JetBrains Mono), monospace",
                      color: "var(--accent)",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                    }}
                  >
                    {uzs(locale, total)}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                {[
                  {
                    label: t(locale, "basket_field_org"),
                    value: org,
                    set: setOrg,
                    placeholder: t(locale, "ph_org"),
                  },
                  {
                    label: t(locale, "basket_field_phone"),
                    value: phone,
                    set: setPhone,
                    placeholder: t(locale, "ph_phone"),
                  },
                  {
                    label: t(locale, "basket_field_address"),
                    value: address,
                    set: setAddress,
                    placeholder: t(locale, "ph_address"),
                  },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label
                      className="block text-xs font-semibold mb-1.5 text-text-secondary"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {label}
                    </label>
                    <input
                      required
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border border-border-primary bg-bg-secondary/60 text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-text-secondary/40"
                    />
                  </div>
                ))}
              </div>

              {/* Delivery time — customer picks day + 2h window */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <Clock size={15} style={{ color: "var(--accent)" }} aria-hidden="true" />
                  <span
                    className="text-sm font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
                  >
                    {t(locale, "dt_section_title")}
                  </span>
                </div>
                <p
                  className="text-xs -mt-1 text-text-secondary"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {t(locale, "dt_section_hint")}
                </p>

                <div>
                  <label
                    htmlFor="delivery-date"
                    className="block text-xs font-semibold mb-1.5 text-text-secondary"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t(locale, "dt_date_label")}
                  </label>
                  <input
                    id="delivery-date"
                    type="date"
                    required
                    min={minDate}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border border-border-primary bg-bg-secondary/60 text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div>
                  <span
                    className="block text-xs font-semibold mb-1.5 text-text-secondary"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t(locale, "dt_window_label")}
                  </span>
                  <div
                    role="radiogroup"
                    aria-label={t(locale, "dt_window_aria")}
                    className="grid grid-cols-2 gap-2"
                  >
                    {DELIVERY_SLOTS.map((slot) => {
                      const active = slot.value === deliverySlot;
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setDeliverySlot(slot.value)}
                          className="px-2 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            background: active
                              ? "var(--status-success-bg)"
                              : "var(--bg-secondary)",
                            borderColor: active
                              ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                              : "var(--border-primary)",
                            color: active
                              ? "var(--status-success)"
                              : "var(--text-secondary)",
                          }}
                        >
                          {slot.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Payment Note */}
              <div
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: "var(--status-warning-bg)",
                  border: "1px solid color-mix(in srgb, var(--status-warning) 25%, transparent)",
                  color: "var(--status-warning)",
                }}
              >
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                  {t(locale, "pay_note")}
                </p>
              </div>

              {error && <p className="text-sm text-red-400 font-semibold">{error}</p>}

              {/* Place Order Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={state === "sending" || !org || !phone || !address}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  fontFamily: "var(--font-display, Outfit), sans-serif",
                  fontSize: "1rem",
                  boxShadow: "var(--shadow-md), var(--shadow-glow-accent)",
                }}
              >
                {state === "sending" ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span>{t(locale, "place_order")}</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace" }}>· {uzs(locale, total)}</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
