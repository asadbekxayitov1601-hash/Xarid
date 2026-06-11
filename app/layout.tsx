import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TelegramProvider } from "@/components/telegram-provider";
import { BasketProvider } from "@/components/basket-provider";
import { Header } from "@/components/header";
import { getLocale } from "@/lib/locale";

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
  return (
    <html lang={locale}>
      <body>
        <TelegramProvider>
          <BasketProvider>
            <Header locale={locale} />
            <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">{children}</main>
          </BasketProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
