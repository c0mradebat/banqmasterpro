"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { allocateRoom } from "@/server/room-allocations";
import { toast } from "sonner";
import { BedDouble, Plus } from "lucide-react";
import {
  toDatetimeLocalValue,
  adjustEndWhenStartChangesLocal,
} from "@/lib/datetime-local";
import type { RoomStatus, RoomType } from "@/generated/prisma/client";

export type RoomOption = {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
};

export function AllocateRoomDialog({
  bookingId,
  rooms,
  defaultStart,
  defaultEnd,
}: {
  bookingId: string;
  rooms: RoomOption[];
  defaultStart: Date;
  defaultEnd: Date;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const initial = () => ({
    roomId: rooms[0]?.id ?? "",
    startsAt: toDatetimeLocalValue(defaultStart),
    endsAt: toDatetimeLocalValue(defaultEnd),
    guestName: "",
    isComplimentary: false,
    notes: "",
  });
  const [form, setForm] = useState(initial);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setForm(initial());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm" disabled={rooms.length === 0}>
          <Plus className="h-4 w-4" /> Allocate room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate room</DialogTitle>
          <DialogDescription>
            Assign a room to this booking for a specific window. Conflicts with other live bookings are blocked.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 col-span-2">
            <Label>Room</Label>
            <select
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} · {r.type.replace(/_/g, " ")} · Floor {r.floor} · {r.status}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Room status here is the housekeeping state — allocations are a separate, time-bound assignment.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Check-in</Label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => {
                const startsAt = e.target.value;
                setForm((f) => ({
                  ...f,
                  startsAt,
                  endsAt: adjustEndWhenStartChangesLocal(startsAt, f.endsAt),
                }));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Check-out</Label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              min={form.startsAt}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Guest name</Label>
            <Input
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              placeholder="Optional — who is staying in this room"
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox
              id="comp"
              checked={form.isComplimentary}
              onCheckedChange={(v) => setForm({ ...form, isComplimentary: Boolean(v) })}
            />
            <Label htmlFor="comp" className="cursor-pointer font-normal">
              Complimentary (don't bill this room)
            </Label>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. extra mattress, early check-in"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            loading={pending}
            onClick={() =>
              start(async () => {
                if (!form.roomId) {
                  toast.error("Pick a room");
                  return;
                }
                const startDate = new Date(form.startsAt);
                const endDate = new Date(form.endsAt);
                if (
                  Number.isNaN(startDate.getTime()) ||
                  Number.isNaN(endDate.getTime()) ||
                  endDate <= startDate
                ) {
                  toast.error("Check-out must be after check-in");
                  return;
                }
                try {
                  await allocateRoom({
                    bookingId,
                    roomId: form.roomId,
                    startsAt: startDate.toISOString(),
                    endsAt: endDate.toISOString(),
                    guestName: form.guestName || null,
                    isComplimentary: form.isComplimentary,
                    notes: form.notes || null,
                  });
                  toast.success("Room allocated");
                  setOpen(false);
                  setForm(initial());
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Couldn't allocate room";
                  toast.error(msg);
                }
              })
            }
          >
            <BedDouble className="h-4 w-4" /> Allocate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
