import { remindUnconfirmed, runCutoff } from "./po";

// On Railway (persistent server) these in-process timers do the scheduling.
// On Vercel (serverless) timers never fire — vercel.json crons hit the
// /api/cron/* endpoints instead. Both paths run the same functions and the
// cutoff is idempotent, so having both configured is safe.
// Asia/Tashkent is UTC+5 with no DST: 22:00 → 17:00 UTC, 23:30 → 18:30 UTC.

declare global {
  var cutoffSchedulerStarted: boolean | undefined;
}

function msUntilNextUtc(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function armDaily(label: string, hour: number, minute: number, fn: () => Promise<unknown>) {
  const arm = () => {
    const delay = msUntilNextUtc(hour, minute);
    console.log(`[${label}] next run in ${Math.round(delay / 60000)} min`);
    setTimeout(async () => {
      try {
        console.log(`[${label}] done:`, await fn());
      } catch (e) {
        console.error(`[${label}] failed`, e);
      }
      arm();
    }, delay);
  };
  arm();
}

export function startCutoffScheduler() {
  if (globalThis.cutoffSchedulerStarted) return; // dev hot-reload guard
  globalThis.cutoffSchedulerStarted = true;

  armDaily("cutoff", 17, 0, runCutoff); // 22:00 Tashkent
  armDaily("remind", 18, 30, remindUnconfirmed); // 23:30 Tashkent
}
