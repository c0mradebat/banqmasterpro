"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const EnquiryFields = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().nullable(),
  phone: z.string().min(5),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  eventType: z.string().default("OTHER"),
  eventStart: z.string().optional().nullable(),
  eventEnd: z.string().optional().nullable(),
  guestCount: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),

  hasMarriageHall: z.coerce.boolean().default(false),
  hasDiningHall: z.coerce.boolean().default(false),
  hasShahiBhoj: z.coerce.boolean().default(false),
  hasLawn: z.coerce.boolean().default(false),
  hasSwimmingPool: z.coerce.boolean().default(false),
  hasPoolRefill: z.coerce.boolean().default(false),
  hasPoolParty: z.coerce.boolean().default(false),
  hasDjHall: z.coerce.boolean().default(false),
  hasCocktail: z.coerce.boolean().default(false),
  hasRooms: z.coerce.boolean().default(false),
});

function refineEnquiryEventOrder<T extends z.infer<typeof EnquiryFields>>(data: T, ctx: z.RefinementCtx) {
  if (data.eventStart && data.eventEnd) {
    const s = new Date(data.eventStart);
    const e = new Date(data.eventEnd);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tentative end must be after tentative start.",
        path: ["eventEnd"],
      });
    }
  }
}

const CreateEnquirySchema = EnquiryFields.superRefine(refineEnquiryEventOrder);

export type CreateEnquiryInput = z.infer<typeof CreateEnquirySchema>;

async function nextEnquiryCode() {
  const last = await db.enquiry.findFirst({
    where: { code: { startsWith: `EQ-${new Date().getFullYear()}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastNum = last ? Number(last.code.split("-").pop()) : 0;
  return `EQ-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, "0")}`;
}

export async function createEnquiry(input: CreateEnquiryInput) {
  const user = await requirePermission("MANAGE_ENQUIRIES");
  const data = CreateEnquirySchema.parse(input);

  const customer = await db.customer.upsert({
    where: { phone: data.phone },
    update: { firstName: data.firstName, lastName: data.lastName ?? undefined, city: data.city ?? undefined, state: data.state ?? undefined },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      city: data.city,
      state: data.state,
    },
  });

  const code = await nextEnquiryCode();
  const enq = await db.enquiry.create({
    data: {
      code,
      status: "NEW",
      eventType: data.eventType as any,
      eventStart: data.eventStart ? new Date(data.eventStart) : null,
      eventEnd: data.eventEnd ? new Date(data.eventEnd) : null,
      guestCount: data.guestCount ?? null,
      notes: data.notes,
      customerId: customer.id,
      createdById: user.id,
      hasMarriageHall: data.hasMarriageHall,
      hasDiningHall: data.hasDiningHall,
      hasShahiBhoj: data.hasShahiBhoj,
      hasLawn: data.hasLawn,
      hasSwimmingPool: data.hasSwimmingPool,
      hasPoolRefill: data.hasPoolRefill,
      hasPoolParty: data.hasPoolParty,
      hasDjHall: data.hasDjHall,
      hasCocktail: data.hasCocktail,
      hasRooms: data.hasRooms,
    },
  });

  await logAudit(db, {
    userId: user.id,
    action: "CREATE_ENQUIRY",
    entity: "Enquiry",
    entityId: enq.id,
    description: `New enquiry ${enq.code}`,
  });

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  return enq.id;
}

const UpdateEnquirySchema = EnquiryFields.extend({ id: z.string().min(1) }).superRefine(refineEnquiryEventOrder);

export type UpdateEnquiryInput = z.infer<typeof UpdateEnquirySchema>;

export async function updateEnquiry(input: UpdateEnquiryInput) {
  const user = await requirePermission("MANAGE_ENQUIRIES");
  const data = UpdateEnquirySchema.parse(input);

  const existing = await db.enquiry.findUnique({
    where: { id: data.id },
    include: { customer: true },
  });
  if (!existing) throw new Error("Enquiry not found");
  if (existing.status === "CONVERTED" || existing.convertedBookingId) {
    throw new Error("Cannot edit an enquiry that is already converted to a booking");
  }

  const newPhone = data.phone.trim();
  if (newPhone !== existing.customer.phone) {
    const clash = await db.customer.findUnique({ where: { phone: newPhone } });
    if (clash && clash.id !== existing.customerId) {
      throw new Error("That phone number belongs to another customer");
    }
  }

  await db.customer.update({
    where: { id: existing.customerId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      phone: newPhone,
      city: data.city ?? null,
      state: data.state ?? null,
    },
  });

  await db.enquiry.update({
    where: { id: data.id },
    data: {
      eventType: data.eventType as any,
      eventStart: data.eventStart ? new Date(data.eventStart) : null,
      eventEnd: data.eventEnd ? new Date(data.eventEnd) : null,
      guestCount: data.guestCount ?? null,
      notes: data.notes,
      hasMarriageHall: data.hasMarriageHall,
      hasDiningHall: data.hasDiningHall,
      hasShahiBhoj: data.hasShahiBhoj,
      hasLawn: data.hasLawn,
      hasSwimmingPool: data.hasSwimmingPool,
      hasPoolRefill: data.hasPoolRefill,
      hasPoolParty: data.hasPoolParty,
      hasDjHall: data.hasDjHall,
      hasCocktail: data.hasCocktail,
      hasRooms: data.hasRooms,
    },
  });

  await logAudit(db, {
    userId: user.id,
    action: "UPDATE_ENQUIRY",
    entity: "Enquiry",
    entityId: data.id,
    description: `Updated enquiry ${existing.code}`,
  });

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${data.id}`);
  revalidatePath("/dashboard");
}

export async function setEnquiryStatus(id: string, status: "NEW" | "CONTACTED" | "QUOTED" | "CONVERTED" | "LOST" | "CANCELLED") {
  const user = await requirePermission("MANAGE_ENQUIRIES");
  await db.$transaction(async (tx) => {
    await tx.enquiry.update({ where: { id }, data: { status } });
    await logAudit(tx, {
      userId: user.id,
      action: "SET_ENQUIRY_STATUS",
      entity: "Enquiry",
      entityId: id,
      description: `Status → ${status}`,
    });
  });
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
}

/** Allowed when enquiry is lost/cancelled, or conversion booking exists and is cancelled. */
export async function deleteEnquiry(id: string) {
  const user = await requirePermission("DELETE_ENQUIRIES");

  const e = await db.enquiry.findUnique({
    where: { id },
    include: { convertedBooking: { select: { id: true, status: true, code: true } } },
  });
  if (!e) throw new Error("Enquiry not found");

  const deletable =
    e.status === "CANCELLED" ||
    e.status === "LOST" ||
    (e.convertedBookingId != null && e.convertedBooking?.status === "CANCELLED");
  if (!deletable) {
    throw new Error("Only lost/cancelled enquiries, or ones whose linked booking is cancelled, can be deleted.");
  }

  await db.$transaction(async (tx) => {
    await tx.quotation.deleteMany({ where: { enquiryId: id } });
    await tx.enquiry.delete({ where: { id } });
    await logAudit(tx, {
      userId: user.id,
      action: "DELETE_ENQUIRY",
      entity: "Enquiry",
      entityId: id,
      description: `Deleted enquiry ${e.code}`,
    });
  });

  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  revalidatePath("/quotations");
  revalidatePath(`/enquiries/${id}`);
}
