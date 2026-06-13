"use client";

/**
 * Pulsing accent dot used as a custom Leaflet div-icon (set via `iconHtml`)
 * or as a fallback HTML node when the map can't load. Kept in a separate
 * file so the dispatcher fleet list can reuse the same visual.
 *
 * Color variants line up with the design system status tokens.
 */
export type DotVariant = "driver" | "buyer" | "placed" | "confirmed" | "en_route" | "delivered";

const VARIANT: Record<DotVariant, { fill: string; ring: string }> = {
  driver:    { fill: "var(--accent)",        ring: "var(--accent-glow)" },
  buyer:     { fill: "var(--accent-2)",      ring: "var(--accent-2-glow)" },
  placed:    { fill: "var(--status-warning)", ring: "var(--status-warning-bg)" },
  confirmed: { fill: "var(--status-info)",   ring: "var(--status-info-bg)" },
  en_route:  { fill: "var(--status-info)",   ring: "var(--status-info-bg)" },
  delivered: { fill: "var(--status-success)", ring: "var(--status-success-bg)" },
};

export function DriverLocationDot({
  variant = "driver",
  pulsing = true,
  label,
}: {
  variant?: DotVariant;
  pulsing?: boolean;
  label?: string;
}) {
  const v = VARIANT[variant];
  return (
    <span
      className="relative inline-block"
      style={{ width: 16, height: 16 }}
      aria-label={label}
    >
      {pulsing && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full float-c"
          style={{ background: v.ring, transform: "scale(2.2)" }}
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: v.fill,
          boxShadow: "0 0 0 2px rgba(255,255,255,0.9), 0 0 14px " + v.ring,
        }}
      />
    </span>
  );
}

/**
 * Plain-HTML marker payload used by Leaflet's `L.divIcon({html})`.
 * The pulse uses the global `.float-c` class (NOT an inline animation) so the
 * existing `prefers-reduced-motion` block in globals.css can disable it.
 */
export function dotMarkerHtml(variant: DotVariant): string {
  const v = VARIANT[variant];
  return (
    `<span style="position:relative;display:inline-block;width:16px;height:16px">` +
      `<span class="float-c" style="position:absolute;inset:0;border-radius:9999px;background:${v.ring};` +
        `transform:scale(2.2)"></span>` +
      `<span style="position:absolute;inset:0;border-radius:9999px;background:${v.fill};` +
        `box-shadow:0 0 0 2px rgba(255,255,255,0.9),0 0 14px ${v.ring}"></span>` +
    `</span>`
  );
}
