export function uzs(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " so'm";
}

export const UNIT_LABELS: Record<string, string> = {
  KG: "kg",
  PIECE: "dona",
  LITER: "litr",
  BLOCK: "blok",
};

/**
 * Live-formats user input into the Uzbek phone shape "+998 XX-XXX-XX-XX".
 * The +998 country code is fixed; the 9 national digits are grouped 2-3-2-2.
 * Idempotent and safe to call on every keystroke and on partial input — the
 * field's value always starts with "+998 ", so the leading "998" we strip is
 * the country code, leaving the national digits the user is typing.
 */
export function formatUzPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const g: string[] = [];
  if (digits.length > 0) g.push(digits.slice(0, 2));
  if (digits.length > 2) g.push(digits.slice(2, 5));
  if (digits.length > 5) g.push(digits.slice(5, 7));
  if (digits.length > 7) g.push(digits.slice(7, 9));
  return g.length ? `+998 ${g.join("-")}` : "+998 ";
}
