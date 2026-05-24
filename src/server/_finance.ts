import "server-only";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { computeFinancials } from "@/lib/money";
import type { PrismaClient } from "@/generated/prisma/client";

/** Minimal surface required to recompute booking financials. Both `db` and a tx client satisfy this. */
type FinanceClient = Pick<PrismaClient, "booking" | "payment">;

/**
 * Recompute and persist booking financials from the source of truth (Payment rows + meter readings + charges).
 *
 * Call inside the same transaction as the mutation that changed inputs so the cached
 * `paidAmount` / `balanceDue` on Booking is never observably stale.
 */
export async function recalcFinancials(client: FinanceClient, bookingId: string) {
  const b = await client.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    include: {
      payments: {
        where: { deletedAt: null },
        select: { kind: true, amount: true },
      },
    },
  });
  if (!b) return;

  const r = computeFinancials({
    subtotal: b.subtotal,
    discount: b.discount,
    miscCharges: b.miscCharges,
    electricityUnits: b.electricityUnits,
    electricityRate: b.electricityRate,
    generatorHours: b.generatorHours,
    generatorRate: b.generatorRate,
    addonMattresses: b.addonMattresses,
    addonMattressRate: b.addonMattressRate,
    securityDeposit: b.securityDeposit,
    payments: b.payments.map((p) => ({ kind: p.kind, amount: p.amount })),
  });

  await client.booking.update({
    where: { id: bookingId },
    data: {
      electricityCharge: r.electricityCharge,
      generatorCharge: r.generatorCharge,
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount,
      refundAmount: r.refundAmount,
      balanceDue: r.balanceDue,
    },
  });
}

/** Convenience for use outside any transaction. Also revalidates the booking page. */
export async function recalcAndRevalidate(bookingId: string) {
  await recalcFinancials(db, bookingId);
  revalidatePath(`/bookings/${bookingId}`);
}
