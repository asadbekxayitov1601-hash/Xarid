"use client";

import { useEffect, useRef } from "react";
import { dotMarkerHtml, type DotVariant } from "./driver-location-dot";

// Leaflet types (loose) — package is recorded in package.json but may not
// be installed yet in dev. We use dynamic require so the bundle still type-checks.
type LeafletMap = unknown;
type LeafletMarker = unknown;
type LatLng = { lat: number; lng: number };

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  variant: DotVariant;
  label?: string;
};

type Props = {
  /** Map center. Defaults to Tashkent if omitted. */
  center: LatLng;
  /** Initial zoom. 12 = city, 14 = district, 16 = street. */
  zoom?: number;
  /** Markers to render. Re-renders on identity change. */
  pins: MapPin[];
  /** Optional straight-line from a -> b (driver -> buyer). */
  line?: { from: LatLng; to: LatLng } | null;
  /** When true, the map auto-fits to all pins on every change. */
  fit?: boolean;
  /** Accessibility label for the map container. */
  ariaLabel?: string;
  /** When the page is rendered in light theme, use a brighter basemap. */
  themeLight?: boolean;
  className?: string;
};

/**
 * Full-bleed Leaflet basemap. SSR-safe — imports `leaflet` lazily inside an
 * effect. Falls back to a translated empty state if Leaflet fails to load
 * (e.g. the package isn't installed yet in dev).
 */
export function MapCard({
  center,
  zoom = 13,
  pins,
  line = null,
  fit = false,
  ariaLabel,
  themeLight = false,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const lineRef = useRef<LeafletMarker | null>(null);
  const failedRef = useRef(false);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Dynamic import so SSR still works (Leaflet touches `window`).
        const Lmod = await import("leaflet");
        const L = Lmod.default ?? Lmod;
        // CSS shipped with leaflet — bundlers will inline it.
        // @ts-expect-error -- plain CSS import has no type declarations
        await import("leaflet/dist/leaflet.css").catch(() => null);

        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = (L as { map: (el: HTMLElement, o?: object) => unknown }).map(containerRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: true,
        });
        mapRef.current = map;

        const tileUrl = themeLight
          ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
        (L as { tileLayer: (u: string, o?: object) => { addTo: (m: unknown) => unknown } }).tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: "© OpenStreetMap, © CARTO",
        }).addTo(map);

        (L as { control: { attribution: (o?: object) => { addTo: (m: unknown) => unknown } } }).control
          .attribution({ position: "bottomright" })
          .addTo(map);
      } catch (e) {
        // Leaflet missing or blocked — show the address-only fallback.
        failedRef.current = true;
        if (containerRef.current) {
          containerRef.current.dataset.failed = "1";
        }
        console.warn("MapCard: leaflet unavailable —", e);
      }
    })();
    return () => {
      cancelled = true;
      const m = mapRef.current as { remove?: () => void } | null;
      if (m?.remove) m.remove();
      mapRef.current = null;
      markersRef.current.clear();
      lineRef.current = null;
    };
    // intentionally only on mount — we re-position via the next effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile pins.
  useEffect(() => {
    const map = mapRef.current as
      | {
        removeLayer: (l: unknown) => void;
        fitBounds: (b: unknown, o?: object) => void;
        setView: (c: [number, number], z: number) => void;
      }
      | null;
    if (!map || failedRef.current) return;

    (async () => {
      const Lmod = await import("leaflet");
      const L = Lmod.default ?? Lmod;
      const lib = L as {
        divIcon: (o: object) => unknown;
        marker: (ll: [number, number], o?: object) => {
          addTo: (m: unknown) => unknown;
          remove: () => void;
          bindTooltip: (s: string, o?: object) => unknown;
        };
        polyline: (pts: [number, number][], o?: object) => { addTo: (m: unknown) => unknown; remove: () => void };
        latLngBounds: (pts: [number, number][]) => unknown;
      };

      const wanted = new Set(pins.map((p) => p.id));
      // remove markers that aren't in the new list
      for (const [id, marker] of markersRef.current.entries()) {
        if (!wanted.has(id)) {
          (marker as { remove: () => void }).remove();
          markersRef.current.delete(id);
        }
      }

      // add / update remaining
      for (const pin of pins) {
        let marker = markersRef.current.get(pin.id) as {
          remove: () => void;
          setLatLng: (ll: [number, number]) => void;
        } | undefined;
        if (!marker) {
          const icon = lib.divIcon({
            html: dotMarkerHtml(pin.variant),
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            className: "xarid-go-pin",
          });
          const created = lib.marker([pin.lat, pin.lng], { icon });
          created.addTo(map);
          if (pin.label) created.bindTooltip(pin.label, { direction: "top", offset: [0, -8] });
          markersRef.current.set(pin.id, created);
        } else {
          marker.setLatLng([pin.lat, pin.lng]);
        }
      }

      // Optional driver->buyer line.
      if (lineRef.current) {
        (lineRef.current as { remove: () => void }).remove();
        lineRef.current = null;
      }
      if (line) {
        const created = lib.polyline(
          [
            [line.from.lat, line.from.lng],
            [line.to.lat, line.to.lng],
          ],
          { color: "#59c749", weight: 3, opacity: 0.7, dashArray: "6 8" }
        );
        created.addTo(map);
        lineRef.current = created;
      }

      // Fit to all pins (driver + buyer) if requested.
      if (fit && pins.length > 0) {
        const bounds = lib.latLngBounds(pins.map((p) => [p.lat, p.lng]));
        try {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        } catch {
          map.setView([center.lat, center.lng], zoom);
        }
      }
    })();
  }, [pins, line, fit, center.lat, center.lng, zoom]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className={"relative h-full w-full overflow-hidden " + className}
      style={{ background: "var(--bg-secondary)" }}
    />
  );
}
