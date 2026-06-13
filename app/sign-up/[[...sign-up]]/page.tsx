// Clerk sign-up catch-all route. ADDITIVE + ENV-GATED.
//
// When Clerk is enabled (keys present), renders Clerk's <SignUp/> themed to
// Xarid's glass look. When disabled, renders a translated notice pointing the
// user back to the existing phone+password auth at /auth — so the route always
// builds and never 500s without keys.

import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { isClerkPublishableConfigured } from "@/lib/clerk";

export default async function SignUpPage() {
  const locale = await getLocale();
  const enabled = isClerkPublishableConfigured();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 pb-12">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            {t(locale, "clerk_signup_title")}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {t(locale, "clerk_signup_subtitle")}
          </p>
        </header>

        {enabled ? (
          <ClerkSignUp />
        ) : (
          <ClerkDisabledNotice locale={locale} />
        )}
      </div>
    </div>
  );
}

// Lazily import Clerk so the build is green when the package isn't installed.
async function ClerkSignUp() {
  const pkg = "@clerk/nextjs";
  const mod = await import(/* webpackIgnore: true */ pkg).catch(() => null);
  const SignUp = mod?.SignUp as React.ComponentType<{ appearance?: unknown }> | undefined;
  if (!SignUp) {
    const locale = await getLocale();
    return <ClerkDisabledNotice locale={locale} />;
  }
  return (
    <div className="flex justify-center">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "var(--accent)",
            colorBackground: "var(--bg-secondary)",
            colorText: "var(--text-primary)",
          },
        }}
      />
    </div>
  );
}

function ClerkDisabledNotice({ locale }: { locale: Awaited<ReturnType<typeof getLocale>> }) {
  return (
    <div className="glass-card rounded-3xl p-8 text-center shadow-[var(--shadow-md)]">
      <h2 className="text-lg font-bold text-text-primary">
        {t(locale, "clerk_disabled_title")}
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        {t(locale, "clerk_disabled_body")}
      </p>
      <Link
        href="/auth"
        className="glow-button mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold"
      >
        {t(locale, "clerk_disabled_cta")}
      </Link>
    </div>
  );
}
