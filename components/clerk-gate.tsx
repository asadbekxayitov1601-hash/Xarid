// ClerkGate — conditionally wraps children in <ClerkProvider>.
//
// ADDITIVE + ENV-GATED. When the Clerk publishable key is UNSET this renders
// children unwrapped, so the app builds and runs with zero Clerk surface. When
// the key is present it wraps with <ClerkProvider>, themed to Xarid's dark
// glass look via Clerk's `appearance` variables (semantic CSS tokens, no raw
// hex literals in JSX logic — the values come from globals.css at runtime).
//
// We import @clerk/nextjs lazily so a missing package (before the verify phase
// installs it) never breaks the build. This is a server component.

import { isClerkPublishableConfigured } from "@/lib/clerk";

export async function ClerkGate({ children }: { children: React.ReactNode }) {
  if (!isClerkPublishableConfigured()) {
    // No key → no Clerk. Existing auth (lib/session.ts + Telegram) is untouched.
    return <>{children}</>;
  }

  // Variable specifier so the bundler does not hard-require the package when
  // Clerk is disabled / not yet installed.
  const pkg = "@clerk/nextjs";
  const mod = await import(/* webpackIgnore: true */ pkg).catch(() => null);
  const ClerkProvider = mod?.ClerkProvider as
    | React.ComponentType<{ children: React.ReactNode; appearance?: unknown }>
    | undefined;

  if (!ClerkProvider) {
    // Key set but package not installed yet — fail open to the existing auth.
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
