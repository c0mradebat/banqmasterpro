"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

type Props = {
  phone: string | null;
  /** Smaller layout for table rows */
  compact?: boolean;
};

/** Placeholder for WhatsApp / SMS — wire integration later. */
export function QuotationSendButton({ phone, compact }: Props) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={compact ? "h-8 px-2 gap-1" : undefined}
      title={phone ? `Will send to ${phone}` : "Add a phone number on the quotation"}
      onClick={() =>
        toast.info(
          phone
            ? `Sending to ${phone} will be available soon (SMS / WhatsApp).`
            : "Add a phone number on this quotation to send it later."
        )
      }
    >
      <Send className="h-3.5 w-3.5" />
      {!compact && <span>Send to number</span>}
      {compact && <span className="hidden sm:inline">Send</span>}
    </Button>
  );
}
