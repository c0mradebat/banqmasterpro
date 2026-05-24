"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { recalcFinancials } from "./_finance";

const RecordPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.coerce.number().positive(),
  kind: z.enum(["ADVANCE", "PARTIAL", "FINAL", "SECURITY_DEPOSIT", "REFUND", "ADJUSTMENT"]),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function recordPayment(input: z.infer<typeof RecordPaymentSchema>) {
  const data = RecordPaymentSchema.parse(input);
  // Refunds and adjustments are sensitive — require the dedicated permission.
  const perm =
    data.kind === "REFUND" || data.kind === "ADJUSTMENT" ? "RECORD_REFUNDS" : "RECORD_PAYMENTS";
  const user = await requirePermission(perm);

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        kind: data.kind,
        method: data.method,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
        recordedById: user.id,
      },
    });
    await recalcFinancials(tx, data.bookingId);
    await logAudit(tx, {
      userId: user.id,
      action: data.kind === "REFUND" ? "REFUND_PAYMENT" : "RECORD_PAYMENT",
      entity: "Payment",
      entityId: data.bookingId,
      description: `${data.kind} ${data.amount} via ${data.method}`,
    });
  });

  revalidatePath(`/bookings/${data.bookingId}`);
  revalidatePath("/payments");
}

export async function deletePayment(paymentId: string) {
  const user = await requirePermission("DELETE_PAYMENTS");

  const payment = await db.payment.findFirst({
    where: { id: paymentId, deletedAt: null },
  });
  if (!payment) throw new Error("Payment not found");

  await db.$transaction(async (tx) => {
    // Soft delete: tombstone so audits/reports can still trace the original record.
    await tx.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });
    await recalcFinancials(tx, payment.bookingId);
    await logAudit(tx, {
      userId: user.id,
      action: "DELETE_PAYMENT",
      entity: "Payment",
      entityId: payment.bookingId,
      description: `Deleted payment of ${payment.amount}`,
    });
  });

  revalidatePath(`/bookings/${payment.bookingId}`);
}
