"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import { createBooking } from "@/server/bookings";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { getDefaultAvailabilityWindowLocal, type BookingFromEnquiryPrefill } from "@/lib/enquiry-booking-prefill";
import {
  adjustEndWhenStartChangesLocal,
  defaultEndFromStartLocal,
  parseDatetimeLocalValue,
} from "@/lib/datetime-local";

type ServiceKind =
  | "MARRIAGE_HALL"
  | "DINING_HALL"
  | "SHAHI_BHOJ"
  | "LAWN"
  | "SWIMMING_POOL"
  | "POOL_REFILL"
  | "POOL_PARTY"
  | "DJ_HALL"
  | "COCKTAIL_PARTY"
  | "ROOM_NON_BALCONY"
  | "ROOM_BALCONY"
  | "ROOM_DORMITORY"
  | "ROOM_SUITE"
  | "COMPLIMENTARY_ROOM";

type ServiceItem = {
  kind: ServiceKind;
  startsAt: string;
  endsAt: string;
  quantity: number;
  unitPrice: number;
  label?: string;
};

const SERVICE_OPTIONS: { kind: ServiceKind; label: string; rateField: string; group: string }[] = [
  { kind: "MARRIAGE_HALL", label: "Marriage Hall", rateField: "marriageHallRate", group: "Halls" },
  { kind: "DINING_HALL", label: "Dining Hall", rateField: "diningHallRate", group: "Halls" },
  { kind: "SHAHI_BHOJ", label: "Shahi Bhoj", rateField: "shahiBhojRate", group: "Halls" },
  { kind: "LAWN", label: "Lawn", rateField: "lawnRate", group: "Outdoor" },
  { kind: "SWIMMING_POOL", label: "Swimming Pool", rateField: "swimmingPoolRate", group: "Outdoor" },
  { kind: "POOL_REFILL", label: "Pool Refill", rateField: "poolRefillRate", group: "Outdoor" },
  { kind: "POOL_PARTY", label: "Pool Party (₹8000 fee)", rateField: "poolPartyFee", group: "Outdoor" },
  { kind: "DJ_HALL", label: "DJ Hall", rateField: "djHallRate", group: "Add-ons" },
  { kind: "COCKTAIL_PARTY", label: "Cocktail Party", rateField: "cocktailRate", group: "Add-ons" },
  { kind: "ROOM_NON_BALCONY", label: "Non-Balcony Rooms", rateField: "nonBalconyRoomRate", group: "Rooms" },
  { kind: "ROOM_BALCONY", label: "Balcony Rooms", rateField: "balconyRoomRate", group: "Rooms" },
  { kind: "ROOM_SUITE", label: "Suite Rooms", rateField: "suiteRoomRate", group: "Rooms" },
  { kind: "ROOM_DORMITORY", label: "Dormitory Rooms", rateField: "dormitoryRoomRate", group: "Rooms" },
  { kind: "COMPLIMENTARY_ROOM", label: "Complimentary Rooms", rateField: "", group: "Rooms" },
];

export function BookingForm({
  defaults,
  vendors,
  fromEnquiry,
}: {
  defaults: any;
  vendors: { id: string; name: string; kind: string }[];
  fromEnquiry?: BookingFromEnquiryPrefill | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [eventStart, setEventStart] = useState(
    () => fromEnquiry?.eventStart ?? getDefaultAvailabilityWindowLocal().start
  );
  const [eventEnd, setEventEnd] = useState(
    () => fromEnquiry?.eventEnd ?? getDefaultAvailabilityWindowLocal().end
  );
  const [services, setServices] = useState<ServiceItem[]>(() =>
    (fromEnquiry?.serviceItems ?? []).map((s) => ({
      kind: s.kind as ServiceKind,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      label: s.label,
    }))
  );
  const [customer, setCustomer] = useState(() =>
    fromEnquiry
      ? {
          firstName: fromEnquiry.customer.firstName,
          lastName: fromEnquiry.customer.lastName ?? "",
          phone: fromEnquiry.customer.phone,
          city: fromEnquiry.customer.city ?? "",
          state: fromEnquiry.customer.state ?? "",
        }
      : { firstName: "", lastName: "", phone: "", city: "", state: "" }
  );
  const [eventType, setEventType] = useState(() => fromEnquiry?.eventType ?? "MARRIAGE");
  const [guestCount, setGuestCount] = useState<number | "">(() =>
    typeof fromEnquiry?.guestCount === "number" ? fromEnquiry.guestCount : ""
  );
  const [vendorIds, setVendorIds] = useState({ catering: "", decoration: "", eventMgmt: "" });
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [miscCharges, setMiscCharges] = useState(0);
  const [miscReason, setMiscReason] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [addonMattresses, setAddonMattresses] = useState(0);
  const [initialPayment, setInitialPayment] = useState(0);
  const [initialMethod, setInitialMethod] = useState("UPI");
  const [notes, setNotes] = useState(() => fromEnquiry?.notes ?? "");
  const [poolRefillNeeded, setPoolRefillNeeded] = useState(
    () => fromEnquiry?.serviceItems?.some((s) => s.kind === "POOL_REFILL") ?? false
  );

  const subtotal = useMemo(
    () => services.reduce((s, x) => s + (x.unitPrice || 0) * (x.quantity || 1), 0),
    [services]
  );
  const mattressCharge = addonMattresses * Number(defaults?.addonMattressRate || 0);
  const total = Math.max(0, subtotal - discount + miscCharges + mattressCharge);

  function addService(kind: ServiceKind) {
    const opt = SERVICE_OPTIONS.find((o) => o.kind === kind)!;
    if (services.some((s) => s.kind === kind)) return;
    const rate = opt.rateField ? Number(defaults?.[opt.rateField] || 0) : 0;
    setServices((prev) => [
      ...prev,
      {
        kind,
        startsAt: eventStart,
        endsAt: eventEnd,
        quantity: kind.startsWith("ROOM_") || kind === "COMPLIMENTARY_ROOM" ? 1 : 1,
        unitPrice: rate,
        label: opt.label,
      },
    ]);
  }

  function removeService(kind: ServiceKind) {
    setServices((prev) => prev.filter((s) => s.kind !== kind));
  }

  function updateService(kind: ServiceKind, patch: Partial<ServiceItem>) {
    setServices((prev) => prev.map((s) => (s.kind === kind ? { ...s, ...patch } : s)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer.firstName || !customer.phone) {
      toast.error("Customer name and phone are required.");
      return;
    }
    if (services.length === 0) {
      toast.error("Add at least one service.");
      return;
    }
    if (!eventStart || !eventEnd) {
      toast.error("Event start and end are required.");
      return;
    }
    if (new Date(eventEnd) <= new Date(eventStart)) {
      toast.error("Event end must be after event start.");
      return;
    }
    for (const s of services) {
      if (s.startsAt && s.endsAt && new Date(s.endsAt) <= new Date(s.startsAt)) {
        const label = SERVICE_OPTIONS.find((o) => o.kind === s.kind)?.label ?? s.kind;
        toast.error(`For ${label}, end time must be after start time.`);
        return;
      }
    }
    if (poolRefillNeeded && !services.some((s) => s.kind === "POOL_REFILL")) {
      addService("POOL_REFILL");
    }
    startTransition(async () => {
      try {
        const id = await createBooking({
          ...customer,
          eventType,
          eventStart,
          eventEnd,
          guestCount: guestCount === "" ? null : Number(guestCount),
          cateringVendorId: vendorIds.catering || null,
          decorationVendorId: vendorIds.decoration || null,
          eventMgmtVendorId: vendorIds.eventMgmt || null,
          discount,
          discountReason,
          miscCharges,
          miscReason,
          electricityRate: Number(defaults?.electricityRatePerUnit || 0),
          generatorRate: Number(defaults?.generatorRatePerHour || 0),
          addonMattresses,
          addonMattressRate: Number(defaults?.addonMattressRate || 0),
          securityDeposit,
          notes,
          initialPayment,
          initialPaymentMethod: initialMethod,
          serviceItems: services,
          enquiryId: fromEnquiry?.enquiryId,
        });
        toast.success("Booking created!");
        router.push(`/bookings/${id}`);
      } catch (err: any) {
        toast.error(err?.message || "Failed to create booking");
      }
    });
  }

  const addedKinds = new Set(services.map((s) => s.kind));
  const groups = ["Halls", "Outdoor", "Add-ons", "Rooms"];

  return (
    <form onSubmit={onSubmit} className="relative grid grid-cols-1 gap-6 lg:grid-cols-3">
      <FormBusyOverlay show={pending} label="Creating booking…" />
      {fromEnquiry && (
        <div className="lg:col-span-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <span className="text-muted-foreground">Converting </span>
          <Link href={`/enquiries/${fromEnquiry.enquiryId}`} className="font-medium text-primary hover:underline">
            {fromEnquiry.enquiryCode}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            — customer, event window, notes, and services below are prefilled. Keep the same phone as the enquiry so the
            link succeeds.
          </span>
        </div>
      )}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>If phone matches an existing customer, their record will be updated.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First name *</Label>
              <Input value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Guests</Label>
              <Input type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
            <CardDescription>
              Overall event window. Changing event start sets end to the next day at 5:00 PM; you can edit end for
              shorter slots. Each service below can have its own start/end.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event type</Label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="MARRIAGE">Marriage</option>
                <option value="RECEPTION">Reception</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="BIRTHDAY">Birthday</option>
                <option value="ANNIVERSARY">Anniversary</option>
                <option value="CORPORATE">Corporate</option>
                <option value="CONFERENCE">Conference</option>
                <option value="POOL_PARTY">Pool Party</option>
                <option value="ROOMS_ONLY">Rooms only</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Event start</Label>
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
            <div className="space-y-2 sm:col-span-1">
              <Label>Event end</Label>
              <Input
                type="datetime-local"
                value={eventEnd}
                onChange={(e) => setEventEnd(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Services</CardTitle>
              <CardDescription>Pick the services for this booking. Each gets its own timing & rate.</CardDescription>
            </div>
            <Badge variant="info">{services.length} added</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            {groups.map((group) => (
              <div key={group}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group}</div>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.filter((o) => o.group === group).map((opt) => {
                    const active = addedKinds.has(opt.kind);
                    return (
                      <button
                        key={opt.kind}
                        type="button"
                        onClick={() => (active ? removeService(opt.kind) : addService(opt.kind))}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 hover:bg-accent"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {services.length > 0 && <div className="border-t pt-5 space-y-4">
              {services.map((s) => (
                <div key={s.kind} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{SERVICE_OPTIONS.find((o) => o.kind === s.kind)?.label}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeService(s.kind)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="datetime-local"
                        value={s.startsAt}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateService(s.kind, { startsAt: v, endsAt: adjustEndWhenStartChangesLocal(v, s.endsAt) });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="datetime-local"
                        value={s.endsAt}
                        onChange={(e) =>
                          updateService(s.kind, { endsAt: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={s.quantity} onChange={(e) => updateService(s.kind, { quantity: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Rate (₹ / unit)</Label>
                      <Input type="number" min={0} value={s.unitPrice} onChange={(e) => updateService(s.kind, { unitPrice: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="text-xs text-right text-muted-foreground">
                    Subtotal: <span className="font-semibold text-foreground">{formatINR(s.unitPrice * s.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>}

            {services.some((s) => s.kind === "SWIMMING_POOL") && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={poolRefillNeeded} onCheckedChange={(v) => setPoolRefillNeeded(!!v)} />
                Include pool refill charges
              </label>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
            <CardDescription>Optional — assign caterer, decorator and event manager.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["catering", "decoration", "eventMgmt"] as const).map((slot) => {
              const kindFilter = slot === "catering" ? "CATERER" : slot === "decoration" ? "DECORATOR" : "EVENT_MANAGER";
              return (
                <div key={slot} className="space-y-2">
                  <Label className="capitalize">{slot.replace(/([A-Z])/g, " $1")}</Label>
                  <select
                    value={vendorIds[slot]}
                    onChange={(e) => setVendorIds({ ...vendorIds, [slot]: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">— None —</option>
                    {vendors.filter((v) => v.kind === kindFilter).map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount (₹)</Label>
              <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Discount reason</Label>
              <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Repeat customer, festive offer, …" />
            </div>
            <div className="space-y-2">
              <Label>Misc charges (₹)</Label>
              <Input type="number" min={0} value={miscCharges} onChange={(e) => setMiscCharges(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Misc reason</Label>
              <Input value={miscReason} onChange={(e) => setMiscReason(e.target.value)} placeholder="Missing towels, damages, …" />
            </div>
            <div className="space-y-2">
              <Label>Add-on mattresses (×{formatINR(Number(defaults?.addonMattressRate || 0))} each)</Label>
              <Input type="number" min={0} value={addonMattresses} onChange={(e) => setAddonMattresses(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Security deposit (₹)</Label>
              <Input type="number" min={0} value={securityDeposit} onChange={(e) => setSecurityDeposit(Number(e.target.value))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Internal notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special arrangements, contacts, etc." />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Subtotal" value={formatINR(subtotal)} />
            {discount > 0 && <Row label="Discount" value={`− ${formatINR(discount)}`} className="text-emerald-600" />}
            {miscCharges > 0 && <Row label="Misc charges" value={`+ ${formatINR(miscCharges)}`} />}
            {addonMattresses > 0 && <Row label={`Mattresses (${addonMattresses})`} value={`+ ${formatINR(mattressCharge)}`} />}
            <div className="h-px bg-border my-1" />
            <Row label="Total" value={formatINR(total)} bold />
            {securityDeposit > 0 && <Row label="Security deposit" value={`+ ${formatINR(securityDeposit)}`} className="text-muted-foreground" />}
            <div className="h-px bg-border my-1" />
            <Row label="Payable now" value={formatINR(total + Number(securityDeposit))} bold />

            <div className="pt-3 space-y-2">
              <Label>Initial payment (₹)</Label>
              <Input type="number" min={0} value={initialPayment} onChange={(e) => setInitialPayment(Number(e.target.value))} />
              <select
                value={initialMethod}
                onChange={(e) => setInitialMethod(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <Button type="submit" loading={pending} className="w-full" variant="gradient" size="lg">
              <Sparkles className="h-4 w-4" />
              Create booking
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  bold,
  className = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base" : ""} ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
