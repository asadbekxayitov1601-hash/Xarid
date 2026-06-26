"use client";

// Destructive "clear catalog" trigger. Wraps the clearCatalog server action in a
// form gated by a native confirm() so a stray click can't wipe the catalog.
export function ClearCatalogButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Barcha mahsulotlar katalogdan o'chiriladi. Davom etamizmi?")) {
          e.preventDefault();
        }
      }}
    >
      <button className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100">
        Katalogni tozalash
      </button>
    </form>
  );
}
