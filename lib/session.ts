import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "xarid_session";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length > 0) return s;
  // Fail closed in production: without a real secret the HMAC key is public and
  // any caller could mint `userId.hmac` for any account (including ADMIN). A
  // thrown error (500 on every auth attempt) is strictly safer than silently
  // trusting forgeable tokens. Local/dev keeps a static key for convenience.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return "dev-secret-change-me";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** The signed session/token value: `<userId>.<hmac>`. */
function signedValue(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Verifies a `<userId>.<hmac>` string and returns the userId, or null. */
function verifySigned(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const userId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(userId));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

/**
 * Bearer token for the mobile (Flutter) apps. Same HMAC-signed value as the web
 * session cookie, but returned in the response body and sent back as
 * `Authorization: Bearer <token>` (native apps use tokens, not cookies).
 */
export function createToken(userId: string): string {
  return signedValue(userId);
}

export async function setSession(userId: string) {
  (await cookies()).set(COOKIE, signedValue(userId), {
    httpOnly: true,
    sameSite: "none", // Mini App runs inside Telegram's webview (third-party context)
    secure: true,
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  // Mobile apps send a Bearer token; web sends the session cookie. Prefer the
  // token when present so the same API serves both clients.
  let bearer: string | null = null;
  try {
    const auth = (await headers()).get("authorization");
    if (auth && /^bearer /i.test(auth)) bearer = auth.slice(7).trim();
  } catch {
    // headers() unavailable in this context — fall back to the cookie.
  }
  if (bearer) return verifySigned(bearer);
  return verifySigned((await cookies()).get(COOKIE)?.value);
}
