import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

/**
 * Route-level skeleton for every /supplier/* page (Agent 3).
 *
 * The supplier tabs run `dynamic = "force-dynamic"` server work (DB queries,
 * payout aggregation), so switching tabs used to show a blank wait. This
 * fallback mirrors the SupplierShell chrome — brand header card, tab strip,
 * and content cards — with shimmering placeholders so a tab switch feels
 * instant instead of frozen.
 *
 * Pure CSS animation (server component, no client hooks); the shimmer is
 * disabled under prefers-reduced-motion via the media query below.
 */
export default async function SupplierLoading() {
  const locale = await getLocale();

  // Reused placeholder bar — a tokenised block that shimmers.
  const Bar = ({ className = "" }: { className?: string }) => (
    <div className={`sk-bar rounded-lg ${className}`} aria-hidden />
  );

  return (
    <div
      className="min-h-screen pt-20 pb-12 relative bg-bg-primary"
      role="status"
      aria-busy="true"
      aria-label={t(locale, "loader_label")}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="blob"
          style={{ width: 480, height: 480, top: "-12%", left: "-8%", background: "var(--accent)" }}
          aria-hidden
        />
        <div
          className="blob blob-2"
          style={{
            width: 360,
            height: 360,
            bottom: "-6%",
            right: "-8%",
            background: "var(--accent-2)",
            opacity: 0.18,
          }}
          aria-hidden
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header card */}
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="sk-bar h-12 w-12 rounded-xl" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <Bar className="h-4 w-40 max-w-[55%]" />
            <Bar className="h-3 w-28 max-w-[40%]" />
          </div>
        </div>

        {/* Tab strip */}
        <div className="glass-card rounded-2xl p-1.5 flex flex-wrap gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="sk-bar h-9 flex-1 min-w-[42%] sm:min-w-0 rounded-xl"
              aria-hidden
            />
          ))}
        </div>

        {/* Content cards */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <Bar className="h-5 w-44 max-w-[60%]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Bar key={i} className="h-20" />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
          <Bar className="h-5 w-36 max-w-[50%]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="sk-bar h-10 w-10 rounded-xl" aria-hidden />
              <div className="flex-1 space-y-2">
                <Bar className="h-3.5 w-2/3" />
                <Bar className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">{t(locale, "loader_label")}</span>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        .sk-bar {
          position: relative;
          overflow: hidden;
          background: color-mix(in oklab, var(--text-secondary) 14%, transparent);
        }
        .sk-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in oklab, var(--accent) 22%, transparent) 50%,
            transparent 100%
          );
          animation: sk-shimmer 1.6s ease-in-out infinite;
        }
        @keyframes sk-shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .sk-bar::after {
            animation: none;
            transform: translateX(0);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
