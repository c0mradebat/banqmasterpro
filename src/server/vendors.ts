"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const VendorKindValues = [
  "CATERER",
  "DECORATOR",
  "EVENT_MANAGER",
  "DJ",
  "PHOTOGRAPHER",
  "FLORIST",
  "OTHER",
] as const;

const CreateVendorInput = z.object({
  name: z.string().min(1),
  kind: z.enum(VendorKindValues),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export async function createVendor(input: z.input<typeof CreateVendorInput>) {
  const user = await requirePermission("MANAGE_VENDORS");
  const data = CreateVendorInput.parse(input);

  await db.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        name: data.name,
        kind: data.kind,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
      },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "CREATE_VENDOR",
      entity: "Vendor",
      entityId: created.id,
      description: `Added vendor ${created.name} (${created.kind})`,
    });
  });

  revalidatePath("/vendors");
}

export async function toggleVendorActive(id: string) {
  const user = await requirePermission("MANAGE_VENDORS");
  const v = await db.vendor.findUnique({ where: { id } });
  if (!v) throw new Error("Vendor not found");

  await db.$transaction(async (tx) => {
    await tx.vendor.update({ where: { id }, data: { active: !v.active } });
    await logAudit(tx, {
      userId: user.id,
      action: "TOGGLE_VENDOR_ACTIVE",
      entity: "Vendor",
      entityId: id,
      description: `${v.name} → ${!v.active ? "active" : "inactive"}`,
    });
  });

  revalidatePath("/vendors");
}
