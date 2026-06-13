/**
 * Tracking surface has no app chrome — it's a Yandex Go-style full-bleed map.
 * The root layout still wraps with theme + locale; this nested layout just
 * strips main padding inherited from the global layout.
 */
export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <div className="-mb-16 -mt-0 h-[100svh] w-full">{children}</div>;
}
