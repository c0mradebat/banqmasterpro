"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const AllocationInput = z
  .object({
    bookingId: z.string().min(1),
    roomId: z.string().min(1),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    guestName: z.string().trim().optional().nullable(),
    isComplimentary: z.boolean().default(false),
    notes: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const s = new Date(data.startsAt);
    const e = new Date(data.endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date.", path: ["startsAt"] });
      return;
    }
    if (e <= s) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Check-out must be after check-in.", path: ["endsAt"] });
    }
  });

export type AllocateRoomInput = z.infer<typeof AllocationInput>;

const UpdateInput = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().min(1).optional(),
  guestName: z.string().trim().optional().nullable(),
  isComplimentary: z.boolean().optional(),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateAllocationInput = z.infer<typeof UpdateInput>;

export async function allocateRoom(input: AllocateRoomInput) {
  const user = await requirePermission("ALLOCATE_ROOMS");
  const data = AllocationInput.parse(input);

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);

  return db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { id: data.roomId },
      select: { id: true, number: true },
    });
    if (!room) throw new Error("Room not found");

    const booking = await tx.booking.findUnique({
      where: { id: data.bookingId },
      select: { id: true, status: true, code: true },
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "CANCELLED") {
      throw new Error("Cannot allocate rooms to a cancelled booking");
    }

    const conflict = await tx.roomAllocation.findFirst({
      where: {
        roomId: data.roomId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        booking: { status: { not: "CANCELLED" }, deletedAt: null },
      },
      include: { booking: { select: { code: true } } },
    });
    if (conflict) {
      throw new Error(
        `Room ${room.number} is already allocated to booking ${conflict.booking.code} during this window.`
      );
    }

    const allocation = await tx.roomAllocation.create({
      data: {
        bookingId: data.bookingId,
        roomId: data.roomId,
        startsAt,
        endsAt,
        guestName: data.guestName?.trim() || null,
        isComplimentary: data.isComplimentary,
        notes: data.notes?.trim() || null,
      },
    });

    await logAudit(tx, {
      userId: user.id,
      action: "ALLOCATE_ROOM",
      entity: "RoomAllocation",
      entityId: allocation.id,
      description: `Allocated room ${room.number} to ${booking.code}${data.isComplimentary ? " (complimentary)" : ""}`,
      meta: {
        roomId: data.roomId,
        bookingId: data.bookingId,
        isComplimentary: data.isComplimentary,
      },
    });

    revalidatePath(`/bookings/${data.bookingId}`);
    revalidatePath("/rooms");
    return allocation.id;
  });
}

export async function updateRoomAllocation(input: UpdateAllocationInput) {
  const user = await requirePermission("ALLOCATE_ROOMS");
  const data = UpdateInput.parse(input);

  return db.$transaction(async (tx) => {
    const existing = await tx.roomAllocation.findUnique({
      where: { id: data.id },
      include: {
        room: { select: { number: true } },
        booking: { select: { id: true, status: true, code: true } },
      },
    });
    if (!existing) throw new Error("Allocation not found");
    if (existing.booking.status === "CANCELLED") {
      throw new Error("Cannot edit allocations on a cancelled booking");
    }

    const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
    const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) throw new Error("Check-out must be after check-in.");

    const roomId = data.roomId ?? existing.roomId;

    const conflict = await tx.roomAllocation.findFirst({
      where: {
        id: { not: existing.id },
        roomId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        booking: { status: { not: "CANCELLED" }, deletedAt: null },
      },
      include: { booking: { select: { code: true } }, room: { select: { number: true } } },
    });
    if (conflict) {
      throw new Error(
        `Room ${conflict.room.number} is already allocated to booking ${conflict.booking.code} during this window.`
      );
    }

    const updated = await tx.roomAllocation.update({
      where: { id: existing.id },
      data: {
        roomId,
        startsAt,
        endsAt,
        guestName: data.guestName !== undefined ? data.guestName?.trim() || null : existing.guestName,
        isComplimentary: data.isComplimentary ?? existing.isComplimentary,
        notes: data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
      },
    });

    await logAudit(tx, {
      userId: user.id,
      action: "UPDATE_ROOM_ALLOCATION",
      entity: "RoomAllocation",
      entityId: existing.id,
      description: `Updated allocation of room ${existing.room.number} on ${existing.booking.code}`,
    });

    revalidatePath(`/bookings/${existing.booking.id}`);
    revalidatePath("/rooms");
    return updated.id;
  });
}

export async function releaseRoomAllocation(id: string) {
  const user = await requirePermission("ALLOCATE_ROOMS");

  const existing = await db.roomAllocation.findUnique({
    where: { id },
    include: {
      room: { select: { number: true } },
      booking: { select: { id: true, code: true } },
    },
  });
  if (!existing) throw new Error("Allocation not found");

  await db.$transaction(async (tx) => {
    await tx.roomAllocation.delete({ where: { id } });
    await logAudit(tx, {
      userId: user.id,
      action: "RELEASE_ROOM",
      entity: "RoomAllocation",
      entityId: id,
      description: `Released room ${existing.room.number} from ${existing.booking.code}`,
    });
  });

  revalidatePath(`/bookings/${existing.booking.id}`);
  revalidatePath("/rooms");
}
