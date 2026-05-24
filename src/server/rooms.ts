"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RoomStatus, RoomType } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const RoomStatusValues = ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "DIRTY", "RESERVED"] as const;
const RoomTypeValues = ["NON_BALCONY", "BALCONY", "DORMITORY", "SUITE"] as const;

export async function setRoomStatus(id: string, status: RoomStatus) {
  const user = await requirePermission("SET_ROOM_STATUS");
  const validStatus = z.enum(RoomStatusValues).parse(status);

  await db.$transaction(async (tx) => {
    await tx.room.update({ where: { id }, data: { status: validStatus } });
    await logAudit(tx, {
      userId: user.id,
      action: "UPDATE_ROOM",
      entity: "Room",
      entityId: id,
      description: `Set status to ${validStatus}`,
    });
  });

  revalidatePath("/rooms");
}

const CreateRoomInput = z.object({
  number: z.string().min(1),
  type: z.enum(RoomTypeValues),
  floor: z.coerce.number().int().min(0).default(0),
  capacity: z.coerce.number().int().min(1).default(2),
});

export async function createRoom(input: { number: string; type: RoomType; floor: number; capacity: number }) {
  const user = await requirePermission("CREATE_ROOMS");
  const data = CreateRoomInput.parse(input);

  await db.$transaction(async (tx) => {
    const created = await tx.room.create({ data });
    await logAudit(tx, {
      userId: user.id,
      action: "CREATE_ROOM",
      entity: "Room",
      entityId: created.id,
      description: `Created room ${created.number}`,
    });
  });

  revalidatePath("/rooms");
}
