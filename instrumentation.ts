export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_CUTOFF_SCHEDULER === "1") return;
  const { startCutoffScheduler } = await import("./lib/scheduler");
  startCutoffScheduler();
}
