// ClerkGate — conditionally wraps children in <ClerkProvider>.
//
// ADDITIVE + ENV-GATED. Clerk activates only when BOTH Clerk keys are present
// (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY) — the SAME condition the
// header (via the clerkEnabled prop) and middleware.ts use. That keeps the
// provider, the Clerk UI controls, and the Clerk middleware turning on together,
// never a half-enabled state that renders a Clerk component (e.g. <SignedOut>)
// with no <ClerkProvider> around it. When the keys are unset this renders
// children unwrapped, so the app builds and runs on the existing session +
// Telegram auth with zero Clerk surface.
//
// @clerk/nextjs is a normal installed dependency, so ClerkProvider is imported
// statically. (An earlier lazy `webpackIgnore` dynamic import of the bare package
// failed to resolve in the production server bundle, leaving the provider absent
// while the header still rendered <SignedOut> — that mismatch crashed every page
// with "SignedOut can only be used within the <ClerkProvider /> component". This
// file now fixes it.)
//
// This is a server component, so it can read the server-only CLERK_SECRET_KEY.

import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk";

export function ClerkGate({ children }: { children: React.ReactNode }) {
  if (!isClerkEnabled()) {
    // Keys absent → no Clerk. Existing auth (lib/session.ts + Telegram) untouched.
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      appearance={{
        // Map Clerk's design variables onto Xarid's semantic tokens so the
        // widget matches dark + light mode automatically (the tokens flip via
        // html.light in globals.css).
        variables: {
          colorPrimary: "var(--accent)",
          colorBackground: "var(--bg-secondary)",
          colorText: "var(--text-primary)",
          colorTextSecondary: "var(--text-secondary)",
          colorInputBackground: "var(--bg-secondary)",
          colorInputText: "var(--text-primary)",
          borderRadius: "0.75rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
