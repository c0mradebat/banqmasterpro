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
import { deleteQuotation } from "@/server/quotations";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteQuotationButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {code}?</DialogTitle>
          <DialogDescription>
            Permanently removes this quotation. Only available when the enquiry is lost/cancelled or the linked booking
            is cancelled.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  await deleteQuotation(id);
                  toast.success("Quotation deleted");
                  setOpen(false);
                  router.push("/quotations");
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
