"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import { createEnquiry } from "@/server/enquiries";
import { toast } from "sonner";
import { getDefaultAvailabilityWindowLocal } from "@/lib/enquiry-booking-prefill";
import { defaultEndFromStartLocal, parseDatetimeLocalValue } from "@/lib/datetime-local";

const SERVICE_FLAGS: { key: keyof typeof initialFlags; label: string }[] = [
  { key: "hasMarriageHall", label: "Marriage Hall" },
  { key: "hasDiningHall", label: "Dining Hall" },
  { key: "hasShahiBhoj", label: "Shahi Bhoj" },
  { key: "hasLawn", label: "Lawn" },
  { key: "hasSwimmingPool", label: "Swimming Pool" },
  { key: "hasPoolRefill", label: "Pool Refill" },
  { key: "hasPoolParty", label: "Pool Party" },
  { key: "hasDjHall", label: "DJ Hall" },
  { key: "hasCocktail", label: "Cocktail" },
  { key: "hasRooms", label: "Rooms" },
];
const initialFlags = {
  hasMarriageHall: false, hasDiningHall: false, hasShahiBhoj: false,
  hasLawn: false, hasSwimmingPool: false, hasPoolRefill: false,
  hasPoolParty: false, hasDjHall: false, hasCocktail: false, hasRooms: false,
};

export function EnquiryForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [c, setC] = useState({ firstName: "", lastName: "", phone: "", city: "", state: "" });
  const [eventType, setEventType] = useState("MARRIAGE");
  const [eventStart, setEventStart] = useState(() => getDefaultAvailabilityWindowLocal().start);
  const [eventEnd, setEventEnd] = useState(() => getDefaultAvailabilityWindowLocal().end);
  const [guestCount, setGuestCount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [flags, setFlags] = useState(initialFlags);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (eventStart && eventEnd && new Date(eventEnd) <= new Date(eventStart)) {
      toast.error("Tentative end must be after tentative start.");
      return;
    }
    start(async () => {
      try {
        const id = await createEnquiry({
          ...c,
          eventType,
          eventStart: eventStart || null,
          eventEnd: eventEnd || null,
          guestCount: guestCount === "" ? null : Number(guestCount),
          notes,
          ...flags,
        });
        toast.success("Enquiry recorded", {
          duration: 12_000,
          action: {
            label: "Create quotation",
            onClick: () => router.push(`/quotations/new?fromEnquiry=${id}`),
          },
        });
        router.push(`/enquiries/${id}`);
      } catch (err: any) { toast.error(err?.message || "Failed"); }
    });
  }

  return (
    <div className="relative max-w-3xl">
      <FormBusyOverlay show={pending} label="Saving enquiry…" />
      <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>First name *</Label><Input required value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} /></div>
          <div className="space-y-2"><Label>Last name</Label><Input value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} /></div>
          <div className="space-y-2"><Label>Phone *</Label><Input required value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Guests</Label><Input type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value === "" ? "" : Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>City</Label><Input value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} /></div>
          <div className="space-y-2"><Label>State</Label><Input value={c.state} onChange={(e) => setC({ ...c, state: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Event details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Event type</Label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {["MARRIAGE","RECEPTION","ENGAGEMENT","BIRTHDAY","ANNIVERSARY","CORPORATE","CONFERENCE","POOL_PARTY","OTHER"].map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tentative start</Label>
            <Input
              type="datetime-local"
              value={eventStart}
              onChange={(e) => {
                const v = e.target.value;
                setEventStart(v);
                if (!v) return;
                const d = parseDatetimeLocalValue(v);
                if (!Number.isNaN(d.getTime())) setEventEnd(defaultEndFromStartLocal(v));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Tentative end</Label>
            <Input
              type="datetime-local"
              value={eventEnd}
              onChange={(e) => setEventEnd(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Services interested in</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SERVICE_FLAGS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={flags[f.key]} onCheckedChange={(v) => setFlags({ ...flags, [f.key]: !!v })} />
              {f.label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything specific they mentioned…" /></CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="gradient" size="lg" loading={pending}>
          Save enquiry
        </Button>
      </div>
    </form>
    </div>
  );
}
