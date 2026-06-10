export function uzs(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " so'm";
}

export const UNIT_LABELS: Record<string, string> = {
  KG: "kg",
  PIECE: "dona",
  LITER: "litr",
  BLOCK: "blok",
};
