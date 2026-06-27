import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foydalanish shartlari — Xarid",
  description: "Xarid ilovasi foydalanish shartlari / Xarid terms of service.",
};

const UPDATED = "2026-06-27";

// Public terms of service. Static, bilingual UZ/EN. A starting template — set the
// real entity name/contact and have it reviewed for your jurisdiction.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-text-primary">
      <h1 className="text-2xl font-extrabold">Foydalanish shartlari / Terms of Service</h1>
      <p className="mt-1 text-sm text-text-secondary">Oxirgi yangilanish / Last updated: {UPDATED}</p>

      <section className="mt-8 space-y-4 leading-relaxed">
        <h2 className="text-lg font-bold">Xizmat</h2>
        <p>
          Xarid — Qo&apos;qon shahridagi mijozlar, do&apos;konlar va kuryerlarni bog&apos;laydigan
          yetkazib berish platformasi. To&apos;lov faqat naqd pul orqali (yetkazib berilganda)
          amalga oshiriladi.
        </p>
        <h2 className="text-lg font-bold">Hisob</h2>
        <p>
          To&apos;g&apos;ri ma&apos;lumot kiriting va hisobingiz maxfiyligini saqlang. Hisob orqali
          amalga oshirilgan harakatlar uchun siz javobgarsiz.
        </p>
        <h2 className="text-lg font-bold">Buyurtma va yetkazish</h2>
        <p>
          Narxlar va mavjudlik o&apos;zgarishi mumkin. Yetkazib berish vaqtlari taxminiy bo&apos;lib,
          kafolatlanmaydi. Buyurtmalar mavjudligiga qarab tasdiqlanadi.
        </p>
        <h2 className="text-lg font-bold">Mas&apos;uliyat</h2>
        <p>
          Xizmat &quot;boricha&quot; taqdim etiladi. Qonun ruxsat bergan darajada biz bilvosita
          zararlar uchun javobgar emasmiz.
        </p>
      </section>

      <section className="mt-10 space-y-4 leading-relaxed border-t border-border-primary pt-8">
        <h2 className="text-lg font-bold">Service</h2>
        <p>
          Xarid is a delivery platform connecting customers, stores, and couriers in Kokand,
          Uzbekistan. Payment is cash on delivery only.
        </p>
        <h2 className="text-lg font-bold">Accounts</h2>
        <p>
          Provide accurate information and keep your account credentials secure. You are
          responsible for activity under your account.
        </p>
        <h2 className="text-lg font-bold">Orders &amp; delivery</h2>
        <p>
          Prices and availability may change. Delivery times are estimates and not guaranteed.
          Orders are confirmed subject to availability.
        </p>
        <h2 className="text-lg font-bold">Liability</h2>
        <p>
          The service is provided &quot;as is&quot;. To the extent permitted by law, we are not
          liable for indirect damages. These terms are governed by the laws of Uzbekistan.
        </p>
        <h2 className="text-lg font-bold">Contact</h2>
        <p>
          Email <a className="text-accent underline" href="mailto:support@xarid.uz">support@xarid.uz</a>.
        </p>
      </section>
    </main>
  );
}
