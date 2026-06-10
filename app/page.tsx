import Link from "next/link";
import { LeadForm } from "@/components/lead-form";

const steps = [
  { n: "1", title: "Kechqurun buyurtma", text: "Soat 22:00 gacha barcha kerakli mahsulotlarni bitta savatga yig'asiz — sabzavot, go'sht, sut, quruq mahsulotlar." },
  { n: "2", title: "Tasdiqlash", text: "Tekshirilgan yetkazib beruvchilar buyurtmani kechasi tasdiqlaydi. Narxlar oldindan ko'rinadi — savdolashish shart emas." },
  { n: "3", title: "Ertalab yetkazib berish", text: "Hammasi bitta mashinada, tushlik tayyorgarligidan oldin — soat 10:00 gacha yetkazib beriladi." },
];

export default function LandingPage() {
  return (
    <div className="space-y-12 py-6">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Ertalabki ta'minot — <span className="text-emerald-700">bitta savatda</span>
        </h1>
        <p className="mx-auto max-w-xl text-stone-600">
          Restoran, kafe va choyxonalar uchun: o'nta yetkazib beruvchiga qo'ng'iroq qilish o'rniga,
          butun buyurtmani bitta ilovada bering. Shaffof narxlar, ertalab soat 10:00 gacha yetkazib berish.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/catalog"
            className="rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            Katalogni ochish
          </Link>
          <a
            href="#signup"
            className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:bg-stone-100"
          >
            Ro'yxatdan o'tish
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              {s.n}
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{s.text}</p>
          </div>
        ))}
      </section>

      <section id="signup" className="grid gap-6 sm:grid-cols-2">
        <LeadForm
          role="BUYER"
          title="Restoran yoki kafe uchun"
          text="Birinchi yetkazib berish — bepul. Telefon raqamingizni qoldiring, biz bog'lanamiz."
        />
        <LeadForm
          role="SUPPLIER"
          title="Yetkazib beruvchi uchun"
          text="O'nlab restoranlarning buyurtmasi bitta jamlangan ro'yxatda. Haftalik kafolatlangan to'lov."
        />
      </section>
    </div>
  );
}
