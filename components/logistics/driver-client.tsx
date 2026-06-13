"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { t, type Locale } from "@/lib/i18n";
import { toGoPhase, nextDriverStatus, type GoPhase } from "@/lib/driver";
import { EtaPill } from "./eta-pill";
import { OrderStatusTimeline } from "./order-status-timeline";
import type { MapPin } from "./map-card";

const MapCard = dynamic(() => import("./map-card").then((m) => m.MapCard), { ssr: false });

export type DriverJobView = {
  id: string;
  shortId: string;
  status: string;
  buyer: { name: string; phone: string; address: string; lat: number; lng: number };
  itemsCount: number;
  total: number;
} | null;

export function DriverClient({
  locale,
  job,
  themeLight = false,
}: {
  locale: Locale;
  job: DriverJobView;
  themeLight?: boolean;
}) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [permState, setPermState] = useState<"unknown" | "on" | "denied" | "off">("unknown");
  const [busy, setBusy] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(job?.status ?? "");

  // Watch geolocation. We use watchPosition so iOS Safari throttles us instead of dropping us.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermState("denied");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPermState("on");
      },
      (err) => {
        setPermState(err.code === err.PERMISSION_DENIED ? "denied" : "off");
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Push location every 15s while we have a fix and a job.
  useEffect(() => {
    if (!pos || !job) return;
    const send = async () => {
      try {
        await fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
        });
      } catch {
        /* ignore */
      }
    };
    void send();
    const id = window.setInterval(send, 15_000);
    return () => window.clearInterval(id);
  }, [pos, job]);

  const enableLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setPermState("on");
      },
      (err) => setPermState(err.code === err.PERMISSION_DENIED ? "denied" : "off"),
      { enableHighAccuracy: true }
    );
  };

  const phase: GoPhase = toGoPhase(currentStatus);
  const next = nextDriverStatus(currentStatus);
  const pins: MapPin[] = useMemo(() => {
    if (!job) return [];
    const list: MapPin[] = [
      { id: "buyer", lat: job.buyer.lat, lng: job.buyer.lng, variant: "buyer", label: job.buyer.address },
    ];
    if (pos) list.push({ id: "driver", lat: pos.lat, lng: pos.lng, variant: "driver" });
    return list;
  }, [job, pos]);

  if (!job) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 pb-12">
        <section
          className="glass-card depth-1 rounded-3xl px-6 py-10 text-center"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--accent)", letterSpacing: "0.1em" }}
          >
            {t(locale, "go_brand")}
          </p>
          <h1 className="mt-2 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {t(locale, "drv_no_job")}
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t(locale, "drv_no_job_hint")}
          </p>
        </section>
      </div>
    );
  }

  const onStep = async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/orders/${job.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; status?: string } | null;
      if (j?.ok && j.status) setCurrentStatus(j.status);
    } finally {
      setBusy(false);
    }
  };

  const stepLabel = (() => {
    if (next === "PICKED_UP") return t(locale, "drv_pickup_btn");
    if (next === "EN_ROUTE") return t(locale, "drv_enroute_btn");
    if (next === "DELIVERED") return t(locale, "drv_delivered_btn");
    return null;
  })();

  return (
    <div className="relative h-[100svh] w-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <div className="absolute inset-0">
        <MapCard
          center={{ lat: job.buyer.lat, lng: job.buyer.lng }}
          zoom={14}
          pins={pins}
          line={pos ? { from: pos, to: { lat: job.buyer.lat, lng: job.buyer.lng } } : null}
          fit={Boolean(pos)}
          ariaLabel={t(locale, "drv_current_job")}
          themeLight={themeLight}
        />
      </div>

      <div className="scene-perspective absolute inset-x-0 bottom-0 z-10">
        <section
          aria-label={t(locale, "drv_current_job")}
          className="glass-card depth-2 mx-auto w-full max-w-xl rounded-t-3xl px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4"
          style={{ boxShadow: "var(--shadow-xl), var(--shadow-glow-accent)" }}
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full" style={{ background: "var(--border-color)" }} />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--accent)", letterSpacing: "0.1em" }}
              >
                {t(locale, "go_brand")} · #{job.shortId}
              </p>
              <h1
                className="mt-1 truncate text-lg font-bold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {job.buyer.name}
              </h1>
              <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                {job.buyer.address}
              </p>
            </div>
            <EtaPill locale={locale} etaMinutes={null} phase={phase} />
          </div>

          {/* Cash / items meta */}
          <div className="mt-4 flex items-center justify-between gap-3 text-xs">
            <span style={{ color: "var(--text-secondary)" }}>
              {t(locale, "drv_items_count", { n: job.itemsCount })}
            </span>
            <span
              className="rounded-full px-3 py-1 font-bold tabular-nums"
              style={{ background: "var(--status-warning-bg)", color: "var(--status-warning)" }}
            >
              {t(locale, "drv_total_due")}: {new Intl.NumberFormat("ru-RU").format(job.total)}
            </span>
          </div>

          {/* Geolocation state row */}
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
            <span style={{ color: "var(--text-secondary)" }}>
              {permState === "on" && (
                <span style={{ color: "var(--status-success)" }}>● {t(locale, "drv_location_on")}</span>
              )}
              {permState === "denied" && <span style={{ color: "var(--status-danger)" }}>● {t(locale, "drv_location_denied")}</span>}
              {permState === "off" && <span>{t(locale, "drv_location_off")}</span>}
              {permState === "unknown" && <span>{t(locale, "drv_location_off")}</span>}
            </span>
            {permState !== "on" && permState !== "denied" && (
              <button
                type="button"
                onClick={enableLocation}
                className="rounded-full border px-3 py-1 font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {t(locale, "drv_location_enable")}
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-5">
            <OrderStatusTimeline locale={locale} phase={phase} />
          </div>

          {/* Action row */}
          <div className="mt-5 flex flex-col gap-2">
            {next && stepLabel && (
              <button
                type="button"
                onClick={onStep}
                disabled={busy}
                className="glow-button w-full rounded-2xl py-4 text-base font-bold transition-all disabled:opacity-60"
                style={{ background: "var(--accent)", color: "var(--bg-primary)", minHeight: 56 }}
              >
                {stepLabel}
              </button>
            )}
            <div className="flex gap-2">
              <a
                href={`/driver/orders/${job.id}`}
                className="flex-1 rounded-2xl border px-3 py-3 text-center text-sm font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {t(locale, "drv_open_scale")}
              </a>
              <a
                href={`tel:${job.buyer.phone}`}
                aria-label={t(locale, "drv_call_buyer")}
                className="flex-1 rounded-2xl border px-3 py-3 text-center text-sm font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              >
                {t(locale, "drv_call_buyer")}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
