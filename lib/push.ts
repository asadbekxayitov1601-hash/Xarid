import { prisma } from "./db";

type PushPayload = { title: string; body: string; data?: Record<string, string> };

// Sends a push notification to every device a user has registered, via Firebase
// Cloud Messaging. Safe no-op until FCM_SERVER_KEY is configured, so it never
// blocks an order flow (mirrors the Telegram-notify pattern). Dead tokens are
// pruned so they don't accumulate.
//
// NOTE: this uses the FCM legacy HTTP endpoint for simplicity; migrate to the
// HTTP v1 API (service-account OAuth) before high volume.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const key = process.env.FCM_SERVER_KEY;
  const tokens = await prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
  if (!key || tokens.length === 0) return;

  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `key=${key}` },
          body: JSON.stringify({
            to: token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
          }),
        });
        // Prune tokens FCM reports as unregistered so they don't pile up.
        if (res.status === 404 || res.status === 410) {
          await prisma.deviceToken.deleteMany({ where: { token } }).catch(() => {});
        }
      } catch (e) {
        console.warn("[push] FCM send failed:", e);
      }
    })
  );
}
