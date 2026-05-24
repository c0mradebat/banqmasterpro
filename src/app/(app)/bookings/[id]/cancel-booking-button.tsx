"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cancelBooking } from "@/server/bookings";
import { toast } from "sonner";
import { X } from "lucide-react";

export function CancelBookingButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm"><X className="h-4 w-4" /> Cancel</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel booking?</DialogTitle>
          <DialogDescription>This marks the booking cancelled. Refunds (if any) are recorded separately.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Keep booking</Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              start(async () => {
                await cancelBooking(id, reason);
                toast.success("Booking cancelled");
                setOpen(false);
              })
            }
          >
            Confirm cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
