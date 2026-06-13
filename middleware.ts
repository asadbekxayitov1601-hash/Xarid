// Root middleware — ADDITIVE and ENV-GATED Clerk integration.
//
// CRITICAL: Xarid already ships working auth (custom HMAC sessions in
// lib/session.ts + Telegram Mini App initData auth). This middleware must NOT
// break that. When the Clerk keys are UNSET, this file is a no-op pass-through
// so `next build` / `next dev` succeed and the existing auth is untouched.
//
// Clerk activates only when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (and the secret
// key) are present. We import @clerk/nextjs/server lazily INSIDE the handler so
// that:
//   1. a missing package (before the verify phase runs `npm i`) never crashes
//      the build, and
//   2. when keys are absent we never touch Clerk code at all.
//
// Matches Clerk's Next 15 / app-router middleware API (clerkMiddleware).

import { NextResponse, type NextRequest } from "next/server";

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

// Cache the resolved Clerk handler across invocations once keys are present.
type MiddlewareFn = (
  req: NextRequest,
  event: { waitUntil(promise: Promise<unknown>): void }
) => Response | Promise<Response> | NextResponse | Promise<NextResponse>;

let clerkHandler: MiddlewareFn | null = null;

export default async function middleware(
  req: NextRequest,
  event: { waitUntil(promise: Promise<unknown>): void }
) {
  // No keys → pure pass-through. The existing app auth handles everything.
  if (!clerkEnabled) {
    return NextResponse.next();
  }

  // Keys present → lazily build the real Clerk middleware once and delegate.
  if (!clerkHandler) {
    // Dynamic import keeps the build green when the package isn't installed and
    // when Clerk is disabled. The variable specifier avoids a hard static
    // dependency the bundler would try to resolve at build time.
    const pkg = "@clerk/nextjs/server";
    const mod: { clerkMiddleware: (...args: unknown[]) => MiddlewareFn } =
      await import(/* webpackIgnore: true */ pkg).catch(() => {
        return { clerkMiddleware: () => (() => NextResponse.next()) as MiddlewareFn };
      });
    // clerkMiddleware() with no route-protection callback runs Clerk's auth
    // context but leaves every route public — Clerk only augments the request,
    // it does not force a redirect. Route protection is added during cutover
    // (see docs/CLERK_AUTH.md), not here, so existing pages stay reachable.
    clerkHandler = mod.clerkMiddleware();
  }

  return clerkHandler(req, event);
}

// Clerk's recommended matcher for the App Router: run on everything except
// Next internals and static files, and always on API/trpc routes. Harmless in
// the pass-through case (the handler just returns NextResponse.next()).
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
