"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { recalcFinancials } from "./_finance";

const MeterReadingInput = z.object({
  reading: z.coerce.number().min(0),
  bookingId: z.string().nullable().optional(),
  kind: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function recordMeterReading(input: z.infer<typeof MeterReadingInput>) {
  const user = await requirePermission("MANAGE_ELECTRICITY");
  const data = MeterReadingInput.parse(input);
  const kind = data.kind ?? "MAIN";

  await db.$transaction(async (tx) => {
    const reading = await tx.meterReading.create({
      data: {
        reading: data.reading,
        bookingId: data.bookingId ?? null,
        kind,
        notes: data.notes ?? undefined,
        recordedById: user.id,
      },
    });

    if (data.bookingId) {
      const readings = await tx.meterReading.findMany({
        where: { bookingId: data.bookingId, kind },
        orderBy: { readingAt: "asc" },
        select: { reading: true },
      });
      if (readings.length >= 2) {
        const first = Number(readings[0].reading);
        const last = Number(readings[readings.length - 1].reading);
        const consumed = Math.max(0, last - first);
        await tx.booking.update({
          where: { id: data.bookingId },
          data: { electricityUnits: consumed },
        });
        await recalcFinancials(tx, data.bookingId);
      }
    }

    await logAudit(tx, {
      userId: user.id,
      action: "RECORD_METER_READING",
      entity: "MeterReading",
      entityId: reading.id,
      description: `${kind} reading ${data.reading}${data.bookingId ? ` for booking` : ""}`,
    });
  });

  revalidatePath("/electricity");
  if (data.bookingId) revalidatePath(`/bookings/${data.bookingId}`);
}
