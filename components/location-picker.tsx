"use client";

import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { KOKAND_CENTER } from "@/lib/geo";

// Leaflet types are kept loose: the package may not be installed in every dev
// environment, and we load it lazily so SSR never touches `window`. Mirrors the
// raw-leaflet pattern in components/logistics/map-card.tsx — never react-leaflet.
type LeafletMap = unknown;
type LeafletMarker = unknown;

// Brand green. Leaflet's divIcon HTML is injected into the DOM and cannot read
// CSS custom properties reliably, so the marker fill uses the documented brand
// hex exception. Everything else on this surface uses semantic tokens.
const BRAND_GREEN = "#59C749";

function pinHtml(): string {
  return (
    `<span style="position:relative;display:block;width:22px;height:22px">` +
    `<span style="position:absolute;inset:0;border-radius:9999px;background:${BRAND_GREEN};` +
    `box-shadow:0 0 0 3px rgba(255,255,255,0.92),0 4px 12px rgba(89,199,73,0.45)"></span>` +
    `<span style="position:absolute;inset:7px;border-radius:9999px;background:rgba(255,255,255,0.9)"></span>` +
    `</span>`
  );
}

type LatLng = { lat: number; lng: number };

type Props = {
  /** Currently selected coordinate, or null when nothing is picked yet. */
  value: LatLng | null;
  /** Fired whenever the user drags, taps the map, or uses their location. */
  onChange: (lat: number, lng: number) => void;
  locale: Locale;
  /** Map height in px. Defaults to 220 (mobile-first, fixed). */
  height?: number;
};

/**
 * Client-only Leaflet pin picker. The user can drag the marker, tap anywhere on
 * the map to move it, or press "Use my location". Defaults to Kokand center when
 * `value` is null. SSR-safe: `leaflet` is imported lazily inside an effect and
 * the map is cleaned up on unmount.
 */
export function LocationPicker({ value, onChange, locale, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const failedRef = useRef(false);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Track the selection so the locate button can recenter without re-init.
  const valueRef = useRef<LatLng | null>(value);
  valueRef.current = value;

  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  const start = value ?? KOKAND_CENTER;

  // Initialise the map once and wire up drag + click placement.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Lmod = await import("leaflet");
        const L = Lmod.default ?? Lmod;
        // @ts-expect-error -- plain CSS import has no type declarations
        await import("leaflet/dist/leaflet.css").catch(() => null);

        if (cancelled || !containerRef.current || mapRef.current) return;

        const lib = L as {
          map: (el: HTMLElement, o?: object) => {
            setView: (c: [number, number], z: number) => unknown;
            on: (ev: string, cb: (e: { latlng: { lat: number; lng: number } }) => void) => void;
          };
          tileLayer: (u: string, o?: object) => { addTo: (m: unknown) => unknown };
          divIcon: (o: object) => unknown;
          marker: (
            ll: [number, number],
            o?: object
          ) => {
            addTo: (m: unknown) => unknown;
            setLatLng: (ll: [number, number]) => void;
            on: (ev: string, cb: () => void) => void;
            getLatLng: () => { lat: number; lng: number };
          };
        };

        const map = lib.map(containerRef.current, {
          center: [start.lat, start.lng],
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        } as object) as unknown as {
          setView: (c: [number, number], z: number) => unknown;
          on: (ev: string, cb: (e: { latlng: { lat: number; lng: number } }) => void) => void;
        };
        mapRef.current = map;

        lib
          .tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
            attribution: "(c) OpenStreetMap, (c) CARTO",
          })
          .addTo(map);

        const icon = lib.divIcon({
          html: pinHtml(),
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          className: "xarid-loc-pin",
        });

        const marker = lib.marker([start.lat, start.lng], { icon, draggable: true });
        marker.addTo(map);
        markerRef.current = marker;

        // Dragging the marker reports the new spot.
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onChangeRef.current(ll.lat, ll.lng);
        });

        // Tapping the map moves the marker there.
        map.on("click", (e) => {
          marker.setLatLng([e.latlng.lat, e.latlng.lng]);
          onChangeRef.current(e.latlng.lat, e.latlng.lng);
        });
      } catch (e) {
        failedRef.current = true;
        if (containerRef.current) containerRef.current.dataset.failed = "1";
        console.warn("LocationPicker: leaflet unavailable -", e);
      }
    })();

    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      if (m?.remove) m.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init once on mount; subsequent value changes are reflected via the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect external `value` changes (e.g. controlled parent) onto the marker.
  useEffect(() => {
    if (!value || failedRef.current) return;
    const marker = markerRef.current as { setLatLng: (ll: [number, number]) => void } | null;
    const map = mapRef.current as { setView: (c: [number, number], z: number) => unknown } | null;
    if (marker) marker.setLatLng([value.lat, value.lng]);
    if (map) map.setView([value.lat, value.lng], 15);
  }, [value]);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDenied(true);
      return;
    }
    setDenied(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        const marker = markerRef.current as { setLatLng: (ll: [number, number]) => void } | null;
        const map = mapRef.current as { setView: (c: [number, number], z: number) => unknown } | null;
        if (marker) marker.setLatLng([latitude, longitude]);
        if (map) map.setView([latitude, longitude], 16);
        onChangeRef.current(latitude, longitude);
      },
      () => {
        setLocating(false);
        setDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t(locale, "loc_pick_hint")}
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
          style={{ borderColor: "var(--border-color)", color: "var(--accent)" }}
        >
          {locating ? t(locale, "loc_pick_locating") : t(locale, "loc_pick_use_my_location")}
        </button>
      </div>
      <div
        ref={containerRef}
        role="application"
        aria-label={t(locale, "loc_pick_label")}
        className="w-full overflow-hidden rounded-2xl border"
        style={{
          height,
          borderColor: "var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      />
      {denied && (
        <p className="text-xs" style={{ color: "var(--status-warning)" }}>
          {t(locale, "loc_pick_denied")}
        </p>
      )}
    </div>
  );
}
