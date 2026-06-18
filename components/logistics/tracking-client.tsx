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
  // True while the SSE stream is open. Drives the "live" badge and lets the
  // poller back off (real-time push is authoritative while connected).
  const [live, setLive] = useState(false);

  // --- Real-time channel (Server-Sent Events) -------------------------------
  // Subscribe to /api/orders/[id]/stream and merge each pushed location/status
  // event into the SAME `data` state the poller updates, so the existing render
  // is reused untouched. EventSource auto-reconnects on transient errors; we
  // flip `live` on open/error so the poll fallback (below) resumes whenever the
  // stream is down. Guarded for SSR / unsupported browsers.
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      // SSE unavailable — stay on the poll fallback only.
      return;
    }

    let es: EventSource | null = null;

    try {
      es = new EventSource(`/api/orders/${orderId}/stream`);
    } catch {
      return; // construction failed — poll fallback stays active.
    }

    es.onopen = () => setLive(true);

    es.onmessage = (e) => {
      let ev: unknown;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return; // ignore keep-alive comments / malformed frames
      }
      if (!ev || typeof ev !== "object") return;
      const m = ev as { type?: string };

      if (m.type === "location") {
        const loc = ev as { lat: number; lng: number; updatedAt: string; name?: string };
        setData((prev) => {
          if (!prev.driver) return prev; // no driver block to attach a position to yet
          return {
            ...prev,
            driver: {
              ...prev.driver,
              lat: loc.lat,
              lng: loc.lng,
              updatedAt: loc.updatedAt,
              ...(loc.name ? { name: loc.name } : {}),
            },
          };
        });
      } else if (m.type === "status") {
        const st = ev as { status: string; eta: number | null };
        setData((prev) => ({ ...prev, status: st.status, eta: st.eta }));
      }
      // "ping" and unknown types are intentionally ignored.
    };

    es.onerror = () => {
      // Transient drop: EventSource will retry on its own. Mark not-live so the
      // poller resumes covering the gap until the stream reconnects (onopen).
      setLive(false);
    };

    return () => {
      setLive(false);
      try {
        es?.close();
      } catch {
        /* already closed */
      }
    };
  }, [orderId]);

  // --- Poll fallback --------------------------------------------------------
  // Kept as the resilient fallback. While SSE is `live` we slow the poll way
  // down (a cheap safety net / reconciliation); when SSE is down we poll at the
  // original 10s cadence so the page still updates with no real-time channel.
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
    const intervalMs = live ? 60_000 : 10_000;
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, live]);

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
      {/* Scoped styles for the real-time "live" dot. Reduced-motion users get a
          static dot (no pulse). Kept local since this component is the only
          consumer of the badge. */}
      <style>{`
        .rt-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: var(--accent-3);
          box-shadow: 0 0 0 0 var(--accent-3-glow);
          animation: rt-live-pulse 1.8s ease-out infinite;
        }
        @keyframes rt-live-pulse {
          0% { box-shadow: 0 0 0 0 var(--accent-3-glow); }
          70% { box-shadow: 0 0 0 6px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rt-live-dot { animation: none; }
        }
      `}</style>
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
              <div className="flex items-center gap-2">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--accent)", letterSpacing: "0.1em" }}
                >
                  {t(locale, "go_brand")}
                </p>
                {live && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "var(--accent-3-glow)",
                      color: "var(--accent-3)",
                      letterSpacing: "0.08em",
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    <span aria-hidden className="rt-live-dot" />
                    {t(locale, "rt_live")}
                  </span>
                )}
              </div>
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
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
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
