"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ServiceKind } from "@/generated/prisma/client";
import {
  AVAILABILITY_ALL_BOOKING_KINDS,
  AVAILABILITY_CHECK_ROWS,
} from "@/lib/enquiry-booking-prefill";
import { requirePermission, requireUser } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { computeFinancials } from "@/lib/money";
import { recalcAndRevalidate } from "./_finance";

const ServiceItemSchema = z.object({
  kind: z.string(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  label: z.string().optional().nullable(),
});

const CreateBookingSchema = z.object({
  // Customer
  firstName: z.string().min(1),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(5),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),

  // Event
  eventType: z.string(),
  eventStart: z.string(),
  eventEnd: z.string(),
  guestCount: z.coerce.number().int().min(0).optional().nullable(),
  bookingDate: z.string().optional().nullable(),

  // Vendors
  cateringVendorId: z.string().optional().nullable(),
  decorationVendorId: z.string().optional().nullable(),
  eventMgmtVendorId: z.string().optional().nullable(),

  // Money
  discount: z.coerce.number().min(0).default(0),
  discountReason: z.string().optional().nullable(),
  miscCharges: z.coerce.number().min(0).default(0),
  miscReason: z.string().optional().nullable(),
  electricityRate: z.coerce.number().min(0).default(0),
  generatorRate: z.coerce.number().min(0).default(0),
  addonMattresses: z.coerce.number().int().min(0).default(0),
  addonMattressRate: z.coerce.number().min(0).default(0),
  securityDeposit: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),

  // Initial payment
  initialPayment: z.coerce.number().min(0).default(0),
  initialPaymentMethod: z.string().optional().nullable(),
  initialPaymentReference: z.string().optional().nullable(),

  serviceItems: z.array(ServiceItemSchema).default([]),

  /** When set, enquiry is linked as converted and marked CONVERTED after booking is created. */
  enquiryId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined)),
})
  .superRefine((data, ctx) => {
    const es = new Date(data.eventStart);
    const ee = new Date(data.eventEnd);
    if (Number.isNaN(es.getTime()) || Number.isNaN(ee.getTime()) || ee <= es) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event end must be after event start.",
        path: ["eventEnd"],
      });
    }
    data.serviceItems.forEach((si, i) => {
      if (!si.startsAt || !si.endsAt) return;
      const s = new Date(si.startsAt);
      const e = new Date(si.endsAt);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e <= s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Service end must be after service start.",
          path: ["serviceItems", i, "endsAt"],
        });
      }
    });
  });

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export async function createBooking(input: CreateBookingInput) {
  const user = await requirePermission("MANAGE_BOOKINGS");

  const data = CreateBookingSchema.parse(input);

  let enquiryCustomerId: string | undefined;
  if (data.enquiryId) {
    const enquiry = await db.enquiry.findUnique({
      where: { id: data.enquiryId },
      select: { id: true, customerId: true, convertedBookingId: true, code: true },
    });
    if (!enquiry) throw new Error("Enquiry not found");
    if (enquiry.convertedBookingId) {
      throw new Error("This enquiry is already linked to a booking");
    }
    enquiryCustomerId = enquiry.customerId;
  }

  // Customer upsert by phone
  const customer = await db.customer.upsert({
    where: { phone: data.phone },
    update: {
      firstName: data.firstName,
      lastName: data.lastName ?? undefined,
      city: data.city ?? undefined,
      state: data.state ?? undefined,
    },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      city: data.city,
      state: data.state,
    },
  });

  if (enquiryCustomerId && customer.id !== enquiryCustomerId) {
    throw new Error(
      "Customer must match the enquiry (same phone and lead). Restore customer fields from the enquiry or open a new booking without converting."
    );
  }

  const subtotal = data.serviceItems.reduce(
    (s, i) => s + Number(i.unitPrice) * Number(i.quantity || 1),
    0
  );
  const initialFinancials = computeFinancials({
    subtotal,
    discount: data.discount,
    miscCharges: data.miscCharges,
    electricityUnits: 0,
    electricityRate: data.electricityRate,
    generatorHours: 0,
    generatorRate: data.generatorRate,
    addonMattresses: data.addonMattresses,
    addonMattressRate: data.addonMattressRate,
    securityDeposit: data.securityDeposit,
    payments: data.initialPayment > 0
      ? [{ kind: "ADVANCE", amount: data.initialPayment }]
      : [],
  });

  // Booking flags from kinds
  const kinds = new Set(data.serviceItems.map((i) => i.kind));
  const flags = {
    hasMarriageHall: kinds.has("MARRIAGE_HALL"),
    hasDiningHall: kinds.has("DINING_HALL"),
    hasShahiBhoj: kinds.has("SHAHI_BHOJ"),
    hasLawn: kinds.has("LAWN"),
    hasSwimmingPool: kinds.has("SWIMMING_POOL"),
    hasPoolRefill: kinds.has("POOL_REFILL"),
    hasPoolParty: kinds.has("POOL_PARTY"),
    hasDjHall: kinds.has("DJ_HALL"),
    hasCocktail: kinds.has("COCKTAIL_PARTY"),
  };

  // If only rooms selected, override eventType to ROOMS_ONLY
  const onlyRooms = [...kinds].every((k) => k.startsWith("ROOM_") || k === "COMPLIMENTARY_ROOM");
  const finalEventType = onlyRooms ? "ROOMS_ONLY" : data.eventType;

  const bookingId = await db.$transaction(async (tx) => {
    const year = new Date().getFullYear();
    const last = await tx.booking.findFirst({
      where: { code: { startsWith: `BM-${year}-` } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const lastNum = last ? Number(last.code.split("-").pop()) : 0;
    const code = `BM-${year}-${String(lastNum + 1).padStart(4, "0")}`;

    const booking = await tx.booking.create({
      data: {
        code,
        status: "TENTATIVE",
        eventType: finalEventType as any,
        eventStart: new Date(data.eventStart),
        eventEnd: new Date(data.eventEnd),
        guestCount: data.guestCount ?? null,
        bookingDate: data.bookingDate ? new Date(data.bookingDate) : new Date(),
        customerId: customer.id,
        createdById: user.id,

        ...flags,
        cateringVendorId: data.cateringVendorId || null,
        decorationVendorId: data.decorationVendorId || null,
        eventMgmtVendorId: data.eventMgmtVendorId || null,

        subtotal,
        discount: data.discount,
        discountReason: data.discountReason,
        miscCharges: data.miscCharges,
        miscReason: data.miscReason,
        electricityRate: data.electricityRate,
        generatorRate: data.generatorRate,
        addonMattresses: data.addonMattresses,
        addonMattressRate: data.addonMattressRate,
        securityDeposit: data.securityDeposit,
        totalAmount: initialFinancials.totalAmount,
        paidAmount: 0,
        balanceDue: initialFinancials.grossPayable,
        notes: data.notes,

        serviceItems: {
          create: data.serviceItems.map((si) => ({
            kind: si.kind as ServiceKind,
            label: si.label || undefined,
            startsAt: si.startsAt ? new Date(si.startsAt) : null,
            endsAt: si.endsAt ? new Date(si.endsAt) : null,
            quantity: si.quantity,
            unitPrice: si.unitPrice,
            total: Number(si.unitPrice) * Number(si.quantity),
          })),
        },
      },
    });

    if (data.initialPayment > 0) {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: data.initialPayment,
          kind: "ADVANCE",
          method: (data.initialPaymentMethod ?? "CASH") as never,
          reference: data.initialPaymentReference ?? undefined,
          recordedById: user.id,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          paidAmount: initialFinancials.paidAmount,
          balanceDue: initialFinancials.balanceDue,
          status: "CONFIRMED",
        },
      });
    }

    if (data.enquiryId) {
      const linked = await tx.enquiry.updateMany({
        where: { id: data.enquiryId, convertedBookingId: null },
        data: { convertedBookingId: booking.id, status: "CONVERTED" },
      });
      if (linked.count !== 1) {
        throw new Error("Could not link enquiry — it may have been converted already.");
      }
    }

    const auditDescription =
      data.enquiryId != null
        ? `Created booking ${booking.code} from enquiry (linked) for ${customer.firstName} ${customer.lastName ?? ""}`
        : `Created booking ${booking.code} for ${customer.firstName} ${customer.lastName ?? ""}`;

    await logAudit(tx, {
      userId: user.id,
      action: "CREATE_BOOKING",
      entity: "Booking",
      entityId: booking.id,
      description: auditDescription,
    });

    return booking.id;
  });

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/enquiries");
  if (data.enquiryId) {
    revalidatePath(`/enquiries/${data.enquiryId}`);
  }
  return bookingId;
}

export async function cancelBooking(id: string, reason: string) {
  const user = await requirePermission("CANCEL_BOOKINGS");

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "CANCEL_BOOKING",
      entity: "Booking",
      entityId: id,
      description: reason,
    });
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}

/**
 * Public server-action wrapper that recomputes booking financials. The real logic lives in
 * `_finance.ts` (a non-action module) so it can also be called inside transactions.
 */
export async function recalcAndUpdateFinancials(bookingId: string) {
  await requirePermission("MANAGE_BOOKINGS");
  await recalcAndRevalidate(bookingId);
}

export async function checkAvailability(opts: {
  start: string;
  end: string;
  service: string; // ServiceKind name
}) {
  await requireUser();
  const start = new Date(opts.start);
  const end = new Date(opts.end);

  const conflicts = await db.bookingServiceItem.findMany({
    where: {
      kind: opts.service as never,
      startsAt: { not: null, lt: end },
      endsAt: { not: null, gt: start },
      booking: { status: { not: "CANCELLED" }, deletedAt: null },
    },
    include: {
      booking: { include: { customer: true } },
    },
  });

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map((c) => ({
      bookingId: c.bookingId,
      code: c.booking.code,
      customer: `${c.booking.customer.firstName} ${c.booking.customer.lastName ?? ""}`,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
    })),
  };
}

export type AvailabilityWindowRowResult = {
  key: string;
  label: string;
  available: boolean;
  bookingConflicts: {
    bookingId: string;
    code: string;
    customer: string;
    itemKind: string;
    startsAt: string | null;
    endsAt: string | null;
  }[];
  enquiryConflicts: {
    enquiryId: string;
    code: string;
    customer: string;
    status: string;
    eventStart: string;
    eventEnd: string;
  }[];
  /** Same resource flagged, but enquiry has no full tentative window yet. */
  enquiryInterestNoDates: {
    enquiryId: string;
    code: string;
    customer: string;
    status: string;
  }[];
};

function enquiryCustomerName(c: { firstName: string; lastName: string | null }) {
  return `${c.firstName} ${c.lastName ?? ""}`.trim();
}

function timeRangesOverlap(a0: Date, a1: Date, b0: Date, b1: Date) {
  return a0 < b1 && a1 > b0;
}

/** All tracked resources for one window: booking lines + overlapping enquiries + interest-only enquiries. */
export async function checkAvailabilityWindow(opts: { start: string; end: string }) {
  await requireUser();

  const start = new Date(opts.start);
  const end = new Date(opts.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Select a valid window: end must be after start.");
  }

  const [bookingItems, enquiriesTimed, enquiriesPartial] = await Promise.all([
    db.bookingServiceItem.findMany({
      where: {
        kind: { in: AVAILABILITY_ALL_BOOKING_KINDS as unknown as ServiceKind[] },
        startsAt: { not: null, lt: end },
        endsAt: { not: null, gt: start },
        booking: { status: { not: "CANCELLED" }, deletedAt: null },
      },
      include: { booking: { include: { customer: true } } },
    }),
    db.enquiry.findMany({
      where: {
        status: { notIn: ["CANCELLED", "LOST"] },
        convertedBookingId: null,
        AND: [
          { eventStart: { not: null } },
          { eventEnd: { not: null } },
          { eventStart: { lt: end } },
          { eventEnd: { gt: start } },
        ],
      },
      include: { customer: true },
    }),
    db.enquiry.findMany({
      where: {
        status: { notIn: ["CANCELLED", "LOST"] },
        convertedBookingId: null,
        AND: [
          { OR: [{ eventStart: null }, { eventEnd: null }] },
          {
            OR: [
              { hasMarriageHall: true },
              { hasDiningHall: true },
              { hasShahiBhoj: true },
              { hasLawn: true },
              { hasSwimmingPool: true },
              { hasPoolRefill: true },
              { hasPoolParty: true },
              { hasDjHall: true },
              { hasCocktail: true },
              { hasRooms: true },
            ],
          },
        ],
      },
      include: { customer: true },
      take: 80,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const rows: AvailabilityWindowRowResult[] = AVAILABILITY_CHECK_ROWS.map((row) => {
    const bookingKindsSet = new Set(row.bookingKinds);
    const bookingConflicts = bookingItems
      .filter((c) => bookingKindsSet.has(c.kind))
      .map((c) => ({
        bookingId: c.bookingId,
        code: c.booking.code,
        customer: enquiryCustomerName(c.booking.customer),
        itemKind: c.kind,
        startsAt: c.startsAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
      }));

    const enquiryConflicts = enquiriesTimed
      .filter((en) => {
        if (!(en as unknown as Record<string, boolean>)[row.flag]) return false;
        const es = en.eventStart!;
        const ee = en.eventEnd!;
        return timeRangesOverlap(es, ee, start, end);
      })
      .map((en) => ({
        enquiryId: en.id,
        code: en.code,
        customer: enquiryCustomerName(en.customer),
        status: en.status,
        eventStart: en.eventStart!.toISOString(),
        eventEnd: en.eventEnd!.toISOString(),
      }));

    const interestSeen = new Set<string>();
    const enquiryInterestNoDates: AvailabilityWindowRowResult["enquiryInterestNoDates"] = [];
    for (const en of enquiriesPartial) {
      if (!(en as unknown as Record<string, boolean>)[row.flag]) continue;
      if (interestSeen.has(en.id)) continue;
      interestSeen.add(en.id);
      enquiryInterestNoDates.push({
        enquiryId: en.id,
        code: en.code,
        customer: enquiryCustomerName(en.customer),
        status: en.status,
      });
    }

    const busy =
      bookingConflicts.length > 0 ||
      enquiryConflicts.length > 0;

    return {
      key: row.bookingKinds[0] ?? String(row.flag),
      label: row.label,
      available: !busy,
      bookingConflicts,
      enquiryConflicts,
      enquiryInterestNoDates,
    };
  });

  return { windowStart: start.toISOString(), windowEnd: end.toISOString(), rows };
}

/** Remove a cancelled booking. `purgeLinked` deletes its conversion enquiry and all quotations for that enquiry first. */
export async function deleteCancelledBooking(bookingId: string, purgeLinked: boolean) {
  const user = await requirePermission("DELETE_BOOKINGS");

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, code: true, status: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "CANCELLED") {
    throw new Error("Only cancelled bookings can be deleted.");
  }

  const linkedEnquiry = await db.enquiry.findFirst({
    where: { convertedBookingId: bookingId },
    select: { id: true, code: true },
  });

  const now = new Date();
  await db.$transaction(async (tx) => {
    if (linkedEnquiry) {
      if (purgeLinked) {
        await tx.quotation.deleteMany({ where: { enquiryId: linkedEnquiry.id } });
        await tx.enquiry.delete({ where: { id: linkedEnquiry.id } });
      } else {
        await tx.enquiry.update({
          where: { id: linkedEnquiry.id },
          data: { convertedBookingId: null, status: "QUOTED" },
        });
      }
    }
    // Soft delete: tombstone the booking and its payments so financial history is preserved.
    await tx.booking.update({ where: { id: bookingId }, data: { deletedAt: now } });
    await tx.payment.updateMany({
      where: { bookingId, deletedAt: null },
      data: { deletedAt: now },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "DELETE_BOOKING",
      entity: "Booking",
      entityId: bookingId,
      description: `${booking.code} removed (${purgeLinked && linkedEnquiry ? "with enquiry " + linkedEnquiry.code : "booking only"})`,
    });
  });

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/quotations");
  revalidatePath("/enquiries");
  if (linkedEnquiry) {
    revalidatePath(`/enquiries/${linkedEnquiry.id}`);
  }
  revalidatePath(`/bookings/${bookingId}`);
}
