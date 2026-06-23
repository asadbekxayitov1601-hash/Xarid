// Retired with the pivot to an on-demand (Uzum Tezkor-style) model.
//
// The original app was a B2B daily-batch flow: a 22:00 "cutoff" split each
// day's orders into supplier purchase orders, and a 23:30 job re-pinged
// suppliers + messaged the admin about still-unconfirmed POs. That 23:30
// reminder was firing every night on stale seed POs even with no real orders.
//
// Stores now fulfil on demand, so neither daily job runs. The function is kept
// (called from instrumentation.ts) as an intentional no-op; re-arm the timers
// here only if a scheduled batch flow ever returns.

declare global {
  var cutoffSchedulerStarted: boolean | undefined;
}

export function startCutoffScheduler() {
  if (globalThis.cutoffSchedulerStarted) return; // dev hot-reload guard
  globalThis.cutoffSchedulerStarted = true;
  // No daily timers armed — on-demand model. See note above.
}
