"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { deleteCancelledBooking } from "@/server/bookings";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteCancelledBookingButton({
  bookingId,
  linkedEnquiry,
}: {
  bookingId: string;
  linkedEnquiry: { id: string; code: string; quotationCount: number } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purge, setPurge] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPurge(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete cancelled booking?</DialogTitle>
          <DialogDescription className="space-y-2 text-left">
            <span>
              This permanently removes this booking and its payments and line items from the database. This cannot be
              undone.
            </span>
            {linkedEnquiry && (
              <span className="block">
                A linked enquiry exists ({linkedEnquiry.code}, {linkedEnquiry.quotationCount} quotation
                {linkedEnquiry.quotationCount === 1 ? "" : "s"}). Choose whether to keep that lead or remove it too.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        {linkedEnquiry && (
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox checked={purge} onCheckedChange={(v) => setPurge(!!v)} className="mt-0.5" />
            <span>
              Also delete enquiry <span className="font-mono">{linkedEnquiry.code}</span> and all of its quotations
            </span>
          </label>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  await deleteCancelledBooking(bookingId, purge);
                  toast.success("Booking deleted");
                  setOpen(false);
                  router.push("/bookings");
                  router.refresh();
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                }
              })
            }
          >
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
