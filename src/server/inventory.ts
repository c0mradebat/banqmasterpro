"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const InventoryInput = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  unitCost: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().int().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
});

export async function createInventoryItem(input: z.infer<typeof InventoryInput>) {
  const user = await requirePermission("MANAGE_INVENTORY");
  const data = InventoryInput.parse(input);

  await db.$transaction(async (tx) => {
    const created = await tx.inventoryItem.create({ data });
    await logAudit(tx, {
      userId: user.id,
      action: "CREATE_INVENTORY",
      entity: "InventoryItem",
      entityId: created.id,
      description: `Added ${created.name}`,
    });
  });

  revalidatePath("/inventory");
}
