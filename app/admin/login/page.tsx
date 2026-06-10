import { loginAdmin } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-xl font-bold">Admin kirish</h1>
      <form action={loginAdmin} className="mt-4 space-y-3">
        <input
          name="password"
          type="password"
          required
          placeholder="Parol"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">Parol noto'g'ri.</p>}
        <button className="w-full rounded-lg bg-stone-900 py-2 font-semibold text-white">Kirish</button>
      </form>
    </div>
  );
}
