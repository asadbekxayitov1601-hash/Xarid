// Clerk integration — ADDITIVE and ENV-GATED.
//
// Xarid already has working auth (lib/session.ts custom HMAC sessions +
// Telegram Mini App initData auth in app/api/auth/telegram). Clerk is bolted on
// as an optional second auth surface and only "turns on" when both Clerk keys
// are present in the environment. With the keys UNSET:
//   - middleware.ts exports a pass-through (no Clerk handler runs)
//   - app/layout.tsx renders children WITHOUT <ClerkProvider>
//   - the /sign-in and /sign-up routes still render, but show a short
//     "auth not configured" notice instead of the Clerk widget
// so `next build` and `next dev` succeed and the existing auth keeps working.
//
// See docs/CLERK_AUTH.md for the full coexistence + cutover plan.

/**
 * True only when BOTH Clerk keys are configured. The publishable key is
 * inlined at build time (NEXT_PUBLIC_*) so it is also readable in client
 * components; the secret key is server-only. We require both so we never
 * half-enable Clerk (publishable without secret would render a widget that
 * cannot complete a sign-in).
 *
 * Note: process.env.NEXT_PUBLIC_* is statically replaced by Next at build
 * time, so this stays a compile-time-foldable check in client bundles.
 */
export function isClerkEnabled(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;
  return Boolean(pk && pk.length > 0 && sk && sk.length > 0);
}

/**
 * Client-safe variant: only the publishable key is available in the browser
 * bundle. Use this in client components / providers where the secret key is
 * (correctly) undefined. Server code should prefer isClerkEnabled().
 */
export function isClerkPublishableConfigured(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(pk && pk.length > 0);
}

/** Where the Clerk sign-in page lives. Overridable via env for custom routing. */
export function clerkSignInUrl(): string {
  return process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
}

/** Where the Clerk sign-up page lives. Overridable via env for custom routing. */
export function clerkSignUpUrl(): string {
  return process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
}

/**
 * Bridge stub: map a Clerk user to our Organization/User + role.
 *
 * NOT wired up yet — the existing custom session (lib/session.ts) remains the
 * source of truth for the app. When the user is ready to make Clerk primary
 * (see the cutover steps in docs/CLERK_AUTH.md), this is the seam where a
 * verified Clerk identity is exchanged for (or linked to) a row in our `User`
 * table and an `Organization` with type BUYER | SUPPLIER.
 *
 * Kept as a typed placeholder so callers and the migration doc reference one
 * canonical signature instead of inventing their own.
 */
export type XaridRole = "BUYER" | "SUPPLIER";

export interface ClerkBridgeInput {
  clerkUserId: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  /** Chosen on the role picker; defaults to BUYER when absent. */
  role?: XaridRole;
}

export interface ClerkBridgeResult {
  /** Our internal User.id once linking is implemented. */
  userId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function linkClerkUserToOrg(_input: ClerkBridgeInput): Promise<ClerkBridgeResult> {
  // Intentionally unimplemented. Activating this requires the user's Clerk keys
  // and a decision on the cutover (see docs/CLERK_AUTH.md, "Cutover steps").
  throw new Error(
    "linkClerkUserToOrg is not implemented yet — Clerk is scaffolded but not the primary auth. See docs/CLERK_AUTH.md."
  );
}
