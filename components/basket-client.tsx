"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket, type BasketItem } from "@/components/basket-provider";
import { LocationPicker } from "@/components/location-picker";
import { t, unitLabel, uzs, type Locale } from "@/lib/i18n";
import { productEmoji } from "@/lib/product-emoji";
import { formatUzPhone } from "@/lib/format";
import {
  DEFAULT_DELIVER_MODE,
  type DeliverMode,
  defaultDeliveryDateInput,
  resolveDeliveryTime,
  DEFAULT_DELIVERY_TIME,
  toDateInputValue,
} from "@/lib/delivery";
import { Minus, Plus, Trash2, ChevronRight, Loader2, Info, Clock, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function BasketClient({ locale }: { locale: Locale }) {
  const { items, setQty, clear, total } = useBasket();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);

  // Form values — `org` keeps its internal name but is now the recipient's
  // person name (sent as buyerName to the API; the API field is unchanged).
  const [org, setOrg] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [address, setAddress] = useState("");
  // Optional delivery map pin. Encouraged (helps the courier + auto-dispatch)
  // but never required — the address text stays the mandatory field.
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  // Delivery mode: ASAP (on-demand, default) or SCHEDULED (deliver-later window).
  const [deliverMode, setDeliverMode] = useState<DeliverMode>(DEFAULT_DELIVER_MODE);
  // Customer-chosen delivery day + typed time (only when deliverMode === SCHEDULED).
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDateInput);
  const [deliveryTime, setDeliveryTime] = useState(DEFAULT_DELIVERY_TIME);

  // Today (local) is the minimum selectable delivery day.
  const minDate = useMemo(() => toDateInputValue(new Date()), []);

  const bySupplier = useMemo(() => {
    const m = new Map<string, BasketItem[]>();
    for (const i of items) {
      m.set(i.supplierName, [...(m.get(i.supplierName) ?? []), i]);
    }
    return [...m.entries()];
  }, [items]);

  // "Mahsulotlar (N)" = number of DISTINCT products. Quantities are per-item
  // (kg / pieces), so summing them across products would be misleading.
  const totalItems = items.length;

  // What the customer still needs to fill in before the order can be placed.
  // Surfaced under the button so a disabled button is never a mystery.
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length >= 12; // +998 followed by a 9-digit number
  const missing: string[] = [];
  if (!org.trim()) missing.push(t(locale, "co_need_name"));
  if (!phoneOk) missing.push(t(locale, "co_need_phone"));
  if (!address.trim()) missing.push(t(locale, "co_need_address"));
  const canPlace = items.length > 0 && missing.length === 0 && state !== "sending";

  async function handlePlace(e: React.FormEvent) {
    e.preventDefault();
    if (!canPlace) return;

    const scheduled = deliverMode === "SCHEDULED";

    // Only the "deliver later" branch needs a validated day + window. ASAP just
    // sends the mode; the server computes a ~30-60 min ETA.
    if (scheduled) {
      if (!deliveryDate || !deliveryTime) {
        setError(t(locale, "dt_err_required"));
        return;
      }
      if (!resolveDeliveryTime(deliveryDate, deliveryTime)) {
        setError(t(locale, "dt_err_past"));
        return;
      }
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
        deliverMode,
        // Optional delivery coordinates from the map pin; omitted when unset.
        ...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
        // Only send the day + typed time for "deliver later"; ASAP omits it.
        ...(scheduled ? { deliveryDate, deliveryTime } : {}),
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
                    label: t(locale, "b2c_co_name_label"),
                    value: org,
                    set: setOrg,
                    placeholder: t(locale, "b2c_co_name_ph"),
                    hint: null as string | null,
                    format: undefined as ((v: string) => string) | undefined,
                    inputMode: "text" as "text" | "tel",
                  },
                  {
                    label: t(locale, "basket_field_phone"),
                    value: phone,
                    set: setPhone,
                    placeholder: t(locale, "ph_phone"),
                    hint: null as string | null,
                    format: formatUzPhone as ((v: string) => string) | undefined,
                    inputMode: "tel" as "text" | "tel",
                  },
                  {
                    label: t(locale, "basket_field_address"),
                    value: address,
                    set: setAddress,
                    placeholder: t(locale, "ph_address"),
                    hint: t(locale, "b2c_co_addr_hint"),
                    format: undefined as ((v: string) => string) | undefined,
                    inputMode: "text" as "text" | "tel",
                  },
                ].map(({ label, value, set, placeholder, hint, format, inputMode }) => (
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
                      inputMode={inputMode}
                      onChange={(e) => set(format ? format(e.target.value) : e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border border-border-primary bg-bg-secondary/60 text-text-primary focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-text-secondary/40"
                    />
                    {hint && (
                      <p
                        className="text-xs mt-1 text-text-secondary/70"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Delivery map pin — complements the address text. Optional but
                  encouraged: a precise pin speeds up the courier + auto-dispatch. */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-semibold text-text-secondary"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t(locale, "b2c_loc_title")}
                  </span>
                  {pin ? (
                    <button
                      type="button"
                      onClick={() => setPin(null)}
                      className="shrink-0 text-xs font-semibold transition-colors"
                      style={{ color: "var(--accent)" }}
                    >
                      {t(locale, "b2c_loc_clear")}
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] text-text-secondary/70">
                      {t(locale, "b2c_loc_optional")}
                    </span>
                  )}
                </div>
                <LocationPicker
                  locale={locale}
                  value={pin}
                  onChange={(lat, lng) => setPin({ lat, lng })}
                  height={200}
                />
                {pin && (
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--status-success)" }}
                  >
                    {t(locale, "b2c_loc_set")}
                  </p>
                )}
              </div>

              {/* Delivery mode — ASAP (default) vs "deliver later" window */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <Clock size={15} style={{ color: "var(--accent)" }} aria-hidden="true" />
                  <span
                    className="text-sm font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-display, Outfit), sans-serif" }}
                  >
                    {t(locale, "b2c_deliv_section")}
                  </span>
                </div>

                <div
                  role="radiogroup"
                  aria-label={t(locale, "b2c_deliv_section")}
                  className="grid grid-cols-1 gap-2"
                >
                  {/* ASAP */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={deliverMode === "ASAP"}
                    onClick={() => setDeliverMode("ASAP")}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={{
                      background:
                        deliverMode === "ASAP" ? "var(--status-success-bg)" : "var(--bg-secondary)",
                      borderColor:
                        deliverMode === "ASAP"
                          ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                          : "var(--border-primary)",
                    }}
                  >
                    <Zap
                      size={16}
                      className="flex-shrink-0"
                      style={{
                        color:
                          deliverMode === "ASAP" ? "var(--status-success)" : "var(--text-secondary)",
                      }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-sm font-bold text-text-primary"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {t(locale, "b2c_deliv_asap")}
                      </span>
                      <span
                        className="block text-xs text-text-secondary"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {t(locale, "b2c_deliv_asap_eta")}
                      </span>
                    </span>
                  </button>

                  {/* Deliver later */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={deliverMode === "SCHEDULED"}
                    onClick={() => setDeliverMode("SCHEDULED")}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={{
                      background:
                        deliverMode === "SCHEDULED"
                          ? "var(--status-success-bg)"
                          : "var(--bg-secondary)",
                      borderColor:
                        deliverMode === "SCHEDULED"
                          ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                          : "var(--border-primary)",
                    }}
                  >
                    <Clock
                      size={16}
                      className="flex-shrink-0"
                      style={{
                        color:
                          deliverMode === "SCHEDULED"
                            ? "var(--status-success)"
                            : "var(--text-secondary)",
                      }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-sm font-bold text-text-primary"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {t(locale, "b2c_deliv_later")}
                      </span>
                      <span
                        className="block text-xs text-text-secondary"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {t(locale, "b2c_deliv_later_hint")}
                      </span>
                    </span>
                  </button>
                </div>

                {/* The existing day + 2h window picker — only for "deliver later" */}
                {deliverMode === "SCHEDULED" && (
                  <div className="space-y-3 pt-1">
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
                      <label
                        htmlFor="delivery-time"
                        className="block text-xs font-semibold mb-1.5 text-text-secondary"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {t(locale, "dt_time_label")}
                      </label>
                      <input
                        id="delivery-time"
                        type="time"
                        required
                        min="06:00"
                        max="22:00"
                        step={300}
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-base outline-none border border-border-primary bg-bg-secondary/60 text-text-primary tabular-nums focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        style={{ fontFamily: "JetBrains Mono, monospace" }}
                      />
                      <p className="mt-1.5 text-[11px] text-text-secondary/70">
                        {t(locale, "dt_time_hint")}
                      </p>
                    </div>
                  </div>
                )}
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
                  {t(locale, "b2c_co_pay_cash")}
                </p>
              </div>

              {error && <p className="text-sm text-red-400 font-semibold">{error}</p>}

              {/* Tell the customer exactly what is still missing so a disabled
                  place-order button is never a dead end. */}
              {items.length > 0 && missing.length > 0 && (
                <p className="text-xs text-center text-text-secondary">
                  {t(locale, "co_need_prefix")}{" "}
                  <span className="font-semibold text-text-primary">{missing.join(", ")}</span>
                </p>
              )}

              {/* Place Order Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!canPlace}
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
