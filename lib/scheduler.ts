import { runCutoff } from "./po";

// Railway runs the app as a persistent server, so the 22:00 cutoff is an
// in-process timer instead of a platform cron. 22:00 Asia/Tashkent is
// 17:00 UTC year-round (UTC+5, no DST).
const CUTOFF_UTC_HOUR = 17;

declare global {
  var cutoffSchedulerStarted: boolean | undefined;
}

function msUntilNextCutoff(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), CUTOFF_UTC_HOUR, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

export function startCutoffScheduler() {
  if (globalThis.cutoffSchedulerStarted) return; // dev hot-reload guard
  globalThis.cutoffSchedulerStarted = true;

  const arm = () => {
    const delay = msUntilNextCutoff();
    console.log(`[cutoff] next run in ${Math.round(delay / 60000)} min`);
    setTimeout(async () => {
      try {
        const result = await runCutoff();
        console.log(`[cutoff] done: ${result.orders} orders -> ${result.pos} POs`);
      } catch (e) {
        console.error("[cutoff] failed", e);
      }
      arm();
    }, delay);
  };
  arm();
}
