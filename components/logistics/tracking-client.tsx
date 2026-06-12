"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { t, type Locale } from "@/lib/i18n";
import { toGoPhase, type GoPhase } from "@/lib/driver";
import { EtaPill } from "./eta-pill";
import { OrderStatusTimeline } from "./order-status-timeline";
import type { MapPin } from "./map-card";

// Map is client-only because Leaflet touches `window` at import time.
const MapCard = dynamic(() => import("./map-card").then((m) => m.MapCard), { ssr: false });

type TrackPayload = {
  ok: boolean;
  status: string;
  eta: number | null;
  buyer: { name: string; address: string; lat: number; lng: number; itemsCount: number; total: number; shortId: string };
  driver:
    | { id: string; name: string; phone: string; lat: number | null; lng: number | null; updatedAt: string | null }
    | null;
};

export function TrackingClient({
  orderId,
  locale,
  initial,
  themeLight = false,
}: {
  orderId: string;
  locale: Locale;
  initial: TrackPayload;
  themeLight?: boolean;
}) {
  const [data, setData] = useState<TrackPayload>(initial);
  const [expanded, setExpanded] = useState(false);

  // 10s polling — gentle on the box, indistinguishable from real-time to the eye.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/orders/${orderId}/track`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as TrackPayload;
        if (!cancelled) setData(j);
      } catch {
        /* network blip — retry on next tick */
      }
    };
    const id = window.setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId]);

  const phase: GoPhase = toGoPhase(data.status);
  const driverHasLoc = data.driver?.lat != null && data.driver?.lng != null;

  const pins: MapPin[] = useMemo(() => {
    const list: MapPin[] = [
      {
        id: "buyer",
        lat: data.buyer.lat,
        lng: data.buyer.lng,
        variant: "buyer",
        label: data.buyer.address,
      },
    ];
    if (driverHasLoc) {
      list.push({
        id: "driver",
        lat: data.driver!.lat as number,
        lng: data.driver!.lng as number,
        variant: "driver",
        label: data.driver?.name,
      });
    }
    return list;
  }, [data.buyer.address, data.buyer.lat, data.buyer.lng, data.driver, driverHasLoc]);

  const line = driverHasLoc
    ? { from: { lat: data.driver!.lat as number, lng: data.driver!.lng as number }, to: { lat: data.buyer.lat, lng: data.buyer.lng } }
    : null;

  return (
    <div className="relative h-[100svh] w-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <MapCard
          center={{ lat: data.buyer.lat, lng: data.buyer.lng }}
          zoom={14}
          pins={pins}
          line={line}
          fit={driverHasLoc}
          ariaLabel={t(locale, "go_tracking_title")}
          themeLight={themeLight}
        />
      </div>

      {/* Address-only fallback banner (only shown if Leaflet failed to mount;
          map-card sets data-failed on its container in that case, but we
          always show the buyer address inside the sheet anyway). */}

      {/* Bottom sheet */}
      <div className="scene-perspective absolute inset-x-0 bottom-0 z-10">
        <section
          aria-label={t(locale, "go_tracking_title")}
          className="glass-card depth-2 mx-auto w-full max-w-xl rounded-t-3xl px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 transition-all"
          style={{
            boxShadow: "var(--shadow-xl), var(--shadow-glow-accent)",
            maxHeight: expanded ? "78svh" : "44svh",
            overflowY: "auto",
          }}
        >
          {/* drag handle */}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="mx-auto mb-3 block h-1.5 w-12 rounded-full"
            style={{ background: "var(--border-color)" }}
          />

          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--accent)", letterSpacing: "0.1em" }}
              >
                {t(locale, "go_brand")}
              </p>
              <h1
                className="mt-1 text-lg font-bold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {t(locale, "go_tracking_title")}
              </h1>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                {t(locale, "go_order_label")} #{data.buyer.shortId}
              </p>
            </div>
            <EtaPill locale={locale} etaMinutes={data.eta} phase={phase} />
          </div>

          {/* Driver / searching block */}
          <div className="mt-4">
            {data.driver ? (
              <div
                className="depth-1 flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                style={{ background: "var(--bg-secondary)", boxShadow: "var(--shadow-md)" }}
              >
                <div className="min-w-0">
                  <p
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}
                  >
                    {t(locale, "go_driver_label")}
                  </p>
                  <p className="mt-0.5 truncate text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {data.driver.name}
                  </p>
                </div>
                <a
                  href={`tel:${data.driver.phone}`}
                  aria-label={t(locale, "go_driver_phone_aria")}
                  className="glow-button inline-flex h-12 w-12 items-center justify-center rounded-full font-bold"
                  style={{ background: "var(--accent)", color: "#0c0a09" }}
                >
                  <span aria-hidden>☎</span>
                </a>
              </div>
            ) : (
              <div
                className="depth-1 flex items-center gap-3 rounded-2xl px-4 py-4"
                style={{ background: "var(--bg-secondary)", boxShadow: "var(--shadow-md)" }}
              >
                <span
                  aria-hidden
                  className="float-c inline-block h-3 w-3 rounded-full"
                  style={{ background: "var(--accent)", boxShadow: "0 0 14px var(--accent-glow)" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {t(locale, "go_searching_driver")}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {t(locale, "go_searching_driver_hint")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="mt-4">
            <p
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}
            >
              {t(locale, "go_address_label")}
            </p>
            <p className="mt-1 text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
              {data.buyer.address}
            </p>
          </div>

          {/* Timeline (only when expanded) */}
          {expanded && (
            <div className="mt-5">
              <p
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}
              >
                {t(locale, "go_timeline_title")}
              </p>
              <div className="mt-2">
                <OrderStatusTimeline locale={locale} phase={phase} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
