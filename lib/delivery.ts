// Customer-chosen delivery time (Agent 2 / time-at-checkout).
//
// An order carries a chosen DAY (deliveryDate, also holding the start time)
// plus a human window label (deliverySlot, e.g. "06:00-08:00"). The slots below
// are the single source of truth shared by the basket picker, the order API,
// and every read-only display surface.
//
// Allowed delivery hours are 06:00-22:00. Windows are 2 hours wide.

export type DeliverySlot = {
  /** Stable label persisted to Order.deliverySlot, e.g. "06:00-08:00". */
  value: string;
  /** Window start hour (0-23), used to build the precise deliveryDate. */
  startHour: number;
  /** Window end hour (0-23). */
  endHour: number;
};

export const DELIVERY_SLOTS: DeliverySlot[] = [
  { value: "06:00-08:00", startHour: 6, endHour: 8 },
  { value: "08:00-10:00", startHour: 8, endHour: 10 },
  { value: "10:00-12:00", startHour: 10, endHour: 12 },
  { value: "12:00-14:00", startHour: 12, endHour: 14 },
  { value: "14:00-16:00", startHour: 14, endHour: 16 },
  { value: "16:00-18:00", startHour: 16, endHour: 18 },
  { value: "18:00-20:00", startHour: 18, endHour: 20 },
  { value: "20:00-22:00", startHour: 20, endHour: 22 },
];

/** The default selected window (early morning) for a fresh checkout. */
export const DEFAULT_DELIVERY_SLOT = DELIVERY_SLOTS[0].value;

/** The window shown for legacy orders that predate customer-chosen times. */
export const LEGACY_DELIVERY_SLOT = "06:00-10:00";

export function getDeliverySlot(value: string | null | undefined): DeliverySlot | null {
  if (!value) return null;
  return DELIVERY_SLOTS.find((s) => s.value === value) ?? null;
}

/** Returns a YYYY-MM-DD string for an <input type="date"> default (local). */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tomorrow as a date-input string — the sensible default delivery day. */
export function defaultDeliveryDateInput(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return toDateInputValue(t);
}

/**
 * Validates a chosen day + slot on the SERVER. Returns the precise delivery
 * Date (day at the slot's start hour) and the canonical slot label, or null if
 * the input is invalid (unknown slot, bad date, or in the past).
 */
export function resolveDeliveryWindow(
  dateInput: unknown,
  slotInput: unknown
): { deliveryDate: Date; deliverySlot: string } | null {
  const slot = getDeliverySlot(typeof slotInput === "string" ? slotInput : null);
  if (!slot) return null;

  if (typeof dateInput !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const deliveryDate = new Date(year, month - 1, day, slot.startHour, 0, 0, 0);
  if (Number.isNaN(deliveryDate.getTime())) return null;
  // Guard against bad components rolling over (e.g. month 13).
  if (
    deliveryDate.getFullYear() !== year ||
    deliveryDate.getMonth() !== month - 1 ||
    deliveryDate.getDate() !== day
  ) {
    return null;
  }

  // Must be in the future (at least one minute out).
  if (deliveryDate.getTime() <= Date.now()) return null;

  return { deliveryDate, deliverySlot: slot.value };
}
