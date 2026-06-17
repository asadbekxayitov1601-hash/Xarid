"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { t, type Locale } from "@/lib/i18n";
import { toGoPhase, type GoPhase } from "@/lib/driver";
import { RouteList, type RouteStop } from "./route-list";
import type { MapPin } from "./map-card";

const MapCard = dynamic(() => import("./map-card").then((m) => m.MapCard), { ssr: false });

export type DispatchOrder = {
  id: string;
  shortId: string;
  buyerName: string;
  address: string;
  total: number;
  status: string;
  driverId: string | null;
  driverName: string | null;
  /** Delivery (customer) coordinates — real pin or geocode fallback. */
  lat: number;
  lng: number;
  /** Primary seller (pickup) — null when no item supplier has coords. */
  sellerName: string | null;
  sellerLat: number | null;
  sellerLng: number | null;
};

/** Structured outcome of an auto-assign attempt, mirrored from the server action. */
export type AutoAssignResult =
  | { ok: true; orderId: string; driverName: string; distanceLabel: string }
  | { ok: false; orderId: string; reason: string };

export type DispatchDriver = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
};

export function DispatchBoard({
  locale,
  orders,
  drivers,
  themeLight = false,
  assignAction,
  autoAssignAction,
}: {
  locale: Locale;
  orders: DispatchOrder[];
  drivers: DispatchDriver[];
  themeLight?: boolean;
  /**
   * Server action invoked with (orderId, driverId | "" to unassign). Wired
   * to a `<form action={assignAction}>` so it works without JS, while the
   * client still gets the optimistic spinner via useTransition().
   */
  assignAction: (formData: FormData) => Promise<void>;
  /**
   * Algorithmic dispatch: assigns the nearest available courier and returns a
   * structured result (courier + distance, or a reason). The manual dropdown
   * above stays as a no-JS fallback.
   */
  autoAssignAction: (orderId: string) => Promise<AutoAssignResult>;
}) {
  const [highlightId, setHighlightId] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  // Per-order auto-assign feedback, keyed by orderId. Shown inline under the
  // order until the next revalidation removes the row from the unassigned list.
  const [autoResults, setAutoResults] = useState<Record<string, AutoAssignResult>>({});
  const [autoBusy, setAutoBusy] = useState<Record<string, boolean>>({});
  const [autoAllBusy, setAutoAllBusy] = useState(false);

  function runAutoAssign(orderId: string): Promise<AutoAssignResult> {
    setAutoBusy((m) => ({ ...m, [orderId]: true }));
    return autoAssignAction(orderId)
      .then((res) => {
        setAutoResults((m) => ({ ...m, [orderId]: res }));
        return res;
      })
      .catch((): AutoAssignResult => {
        const res: AutoAssignResult = { ok: false, orderId, reason: "failed" };
        setAutoResults((m) => ({ ...m, [orderId]: res }));
        return res;
      })
      .finally(() => {
        setAutoBusy((m) => ({ ...m, [orderId]: false }));
      });
  }

  function autoAssignReason(reason: string): string {
    // Map stable backend reason codes -> translated messages. Unknown codes
    // fall back to a generic failure string so nothing renders raw.
    const key = (
      {
        no_pickup_coords: "disp_auto_err_no_pickup",
        no_couriers: "disp_auto_err_no_couriers",
        already_assigned: "disp_auto_err_already",
        not_found: "disp_auto_err_not_found",
      } as Record<string, string>
    )[reason];
    return t(locale, (key ?? "disp_auto_err_generic") as Parameters<typeof t>[1]);
  }

  const unassigned: RouteStop[] = useMemo(
    () =>
      orders
        .filter((o) => !o.driverId && o.status !== "DELIVERED" && o.status !== "CANCELLED")
        .map((o) => ({
          id: o.id,
          shortId: o.shortId,
          buyerName: o.buyerName,
          address: o.address,
          total: o.total,
          phase: toGoPhase(o.status),
        })),
    [orders]
  );

  const assigned: RouteStop[] = useMemo(
    () =>
      orders
        .filter((o) => o.driverId && o.status !== "DELIVERED" && o.status !== "CANCELLED")
        .map((o) => ({
          id: o.id,
          shortId: o.shortId,
          buyerName: o.buyerName,
          address: o.address,
          total: o.total,
          phase: toGoPhase(o.status),
        })),
    [orders]
  );

  const pins: MapPin[] = useMemo(() => {
    const list: MapPin[] = [];
    // De-dupe seller pickup pins: several orders can share one seller location.
    const sellerSeen = new Set<string>();
    for (const o of orders) {
      if (o.status === "DELIVERED" || o.status === "CANCELLED") continue;
      // Delivery (customer) pin — colored by order phase.
      list.push({
        id: "order_" + o.id,
        lat: o.lat,
        lng: o.lng,
        variant: pinVariant(toGoPhase(o.status)),
        label: `#${o.shortId} · ${o.buyerName}`,
      });
      // Seller pickup pin — reuse the accent-2 "buyer" variant as a distinct
      // pickup color (the dot set has no dedicated seller variant).
      if (o.sellerLat != null && o.sellerLng != null) {
        const key = o.sellerLat.toFixed(5) + "," + o.sellerLng.toFixed(5);
        if (!sellerSeen.has(key)) {
          sellerSeen.add(key);
          list.push({
            id: "seller_" + key,
            lat: o.sellerLat,
            lng: o.sellerLng,
            variant: "buyer",
            label: o.sellerName ?? t(locale, "disp_legend_seller"),
          });
        }
      }
    }
    for (const d of drivers) {
      if (d.lat == null || d.lng == null) continue;
      list.push({
        id: "drv_" + d.id,
        lat: d.lat,
        lng: d.lng,
        variant: "driver",
        label: d.name,
      });
    }
    return list;
  }, [orders, drivers, locale]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Map column */}
      <section
        className="glass-card depth-1 relative h-[60svh] overflow-hidden rounded-3xl lg:h-[78svh]"
        style={{ boxShadow: "var(--shadow-lg)" }}
        aria-label={t(locale, "disp_title")}
      >
        <MapCard
          center={{ lat: 41.2995, lng: 69.2401 }}
          zoom={12}
          pins={pins}
          fit={pins.length > 0}
          ariaLabel={t(locale, "disp_title")}
          themeLight={themeLight}
        />
        {/* Legend */}
        <div
          className="glass-card pointer-events-none absolute left-3 top-3 rounded-2xl px-3 py-2 text-[11px]"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <p
            className="font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.06em" }}
          >
            {t(locale, "disp_map_legend")}
          </p>
          <ul className="mt-1 space-y-0.5">
            <LegendRow color="var(--status-warning)" label={t(locale, "disp_legend_placed")} />
            <LegendRow color="var(--status-info)" label={t(locale, "disp_legend_confirmed")} />
            <LegendRow color="var(--accent)" label={t(locale, "disp_legend_en_route")} />
            <LegendRow color="var(--status-success)" label={t(locale, "disp_legend_delivered")} />
            <LegendRow color="var(--accent-2)" label={t(locale, "disp_legend_seller")} />
            <LegendRow color="var(--accent)" label={t(locale, "disp_legend_driver")} />
          </ul>
        </div>
      </section>

      {/* Right column: unassigned + assigned + fleet */}
      <div className="flex flex-col gap-4">
        <section
          className="glass-card rounded-3xl p-4"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <header className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {t(locale, "disp_unassigned")}
            </h2>
            <div className="flex items-center gap-2">
              {unassigned.length > 0 && (
                <button
                  type="button"
                  disabled={autoAllBusy}
                  onClick={() => {
                    setAutoAllBusy(true);
                    // Sequential so we never assign two orders to the same lone
                    // free courier in one pass; each call re-reads driver state.
                    (async () => {
                      for (const s of unassigned) {
                        // eslint-disable-next-line no-await-in-loop
                        await runAutoAssign(s.id);
                      }
                    })().finally(() => setAutoAllBusy(false));
                  }}
                  className="glow-button rounded-full px-3 py-1 text-xs font-bold disabled:opacity-60"
                  style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                >
                  {autoAllBusy ? t(locale, "disp_auto_running") : t(locale, "disp_auto_all_btn")}
                </button>
              )}
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                style={{ background: "var(--status-warning-bg)", color: "var(--status-warning)" }}
              >
                {unassigned.length}
              </span>
            </div>
          </header>

          {unassigned.length === 0 ? (
            <p
              className="rounded-2xl border px-4 py-6 text-center text-sm"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              {t(locale, "disp_no_unassigned")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {unassigned.map((s) => {
                const order = orders.find((o) => o.id === s.id)!;
                return (
                  <li
                    key={s.id}
                    className={
                      "glass-card rounded-2xl px-4 py-3 transition-all " +
                      (highlightId === s.id ? "depth-1" : "")
                    }
                    style={{
                      boxShadow: highlightId === s.id ? "var(--shadow-lg), var(--shadow-glow-accent)" : "var(--shadow-md)",
                    }}
                    onMouseEnter={() => setHighlightId(s.id)}
                    onMouseLeave={() => setHighlightId(undefined)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          #{s.shortId} · {s.buyerName}
                        </p>
                        <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                          {s.address}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-sm font-bold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {new Intl.NumberFormat("ru-RU").format(s.total)}
                      </span>
                    </div>
                    <form
                      action={(formData) =>
                        startTransition(() => {
                          formData.set("orderId", order.id);
                          void assignAction(formData);
                        })
                      }
                      className="mt-2 flex items-center gap-2"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <select
                        name="driverId"
                        defaultValue=""
                        aria-label={t(locale, "disp_assign")}
                        className="glass-input flex-1 rounded-xl px-3 py-2 text-sm"
                      >
                        <option value="" disabled>
                          {t(locale, "disp_assign")}
                        </option>
                        {drivers
                          .filter((d) => d.active)
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="glow-button rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-60"
                        style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                      >
                        {t(locale, "disp_assign_btn")}
                      </button>
                    </form>

                    {/* Algorithmic auto-assign — default dispatch path; the
                        manual dropdown above stays as a fallback. */}
                    <button
                      type="button"
                      disabled={!!autoBusy[order.id] || autoAllBusy}
                      onClick={() => void runAutoAssign(order.id)}
                      className="mt-2 w-full rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    >
                      {autoBusy[order.id]
                        ? t(locale, "disp_auto_running")
                        : t(locale, "disp_auto_btn")}
                    </button>

                    {autoResults[order.id] &&
                      (() => {
                        const r = autoResults[order.id];
                        if (r.ok) {
                          return (
                            <p
                              className="mt-1.5 text-xs font-semibold"
                              style={{ color: "var(--status-success)" }}
                            >
                              {r.distanceLabel
                                ? t(locale, "disp_auto_ok_dist", {
                                    name: r.driverName,
                                    dist: r.distanceLabel,
                                  })
                                : t(locale, "disp_auto_ok", { name: r.driverName })}
                            </p>
                          );
                        }
                        return (
                          <p
                            className="mt-1.5 text-xs font-semibold"
                            style={{ color: "var(--status-warning)" }}
                          >
                            {autoAssignReason(r.reason)}
                          </p>
                        );
                      })()}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="glass-card rounded-3xl p-4"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {t(locale, "disp_assigned")}
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
              style={{ background: "var(--status-info-bg)", color: "var(--status-info)" }}
            >
              {assigned.length}
            </span>
          </header>
          <RouteList
            locale={locale}
            stops={assigned}
            emptyLabel={t(locale, "disp_no_active")}
            highlightId={highlightId}
            onClickItem={(id) => setHighlightId(id)}
          />
          <ul className="mt-2 space-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {assigned.map((s) => {
              const order = orders.find((o) => o.id === s.id)!;
              return (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    #{s.shortId} · {t(locale, "disp_assigned_to", { name: order.driverName ?? "—" })}
                  </span>
                  <form
                    action={(formData) =>
                      startTransition(() => {
                        formData.set("orderId", order.id);
                        formData.set("driverId", "");
                        void assignAction(formData);
                      })
                    }
                    className="inline"
                  >
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="driverId" value="" />
                    <button
                      type="submit"
                      className="rounded-full border px-2 py-0.5 font-semibold"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                    >
                      {t(locale, "disp_reassign_btn")}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          className="glass-card rounded-3xl p-4"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {t(locale, "disp_fleet_title")}
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
              style={{ background: "var(--status-success-bg)", color: "var(--status-success)" }}
            >
              {drivers.filter((d) => d.lat != null).length}/{drivers.length}
            </span>
          </header>
          <ul className="space-y-1 text-sm">
            {drivers.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: "var(--bg-secondary)" }}
              >
                <span style={{ color: "var(--text-primary)" }}>{d.name}</span>
                <span
                  className="text-xs"
                  style={{
                    color: d.lat != null ? "var(--status-success)" : "var(--text-secondary)",
                  }}
                >
                  {d.lat != null ? "● " + relativeAge(locale, d.updatedAt) : t(locale, "disp_fleet_offline")}
                </span>
              </li>
            ))}
            {drivers.length === 0 && (
              <li
                className="rounded-xl px-3 py-3 text-center text-xs"
                style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
              >
                —
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: "0 0 8px " + color }}
      />
      <span style={{ color: "var(--text-primary)" }}>{label}</span>
    </li>
  );
}

function pinVariant(phase: GoPhase): "placed" | "confirmed" | "en_route" | "delivered" {
  if (phase === "DELIVERED") return "delivered";
  if (phase === "EN_ROUTE" || phase === "PICKED_UP") return "en_route";
  if (phase === "CONFIRMED" || phase === "ASSIGNED") return "confirmed";
  return "placed";
}

function relativeAge(locale: Locale, iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return t(locale, "disp_fleet_just_now");
  const min = Math.round(ms / 60_000);
  if (min < 60) return t(locale, "disp_fleet_min_ago", { n: min });
  const h = Math.round(min / 60);
  return t(locale, "disp_fleet_hr_ago", { n: h });
}
