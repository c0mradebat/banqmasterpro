"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setEnquiryStatus } from "@/server/enquiries";
import { toast } from "sonner";
import type { EnquiryStatus } from "@/generated/prisma/browser";

const STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "QUOTED", "CONVERTED", "LOST", "CANCELLED"];

export function EnquiryStatusButtons({ id, current }: { id: string; current: EnquiryStatus }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-1.5">
      {pending && (
        <p className="text-xs text-muted-foreground" role="status">
          Updating status…
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
      {STATUSES.filter((s) => s !== current).map((s) => (
        <Button
          key={s}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setEnquiryStatus(id, s);
              toast.success(`Marked as ${s}`);
            })
          }
        >
          {s}
        </Button>
      ))}
      </div>
    </div>
  );
}
