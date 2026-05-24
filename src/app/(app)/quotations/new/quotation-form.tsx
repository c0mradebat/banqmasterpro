"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import Link from "next/link";
import { createQuotation } from "@/server/quotations";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { QuotationFromEnquiryPrefill } from "@/lib/enquiry-booking-prefill";

type Line = { label: string; qty: number; rate: number };

export function QuotationForm({
  defaults,
  fromEnquiry,
}: {
  defaults: any;
  fromEnquiry?: QuotationFromEnquiryPrefill | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [customerName, setCustomerName] = useState(() => fromEnquiry?.customerName ?? "");
  const [phone, setPhone] = useState(() => fromEnquiry?.phone ?? "");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState(() => fromEnquiry?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(() =>
    fromEnquiry?.lines?.length
      ? fromEnquiry.lines
      : [{ label: "Marriage Hall", qty: 1, rate: Number(defaults?.marriageHallRate ?? 0) }]
  );

  const total = lines.reduce((s, l) => s + l.qty * l.rate, 0);

  return (
    <div className="relative">
      <FormBusyOverlay show={pending} label="Saving quotation…" />
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!customerName) { toast.error("Customer name required"); return; }
        start(async () => {
          const id = await createQuotation({
            customerName,
            phone: phone || null,
            validUntil: validUntil || null,
            notes,
            body: lines,
            total,
            enquiryId: fromEnquiry?.enquiryId,
          });
          toast.success("Quotation saved");
          router.push("/quotations");
        });
      }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {fromEnquiry && (
        <div className="lg:col-span-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <span className="text-muted-foreground">Linked to </span>
          <Link href={`/enquiries/${fromEnquiry.enquiryId}`} className="font-medium text-primary hover:underline">
            {fromEnquiry.enquiryCode}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            — saving attaches this quotation and marks the enquiry as QUOTED.
          </span>
        </div>
      )}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-2"><Label>Valid until</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6 space-y-1"><Label className="text-xs">Item</Label><Input value={l.label} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></div>
                <div className="col-span-2 space-y-1"><Label className="text-xs">Qty</Label><Input type="number" min={1} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} /></div>
                <div className="col-span-3 space-y-1"><Label className="text-xs">Rate</Label><Input type="number" min={0} value={l.rate} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x))} /></div>
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { label: "", qty: 1, rate: 0 }])}>
              <Plus className="h-4 w-4" /> Add line
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, inclusions, exclusions…" /></CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader><CardTitle>Total</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold">{formatINR(total)}</div>
          <Button type="submit" variant="gradient" size="lg" className="w-full" loading={pending}>
            Save quotation
          </Button>
        </CardContent>
      </Card>
    </form>
    </div>
  );
}
