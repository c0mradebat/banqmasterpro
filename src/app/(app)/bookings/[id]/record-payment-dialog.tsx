"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordPayment } from "@/server/payments";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/utils";

export function RecordPaymentDialog({ bookingId, balanceDue }: { bookingId: string; balanceDue: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(balanceDue > 0 ? balanceDue : 0);
  const [kind, setKind] = useState<"ADVANCE" | "PARTIAL" | "FINAL" | "SECURITY_DEPOSIT" | "REFUND" | "ADJUSTMENT">("PARTIAL");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "OTHER">("UPI");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    start(async () => {
      try {
        await recordPayment({ bookingId, amount, kind, method, reference, notes });
        toast.success(`${kind === "REFUND" ? "Refund" : "Payment"} of ${formatINR(amount)} recorded`);
        setOpen(false);
      } catch (e: any) {
        toast.error(e?.message || "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="gradient"><Plus className="h-4 w-4" /> Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Outstanding balance: <span className={balanceDue > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>{formatINR(balanceDue)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Kind</Label>
              <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="ADVANCE">Advance</option>
                <option value="PARTIAL">Partial</option>
                <option value="FINAL">Final</option>
                <option value="SECURITY_DEPOSIT">Security deposit</option>
                <option value="REFUND">Refund</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value as any)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID / cheque #" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={pending} variant="gradient">
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
