"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BasketItem = {
  offerId: string;
  productName: string;
  supplierName: string;
  unit: string;
  price: number; // UZS, display only — server recomputes from DB at checkout
  minQty: number;
  image?: string | null;
  qty: number;
};

type BasketCtx = {
  items: BasketItem[];
  setQty: (offerId: string, qty: number, item?: Omit<BasketItem, "qty">) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<BasketCtx | null>(null);
const STORAGE_KEY = "xarid_basket";

export function useBasket(): BasketCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBasket outside BasketProvider");
  return ctx;
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const setQty: BasketCtx["setQty"] = (offerId, qty, item) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.offerId === offerId);
      if (qty <= 0) return prev.filter((i) => i.offerId !== offerId);
      if (existing) return prev.map((i) => (i.offerId === offerId ? { ...i, qty } : i));
      if (!item) return prev;
      return [...prev, { ...item, offerId, qty }];
    });
  };

  const { total, count } = useMemo(
    () => ({
      total: items.reduce((s, i) => s + Math.round(i.price * i.qty), 0),
      count: items.length,
    }),
    [items]
  );

  return <Ctx.Provider value={{ items, setQty, clear: () => setItems([]), total, count }}>{children}</Ctx.Provider>;
}
