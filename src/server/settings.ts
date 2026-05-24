"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

/** Whitelist of settings fields. `id` and `updatedAt` are server-managed and not editable. */
const SettingsInput = z
  .object({
    venueName: z.string().min(1).optional(),
    venueAddress: z.string().nullable().optional(),
    venuePhone: z.string().nullable().optional(),
    venueEmail: z.string().email().nullable().optional().or(z.literal("")),
    gstNumber: z.string().nullable().optional(),
    currency: z.string().min(1).optional(),

    marriageHallRate: z.coerce.number().min(0).optional(),
    diningHallRate: z.coerce.number().min(0).optional(),
    shahiBhojRate: z.coerce.number().min(0).optional(),
    lawnRate: z.coerce.number().min(0).optional(),
    swimmingPoolRate: z.coerce.number().min(0).optional(),
    poolRefillRate: z.coerce.number().min(0).optional(),
    poolPartyFee: z.coerce.number().min(0).optional(),
    djHallRate: z.coerce.number().min(0).optional(),
    cocktailRate: z.coerce.number().min(0).optional(),

    nonBalconyRoomRate: z.coerce.number().min(0).optional(),
    balconyRoomRate: z.coerce.number().min(0).optional(),
    dormitoryRoomRate: z.coerce.number().min(0).optional(),
    suiteRoomRate: z.coerce.number().min(0).optional(),
    addonMattressRate: z.coerce.number().min(0).optional(),

    electricityRatePerUnit: z.coerce.number().min(0).optional(),
    generatorRatePerHour: z.coerce.number().min(0).optional(),

    defaultGstPercent: z.coerce.number().min(0).max(100).optional(),
    freeRoomsPerBooking: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SettingsInput = z.infer<typeof SettingsInput>;

export async function saveSettings(input: unknown) {
  const user = await requirePermission("MANAGE_SETTINGS");
  const data = SettingsInput.parse(input);

  await db.$transaction(async (tx) => {
    await tx.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "UPDATE_SETTINGS",
      entity: "Settings",
      description: "Updated venue settings",
    });
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

const BlackoutInput = z.object({
  date: z.string().min(1),
  reason: z.string().optional().nullable(),
});

export async function addBlackoutDate(date: string, reason?: string) {
  const user = await requirePermission("MANAGE_SETTINGS");
  const data = BlackoutInput.parse({ date, reason });

  const created = await db.$transaction(async (tx) => {
    const row = await tx.blackoutDate.create({
      data: { date: new Date(data.date), reason: data.reason || null },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "ADD_BLACKOUT",
      entity: "BlackoutDate",
      entityId: row.id,
      description: `Blackout ${data.date}${data.reason ? ` — ${data.reason}` : ""}`,
    });
    return row;
  });

  revalidatePath("/settings");
  revalidatePath("/calendar");
  return created;
}

export async function removeBlackoutDate(id: string) {
  const user = await requirePermission("MANAGE_SETTINGS");

  await db.$transaction(async (tx) => {
    await tx.blackoutDate.delete({ where: { id } });
    await logAudit(tx, {
      userId: user.id,
      action: "REMOVE_BLACKOUT",
      entity: "BlackoutDate",
      entityId: id,
    });
  });

  revalidatePath("/settings");
  revalidatePath("/calendar");
}
