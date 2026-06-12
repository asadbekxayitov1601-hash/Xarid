"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  DollarSign,
  Package,
  Plus,
  Save,
  Image as ImageIcon
} from "lucide-react";
import { productEmoji } from "@/lib/product-emoji";
import { updateMyOffer, addMyOffer, resolvePoWeb } from "@/app/supplier/actions";
import { ProductImageUpload } from "@/components/product-image-upload";

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

type WebProduct = {
  id: string;
  nameUz: string;
  unit: string;
};

type SupplierClientProps = {
  orgName: string;
  payoutGross: number;
  payoutOrders: number;
  payoutLines: number;
  initialOffers: WebOffer[];
  otherProducts: WebProduct[];
  purchaseOrders: WebPurchaseOrder[];
  unitLabels: Record<string, string>;
};

export function SupplierClient({
  orgName,
  payoutGross,
  payoutOrders,
  payoutLines,
  initialOffers,
  otherProducts,
  purchaseOrders,
  unitLabels,
}: SupplierClientProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "offers">("orders");
  const [expanded, setExpanded] = useState<string | null>(
    purchaseOrders.length > 0 ? purchaseOrders[0].id : null
  );
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const formatPrice = (n: number) => n.toLocaleString("ru-RU") + " so'm";

  async function handleConfirmPO(poId: string, action: "confirm" | "reject") {
    setLoadingAction(poId + action);
    try {
      const res = await resolvePoWeb(poId, action);
      if (res?.error) {
        alert(res.error);
      } else {
        alert("Buyurtma muvaffaqiyatli tasdiqlandi/rad etildi.");
        window.location.reload();
      }
    } catch (e) {
      alert("Xatolik yuz berdi.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 relative bg-bg-primary">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-8"
          style={{ width: 500, height: 500, top: "-10%", left: "-10%", background: "#10b981" }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Supplier Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-border-primary shadow-lg"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white"
            style={{
              background: "linear-gradient(135deg,#10b981,#059669)",
              boxShadow: "0 0 16px rgba(16,185,129,0.3)",
              fontFamily: "Outfit",
            }}
          >
            {orgName[0].toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-text-primary text-lg" style={{ fontFamily: "Outfit" }}>
              {orgName}
            </div>
            <div className="text-xs text-text-secondary" style={{ fontFamily: "Inter" }}>
              Yetkazib beruvchi portali · Narxlar va buyurtmalar
            </div>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">
              ● Avtomat
            </span>
          </div>
        </motion.div>

        {/* Weekly payout statement info */}
        <section className="glass-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider" style={{ fontFamily: "Outfit" }}>
                Shu hafta (yetkazilganlar bo'yicha payout)
              </h2>
              <p className="mt-1 text-2xl font-bold text-emerald-400" style={{ fontFamily: "JetBrains Mono" }}>
                {formatPrice(payoutGross)}
              </p>
            </div>
            <DollarSign className="text-emerald-400 w-8 h-8 opacity-40" />
          </div>
          <p className="text-xs text-text-secondary mt-2" style={{ fontFamily: "Inter" }}>
            {payoutGross > 0
              ? `${payoutOrders} ta buyurtma · ${payoutLines} ta qator`
              : "Hozircha yetkazilgan buyurtmalar yo'q"}{" "}
            · To'lovlar har hafta boshida amalga oshiriladi.
          </p>
        </section>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl p-1 bg-bg-secondary border border-border-primary">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "orders" ? "bg-emerald-500 text-stone-950 font-extrabold" : "text-text-secondary hover:text-text-primary"
            }`}
            style={{ fontFamily: "Outfit" }}
          >
            Buyurtmalar ({purchaseOrders.filter((po) => po.status === "SENT").length} yangi)
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "offers" ? "bg-emerald-500 text-stone-950 font-extrabold" : "text-text-secondary hover:text-text-primary"
            }`}
            style={{ fontFamily: "Outfit" }}
          >
            Narxlar ro'yxati ({initialOffers.length} mahsulot)
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
                    {/* Accordion Trigger */}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : po.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-text-primary" style={{ fontFamily: "Outfit" }}>
                          Buyurtma #{po.id.slice(-6).toUpperCase()} — {po.buyerName}
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5" style={{ fontFamily: "Inter" }}>
                          Yetkazish: {po.deliveryDate} · {po.address}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        {po.status !== "SENT" ? (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              po.status === "CONFIRMED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}
                            style={{ fontFamily: "Outfit" }}
                          >
                            {po.status === "CONFIRMED" ? "Tasdiqlangan" : "Rad etilgan"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25">
                            Yangi
                          </span>
                        )}
                        {isOpen ? (
                          <ChevronUp size={16} className="text-text-secondary" />
                        ) : (
                          <ChevronDown size={16} className="text-text-secondary" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Content */}
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
                                    <div className="text-sm font-semibold text-text-primary truncate" style={{ fontFamily: "Outfit" }}>
                                      {l.offer.product.nameUz}
                                    </div>
                                    <div className="text-xs text-text-secondary" style={{ fontFamily: "JetBrains Mono" }}>
                                      {l.qty} {unitLabels[l.offer.product.unit] ?? l.offer.product.unit} · {formatPrice(l.costPrice)} / {unitLabels[l.offer.product.unit] ?? l.offer.product.unit}
                                    </div>
                                  </div>
                                  <div className="text-sm font-bold text-text-primary" style={{ fontFamily: "JetBrains Mono" }}>
                                    {formatPrice(l.qty * l.costPrice)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {po.status === "SENT" ? (
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-primary/50">
                                <div className="text-left">
                                  <div className="text-xs text-text-secondary">Sizga to'lanadi</div>
                                  <div className="font-bold text-emerald-400" style={{ fontFamily: "JetBrains Mono" }}>
                                    {formatPrice(total)}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loadingAction !== null}
                                    onClick={() => handleConfirmPO(po.id, "reject")}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/15 cursor-pointer disabled:opacity-50"
                                    style={{ fontFamily: "Outfit" }}
                                  >
                                    {loadingAction === po.id + "reject" ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <XCircle size={14} />
                                    )}
                                    Rad etish
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={loadingAction !== null}
                                    onClick={() => handleConfirmPO(po.id, "confirm")}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 text-stone-950 hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                                    style={{ fontFamily: "Outfit" }}
                                  >
                                    {loadingAction === po.id + "confirm" ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={14} />
                                    )}
                                    Tasdiqlash
                                  </motion.button>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-3 border-t border-border-primary/50 flex justify-between text-xs text-text-secondary font-mono">
                                <span>Status: {po.status}</span>
                                <span>Qiymat: {formatPrice(total)}</span>
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
                  Yuborilgan buyurtmalar mavjud emas.
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="offers"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Offers List */}
              <div className="glass-card rounded-2xl border border-border-primary overflow-hidden shadow-md">
                <div className="px-4 py-3 border-b border-border-primary bg-bg-secondary/40">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider" style={{ fontFamily: "Outfit" }}>
                    Mahsulotlarim (narxi so'mda, sizga to'lanadigan)
                  </h3>
                </div>
                <ul className="divide-y divide-border-primary/40">
                  {initialOffers.map((o) => (
                    <li key={o.id} className="px-4 py-3">
                      <form action={updateMyOffer} className="flex flex-wrap items-center gap-3 text-sm">
                        <input type="hidden" name="offerId" value={o.id} />
                        {o.product.imageUrl ? (
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
                        <ProductImageUpload productId={o.productId} />

                        <span className="min-w-0 flex-1 truncate font-semibold text-text-primary" style={{ fontFamily: "Outfit" }}>
                          {o.product.nameUz}
                          <span className="text-xs font-normal text-text-secondary">
                            {" "}
                            / {unitLabels[o.product.unit] ?? o.product.unit}
                          </span>
                        </span>

                        <input
                          name="costPrice"
                          type="number"
                          inputMode="numeric"
                          defaultValue={o.costPrice}
                          required
                          className="w-24 sm:w-28 rounded-lg border border-border-primary bg-bg-secondary/80 text-text-primary px-2.5 py-1.5 text-right outline-none focus:border-emerald-500"
                        />

                        <label className="flex items-center gap-1.5 text-xs text-text-secondary select-none cursor-pointer">
                          <input
                            name="available"
                            type="checkbox"
                            defaultChecked={o.available}
                            className="rounded border-border-primary bg-bg-secondary text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span>Bor</span>
                        </label>

                        <button className="flex items-center gap-1 rounded-lg bg-emerald-500 text-stone-950 px-3 py-1.5 text-xs font-bold hover:bg-emerald-400 cursor-pointer select-none">
                          <Save size={12} />
                          Saqlash
                        </button>
                      </form>
                    </li>
                  ))}
                  {initialOffers.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-text-secondary">
                      Hozircha mahsulotlar yo'q — quyidan yangi mahsulot qo'shing.
                    </li>
                  )}
                </ul>
              </div>

              {/* Add Offer Form */}
              {otherProducts.length > 0 && (
                <form
                  action={addMyOffer}
                  className="glass-card rounded-2xl border border-border-primary p-5 shadow-md space-y-4"
                >
                  <h3 className="font-bold text-text-primary flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
                    <Plus size={16} className="text-emerald-400" />
                    Katalogdan yangi mahsulot qo'shish
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <select
                      name="productId"
                      required
                      className="min-w-[180px] flex-1 rounded-xl border border-border-primary bg-bg-secondary/80 text-text-primary px-3 py-2.5 outline-none focus:border-emerald-500"
                    >
                      {otherProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nameUz} / {unitLabels[p.unit] ?? p.unit}
                        </option>
                      ))}
                    </select>
                    <input
                      name="costPrice"
                      type="number"
                      inputMode="numeric"
                      required
                      placeholder="Sotish narxi, so'm"
                      className="w-32 rounded-xl border border-border-primary bg-bg-secondary/80 text-text-primary px-3 py-2.5 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 text-stone-950 px-5 py-2.5 font-bold hover:bg-emerald-400 cursor-pointer select-none"
                      style={{ fontFamily: "Outfit" }}
                    >
                      Qo'shish
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
