"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

async function nextCode() {
  const last = await db.quotation.findFirst({
    where: { code: { startsWith: `QT-${new Date().getFullYear()}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastNum = last ? Number(last.code.split("-").pop()) : 0;
  return `QT-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, "0")}`;
}

const CreateQuotationSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  body: z.any(),
  total: z.coerce.number().min(0),
  enquiryId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined)),
});

export async function createQuotation(input: {
  customerName: string;
  phone?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  body: unknown;
  total: number;
  enquiryId?: string | null;
}) {
  const user = await requirePermission("MANAGE_QUOTATIONS");

  const data = CreateQuotationSchema.parse(input);

  let enquiryCustomerId: string | undefined;
  if (data.enquiryId) {
    const enq = await db.enquiry.findUnique({
      where: { id: data.enquiryId },
      select: {
        id: true,
        customerId: true,
        status: true,
        convertedBookingId: true,
      },
    });
    if (!enq) throw new Error("Enquiry not found");
    if (enq.convertedBookingId || enq.status === "CONVERTED") {
      throw new Error("This enquiry is already converted to a booking");
    }
    if (enq.status === "LOST" || enq.status === "CANCELLED") {
      throw new Error("Cannot attach a quotation to a lost or cancelled enquiry");
    }
    enquiryCustomerId = enq.customerId;
  }

  const code = await nextCode();

  const created = await db.quotation.create({
    data: {
      code,
      customerName: data.customerName,
      phone: data.phone ?? undefined,
      ...(enquiryCustomerId ? { customerId: enquiryCustomerId } : {}),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes ?? undefined,
      total: data.total,
      body: data.body,
      enquiryId: data.enquiryId ?? null,
    },
  });

  if (data.enquiryId) {
    await db.enquiry.update({
      where: { id: data.enquiryId },
      data: {
        status: "QUOTED",
      },
    });
    revalidatePath("/enquiries");
    revalidatePath(`/enquiries/${data.enquiryId}`);
  }

  await logAudit(db, {
    userId: user.id,
    action: "CREATE_QUOTATION",
    entity: "Quotation",
    entityId: created.id,
    description: `Created quotation ${created.code}`,
  });

  revalidatePath("/quotations");
  return created.id;
}

/** When the enquiry is lost/cancelled or the linked conversion booking is cancelled. */
export async function deleteQuotation(id: string) {
  const user = await requirePermission("DELETE_QUOTATIONS");

  const q = await db.quotation.findUnique({
    where: { id },
    include: {
      enquiry: {
        include: { convertedBooking: { select: { id: true, status: true } } },
      },
    },
  });
  if (!q) throw new Error("Quotation not found");
  if (!q.enquiryId || !q.enquiry) {
    throw new Error("Only quotations linked to an enquiry can be deleted this way.");
  }

  const en = q.enquiry;
  const ok =
    en.status === "CANCELLED" ||
    en.status === "LOST" ||
    (en.convertedBooking != null && en.convertedBooking.status === "CANCELLED");
  if (!ok) {
    throw new Error(
      "Quotation can only be deleted when the enquiry is lost/cancelled or the linked booking is cancelled."
    );
  }

  await db.$transaction(async (tx) => {
    await tx.quotation.delete({ where: { id } });
    await logAudit(tx, {
      userId: user.id,
      action: "DELETE_QUOTATION",
      entity: "Quotation",
      entityId: id,
      description: `Deleted quotation ${q.code}`,
    });
  });

  revalidatePath("/quotations");
  revalidatePath("/enquiries");
  if (q.enquiryId) {
    revalidatePath(`/enquiries/${q.enquiryId}`);
  }
  revalidatePath(`/quotations/${id}`);
}
