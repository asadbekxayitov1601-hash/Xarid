import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { replySupport } from "../actions";

export const dynamic = "force-dynamic";

// Support inbox: one thread per user who has written in, newest activity first.
// Each thread shows the full conversation and a reply box that posts an operator
// message (fromSupport=true) the mobile app picks up on its next poll.
export default async function AdminSupportPage() {
  await requireAdmin();

  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      fromSupport: true,
      body: true,
      createdAt: true,
      user: { select: { name: true, phone: true } },
    },
  });

  // Group into threads keyed by userId, preserving chronological order, then sort
  // threads by their most recent message.
  const threads = new Map<
    string,
    { name: string | null; phone: string | null; last: Date; items: typeof messages }
  >();
  for (const m of messages) {
    const t = threads.get(m.userId);
    if (t) {
      t.items.push(m);
      t.last = m.createdAt;
    } else {
      threads.set(m.userId, {
        name: m.user.name,
        phone: m.user.phone,
        last: m.createdAt,
        items: [m],
      });
    }
  }
  const ordered = [...threads.entries()].sort((a, b) => +b[1].last - +a[1].last);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Yordam markazi</h1>

      {ordered.length === 0 && (
        <p className="py-8 text-center text-sm text-text-secondary">Hozircha murojaatlar yo'q.</p>
      )}

      <ul className="space-y-4">
        {ordered.map(([userId, t]) => (
          <li key={userId} className="rounded-2xl border border-border-primary bg-bg-secondary p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="font-semibold">{t.name || "Foydalanuvchi"}</p>
              <p className="text-xs text-text-secondary">{t.phone}</p>
            </div>
            <div className="space-y-2">
              {t.items.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.fromSupport
                      ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--accent)] px-3 py-2 text-sm text-white"
                      : "mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-bg-primary px-3 py-2 text-sm"
                  }
                >
                  {m.body}
                </div>
              ))}
            </div>
            <form action={replySupport} className="mt-3 flex gap-2">
              <input type="hidden" name="userId" value={userId} />
              <input
                name="body"
                required
                maxLength={2000}
                placeholder="Javob yozish..."
                className="flex-1 rounded-lg border border-border-primary px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
                Yuborish
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
