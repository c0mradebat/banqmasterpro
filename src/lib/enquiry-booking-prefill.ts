/** Maps enquiry service flags → booking line items (kinds + default rate keys on Settings). */

import { toDatetimeLocalValue } from "@/lib/datetime-local";

export type EnquiryPrefillSource = {
  hasMarriageHall: boolean;
  hasDiningHall: boolean;
  hasShahiBhoj: boolean;
  hasLawn: boolean;
  hasSwimmingPool: boolean;
  hasPoolRefill: boolean;
  hasPoolParty: boolean;
  hasDjHall: boolean;
  hasCocktail: boolean;
  hasRooms: boolean;
};

export type PrefillServiceRow = {
  kind: string;
  startsAt: string;
  endsAt: string;
  quantity: number;
  unitPrice: number;
  label: string;
};

/** Serializable prefill passed from the new-booking page into `BookingForm`. */
export type QuotationFromEnquiryPrefill = {
  enquiryId: string;
  enquiryCode: string;
  customerName: string;
  phone: string;
  notes: string | null;
  lines: { label: string; qty: number; rate: number }[];
};

export type BookingFromEnquiryPrefill = {
  enquiryId: string;
  enquiryCode: string;
  customer: {
    firstName: string;
    lastName: string | null;
    phone: string;
    city: string | null;
    state: string | null;
  };
  eventType: string;
  eventStart: string;
  eventEnd: string;
  guestCount: number | null;
  notes: string | null;
  serviceItems: PrefillServiceRow[];
};

const FLAG_ROWS: { flag: keyof EnquiryPrefillSource; kind: string; rateKey: string; label: string }[] = [
  { flag: "hasMarriageHall", kind: "MARRIAGE_HALL", rateKey: "marriageHallRate", label: "Marriage Hall" },
  { flag: "hasDiningHall", kind: "DINING_HALL", rateKey: "diningHallRate", label: "Dining Hall" },
  { flag: "hasShahiBhoj", kind: "SHAHI_BHOJ", rateKey: "shahiBhojRate", label: "Shahi Bhoj" },
  { flag: "hasLawn", kind: "LAWN", rateKey: "lawnRate", label: "Lawn" },
  { flag: "hasSwimmingPool", kind: "SWIMMING_POOL", rateKey: "swimmingPoolRate", label: "Swimming Pool" },
  { flag: "hasPoolRefill", kind: "POOL_REFILL", rateKey: "poolRefillRate", label: "Pool Refill" },
  { flag: "hasPoolParty", kind: "POOL_PARTY", rateKey: "poolPartyFee", label: "Pool Party" },
  { flag: "hasDjHall", kind: "DJ_HALL", rateKey: "djHallRate", label: "DJ Hall" },
  { flag: "hasCocktail", kind: "COCKTAIL_PARTY", rateKey: "cocktailRate", label: "Cocktail Party" },
  { flag: "hasRooms", kind: "ROOM_NON_BALCONY", rateKey: "nonBalconyRoomRate", label: "Non-Balcony Rooms" },
];

const ROOM_BOOKING_KINDS = [
  "ROOM_NON_BALCONY",
  "ROOM_BALCONY",
  "ROOM_SUITE",
  "ROOM_DORMITORY",
  "COMPLIMENTARY_ROOM",
] as const;

/** Rows for availability vs bookings + enquiry interest (same flags as prefill). */
export const AVAILABILITY_CHECK_ROWS = FLAG_ROWS.map((row) => ({
  flag: row.flag,
  label: row.label,
  bookingKinds: (row.flag === "hasRooms" ? [...ROOM_BOOKING_KINDS] : [row.kind]) as readonly string[],
}));

const _allAvailKinds = new Set<string>();
for (const r of AVAILABILITY_CHECK_ROWS) for (const k of r.bookingKinds) _allAvailKinds.add(k);
export const AVAILABILITY_ALL_BOOKING_KINDS = [..._allAvailKinds];

/** Default window: today 19:00 → next calendar day 17:00 (local). */
export function getDefaultAvailabilityWindowLocal() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 17, 0, 0, 0);
  return { start: toDatetimeLocalValue(start), end: toDatetimeLocalValue(end) };
}

/** @deprecated Prefer `getDefaultAvailabilityWindowLocal` — kept as alias for existing imports. */
export function getDefaultEventWindowLocal() {
  return getDefaultAvailabilityWindowLocal();
}

export function isoToDatetimeLocalValue(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  const local = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(local).toISOString().slice(0, 16);
}

export function buildServiceRowsFromEnquiry(
  enquiry: EnquiryPrefillSource,
  defaults: Record<string, unknown>,
  eventStart: string,
  eventEnd: string
): PrefillServiceRow[] {
  const rows: PrefillServiceRow[] = [];
  for (const row of FLAG_ROWS) {
    if (!enquiry[row.flag]) continue;
    const rateKey = row.rateKey as string;
    const unitPrice = Number(defaults[rateKey] ?? 0);
    rows.push({
      kind: row.kind,
      startsAt: eventStart,
      endsAt: eventEnd,
      quantity: 1,
      unitPrice,
      label: row.label,
    });
  }
  if (rows.length === 0) {
    rows.push({
      kind: "MARRIAGE_HALL",
      startsAt: eventStart,
      endsAt: eventEnd,
      quantity: 1,
      unitPrice: Number(defaults.marriageHallRate ?? 0),
      label: "Marriage Hall",
    });
  }
  return rows;
}

/** Sum of default list-price for all services the enquiry flagged (same logic as booking prefill). */
export function sumEnquiryInterestEstimate(
  enquiry: EnquiryPrefillSource,
  defaults: Record<string, unknown>
): number {
  const t = "2000-01-01T12:00";
  const rows = buildServiceRowsFromEnquiry(enquiry, defaults, t, t);
  return rows.reduce((sum, r) => sum + Number(r.unitPrice) * Number(r.quantity), 0);
}

/** Line items for a quotation from enquiry flags (label, qty, rate). */
export function buildQuotationLinesFromEnquiry(
  enquiry: EnquiryPrefillSource,
  defaults: Record<string, unknown>
): { label: string; qty: number; rate: number }[] {
  const t = "2000-01-01T12:00";
  return buildServiceRowsFromEnquiry(enquiry, defaults, t, t).map((r) => ({
    label: r.label,
    qty: r.quantity,
    rate: r.unitPrice,
  }));
}
