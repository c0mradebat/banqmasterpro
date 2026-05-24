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
import { releaseRoomAllocation } from "@/server/room-allocations";
import { toast } from "sonner";
import { X } from "lucide-react";

export function ReleaseAllocationButton({
  id,
  roomNumber,
}: {
  id: string;
  roomNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Release room">
          <X className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release room {roomNumber}?</DialogTitle>
          <DialogDescription>
            The room becomes available for other allocations during this window. This action is logged.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Keep allocation
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  await releaseRoomAllocation(id);
                  toast.success("Room released");
                  setOpen(false);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Couldn't release room";
                  toast.error(msg);
                }
              })
            }
          >
            Release
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
