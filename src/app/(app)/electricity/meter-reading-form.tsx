"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import { recordMeterReading } from "@/server/electricity";
import { toast } from "sonner";

export function MeterReadingForm({ activeBookings }: { activeBookings: { id: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const [reading, setReading] = useState<number | "">("");
  const [bookingId, setBookingId] = useState("");
  const [kind, setKind] = useState("MAIN");

  return (
    <form
      className="relative space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (reading === "") { toast.error("Enter reading"); return; }
        start(async () => {
          await recordMeterReading({ reading: Number(reading), bookingId: bookingId || null, kind });
          toast.success("Reading saved");
          setReading("");
        });
      }}
    >
      <FormBusyOverlay show={pending} label="Saving reading…" />
      <div className="space-y-2">
        <Label>Reading</Label>
        <Input type="number" step="0.01" value={reading} onChange={(e) => setReading(e.target.value === "" ? "" : Number(e.target.value))} />
      </div>
      <div className="space-y-2">
        <Label>Meter</Label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          <option value="MAIN">Main</option>
          <option value="GENERATOR">Generator</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Booking (optional)</Label>
        <select value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          <option value="">— Standalone reading —</option>
          {activeBookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
      </div>
      <Button type="submit" variant="gradient" className="w-full" loading={pending}>
        Save reading
      </Button>
    </form>
  );
}
