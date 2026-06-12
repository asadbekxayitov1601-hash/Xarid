import { getLocale } from "@/lib/locale";
import { LandingClient } from "@/components/landing-client";

export default async function LandingPage() {
  const locale = await getLocale();
  return <LandingClient locale={locale} />;
}
