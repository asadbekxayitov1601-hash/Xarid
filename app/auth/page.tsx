import { getLocale } from "@/lib/locale";
import { AuthClient } from "@/components/auth-client";

export default async function AuthPage() {
  const locale = await getLocale();
  return <AuthClient locale={locale} />;
}
