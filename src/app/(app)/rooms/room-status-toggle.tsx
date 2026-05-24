"use client";

import { useTransition } from "react";
import { setRoomStatus } from "@/server/rooms";
import { toast } from "sonner";
import type { RoomStatus } from "@/generated/prisma/browser";

const STATUSES: RoomStatus[] = ["AVAILABLE", "OCCUPIED", "DIRTY", "MAINTENANCE", "RESERVED"];

export function RoomStatusToggle({ id, current }: { id: string; current: RoomStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      disabled={pending}
      defaultValue={current}
      onChange={(e) =>
        start(async () => {
          await setRoomStatus(id, e.target.value as RoomStatus);
          toast.success("Room updated");
        })
      }
      className="text-xs h-7 px-2 rounded border bg-background/80 disabled:cursor-wait disabled:opacity-60"
      aria-busy={pending}
      title={pending ? "Updating…" : undefined}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
