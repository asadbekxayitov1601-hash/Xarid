import { getLocale } from "@/lib/locale";
import { NotFoundScene } from "@/components/ui/not-found-scene";

// Route-level 404 (Agent 4). Server component resolves the locale, then hands
// off to the immersive client scene. All copy flows through t() in three langs.
export default async function NotFound() {
  const locale = await getLocale();
  return <NotFoundScene locale={locale} />;
}
