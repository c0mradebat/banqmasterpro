"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import { updateEnquiry } from "@/server/enquiries";
import { toast } from "sonner";
import { defaultEndFromStartLocal, parseDatetimeLocalValue } from "@/lib/datetime-local";
import { ArrowLeft, Save } from "lucide-react";

const SERVICE_FLAGS: { key: keyof EnquiryFlags; label: string }[] = [
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

type EnquiryFlags = {
  hasMarriageHall: boolean;
  hasDiningHall: boolean;
  hasShahiBhoj: boolean;
  hasLawn: boolean;
  hasSwimmingPool: boolean;
  hasPoolRefill: boolean;
  hasPoolParty: boolean;
  hasDjHall: boolean;
  hasCocktail: boolean;
  hasRooms: boolean;
};

export type EnquiryEditInitial = {
  id: string;
  code: string;
  customer: { firstName: string; lastName: string; phone: string; city: string; state: string };
  eventType: string;
  eventStart: string;
  eventEnd: string;
  guestCount: number | "";
  notes: string;
} & EnquiryFlags;

export function EnquiryEditForm({ initial }: { initial: EnquiryEditInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [c, setC] = useState(initial.customer);
  const [eventType, setEventType] = useState(initial.eventType);
  const [eventStart, setEventStart] = useState(initial.eventStart);
  const [eventEnd, setEventEnd] = useState(initial.eventEnd);
  const [guestCount, setGuestCount] = useState<number | "">(initial.guestCount);
  const [notes, setNotes] = useState(initial.notes);
  const [flags, setFlags] = useState<EnquiryFlags>({
    hasMarriageHall: initial.hasMarriageHall,
    hasDiningHall: initial.hasDiningHall,
    hasShahiBhoj: initial.hasShahiBhoj,
    hasLawn: initial.hasLawn,
    hasSwimmingPool: initial.hasSwimmingPool,
    hasPoolRefill: initial.hasPoolRefill,
    hasPoolParty: initial.hasPoolParty,
    hasDjHall: initial.hasDjHall,
    hasCocktail: initial.hasCocktail,
    hasRooms: initial.hasRooms,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (eventStart && eventEnd && new Date(eventEnd) <= new Date(eventStart)) {
      toast.error("Tentative end must be after tentative start.");
      return;
    }
    start(async () => {
      try {
        await updateEnquiry({
          id: initial.id,
          ...c,
          eventType,
          eventStart: eventStart || null,
          eventEnd: eventEnd || null,
          guestCount: guestCount === "" ? null : Number(guestCount),
          notes,
          ...flags,
        });
        toast.success("Enquiry updated");
        router.push(`/enquiries/${initial.id}`);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save");
      }
    });
  }

  return (
    <div className="relative max-w-3xl">
      <FormBusyOverlay show={pending} label="Saving…" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/enquiries/${initial.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to {initial.code}
          </Link>
        </Button>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First name *</Label>
              <Input required value={c.firstName} onChange={(e) => setC({ ...c, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={c.lastName} onChange={(e) => setC({ ...c, lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input required value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Guests</Label>
              <Input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={c.state} onChange={(e) => setC({ ...c, state: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Event type</Label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {[
                  "MARRIAGE",
                  "RECEPTION",
                  "ENGAGEMENT",
                  "BIRTHDAY",
                  "ANNIVERSARY",
                  "CORPORATE",
                  "CONFERENCE",
                  "POOL_PARTY",
                  "ROOMS_ONLY",
                  "OTHER",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
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
          <CardHeader>
            <CardTitle>Services interested in</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SERVICE_FLAGS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <Checkbox checked={flags[f.key]} onCheckedChange={(v) => setFlags({ ...flags, [f.key]: !!v })} />
                {f.label}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href={`/enquiries/${initial.id}`}>Cancel</Link>
          </Button>
          <Button type="submit" variant="gradient" size="lg" loading={pending}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
