import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati — Xarid",
  description: "Xarid ilovasi maxfiylik siyosati / Xarid privacy policy.",
};

const UPDATED = "2026-06-27";

// Public privacy policy (required by Google Play + the App Store). Bilingual
// UZ/EN. Static page — no data access. Set the real domain/support email before
// submitting the apps, and have it reviewed for your jurisdiction.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-text-primary">
      <h1 className="text-2xl font-extrabold">Maxfiylik siyosati / Privacy Policy</h1>
      <p className="mt-1 text-sm text-text-secondary">Oxirgi yangilanish / Last updated: {UPDATED}</p>

      {/* ---- Uzbek ---- */}
      <section className="mt-8 space-y-4 leading-relaxed">
        <p>
          Xarid (&quot;biz&quot;) Qo&apos;qon shahrida oziq-ovqat yetkazib berish platformasini
          boshqaradi. Ushbu siyosat qanday ma&apos;lumotlarni yig&apos;ishimiz va undan qanday
          foydalanishimizni tushuntiradi.
        </p>
        <h2 className="text-lg font-bold">Qanday ma&apos;lumot yig&apos;amiz</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Hisob:</b> ism va telefon raqami.</li>
          <li><b>Buyurtma:</b> yetkazib berish manzili, buyurtma tarkibi va ixtiyoriy xarita nuqtasi.</li>
          <li>
            <b>Kuryer joylashuvi:</b> kuryer hisoblari uchun qurilma joylashuvi faqat ilova
            ochiq bo&apos;lganda va faol yetkazib berish vaqtida — mijozga jonli kuzatishni
            ko&apos;rsatish uchun — yig&apos;iladi.
          </li>
          <li><b>Texnik:</b> xizmatni ishlatish va himoyalash uchun asosiy qurilma/jurnal ma&apos;lumotlari.</li>
          <li><b>To&apos;lov:</b> faqat naqd pul (yetkazib berilganda). Biz karta ma&apos;lumotlarini yig&apos;maymiz.</li>
        </ul>
        <h2 className="text-lg font-bold">Ma&apos;lumotdan qanday foydalanamiz</h2>
        <p>
          Hisob yaratish, buyurtmalarni qabul qilish va yetkazish, kuryer tayinlash, jonli
          kuzatishni ko&apos;rsatish, buyurtma yuzasidan bog&apos;lanish, firibgarlikning oldini
          olish va qonun talablariga rioya qilish uchun.
        </p>
        <h2 className="text-lg font-bold">Ma&apos;lumotni ulashish</h2>
        <p>
          Buyurtmani bajarish uchun uning tafsilotlarini tegishli do&apos;kon va tayinlangan
          kuryer bilan ulashamiz. Biz ma&apos;lumotlaringizni <b>sotmaymiz</b> va reklama uchun
          ulashmaymiz. Xizmat ko&apos;rsatuvchilar (masalan, hosting) maxfiylik shartlari ostida
          ishlaydi. Qonun talab qilganda oshkor qilishimiz mumkin.
        </p>
        <h2 className="text-lg font-bold">Saqlash va o&apos;chirish</h2>
        <p>
          Ma&apos;lumot xizmat va qonuniy/hisob talablari uchun zarur muddatgacha saqlanadi.
          O&apos;chirishni so&apos;rash uchun <a className="text-accent underline" href="mailto:support@xarid.uz">support@xarid.uz</a> ga yozing.
        </p>
        <h2 className="text-lg font-bold">Xavfsizlik va bolalar</h2>
        <p>
          Ma&apos;lumot HTTPS orqali uzatiladi. Ilova 16 yoshdan kichik bolalarga
          mo&apos;ljallanmagan.
        </p>
      </section>

      {/* ---- English ---- */}
      <section className="mt-10 space-y-4 leading-relaxed border-t border-border-primary pt-8">
        <p>
          Xarid (&quot;we&quot;) operates a grocery-delivery platform in Kokand, Uzbekistan. This
          policy explains what we collect and how we use it.
        </p>
        <h2 className="text-lg font-bold">Information we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Account:</b> name and phone number.</li>
          <li><b>Orders:</b> delivery address, order contents, and an optional map pin.</li>
          <li>
            <b>Courier location:</b> for courier accounts, precise device location is collected
            <b> only while the app is in use during an active delivery</b>, to show the customer
            live tracking.
          </li>
          <li><b>Technical:</b> basic device/log data to operate and secure the service.</li>
          <li><b>Payment:</b> cash on delivery only — we do not collect card or payment data.</li>
        </ul>
        <h2 className="text-lg font-bold">How we use it</h2>
        <p>
          To create accounts, place and deliver orders, dispatch couriers, show live tracking,
          contact you about your order, prevent fraud, and comply with law.
        </p>
        <h2 className="text-lg font-bold">Sharing</h2>
        <p>
          We share order details with the fulfilling store and the assigned courier to deliver
          your order. We <b>do not sell</b> your data or share it for advertising. Service
          providers (e.g. hosting) operate under confidentiality. We may disclose data where
          required by law.
        </p>
        <h2 className="text-lg font-bold">Retention &amp; deletion</h2>
        <p>
          We keep data for as long as needed to provide the service and meet legal/accounting
          requirements. To request deletion, email{" "}
          <a className="text-accent underline" href="mailto:support@xarid.uz">support@xarid.uz</a>.
        </p>
        <h2 className="text-lg font-bold">Security &amp; children</h2>
        <p>
          Data is transmitted over HTTPS. The app is not directed to children under 16.
        </p>
        <h2 className="text-lg font-bold">Contact</h2>
        <p>
          Questions? Email{" "}
          <a className="text-accent underline" href="mailto:support@xarid.uz">support@xarid.uz</a>.
        </p>
      </section>
    </main>
  );
}
