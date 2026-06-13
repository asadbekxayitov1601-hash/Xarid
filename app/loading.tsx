import { getLocale } from "@/lib/locale";
import { FancyLoader } from "@/components/ui/fancy-loader";

// Route-level Suspense fallback (Agent 4). Resolves locale on the server, then
// renders the branded FancyLoader. Reduced-motion handled inside the loader.
export default async function Loading() {
  const locale = await getLocale();
  return <FancyLoader locale={locale} />;
}
