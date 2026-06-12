import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import { TelegramProvider } from "@/components/telegram-provider";
import { BasketProvider } from "@/components/basket-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getLocale } from "@/lib/locale";
import { getSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap" });

export const metadata: Metadata = {
  title: "Xarid — restoranlar uchun ertalabki ta'minot",
  description:
    "Restoran, kafe va choyxonalar uchun B2B bozor: barcha mahsulotlar bitta savatda, ertalab soat 10:00 gacha yetkazib beriladi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Mini App webview: prevent pinch-zoom breaking the layout
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "dark";

  let userName: string | null = null;
  const userId = await getSessionUserId();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } });
    if (user) userName = user.name || user.phone || "•";
  }

  return (
    <html lang={locale} className={theme}>
      <body className={`${inter.className} min-h-screen flex flex-col bg-bg-primary text-text-primary transition-colors duration-300`}>
        <TelegramProvider>
          <BasketProvider>
            <Header locale={locale} userName={userName} />
            <main className="w-full flex-1 pb-16">{children}</main>
            <Footer locale={locale} />
          </BasketProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
