import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ArrowLeft, FileText, Phone, MapPin, Mail } from "lucide-react";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { CancelBookingButton } from "./cancel-booking-button";
import { DeleteCancelledBookingButton } from "./delete-cancelled-booking-button";
import { AllocateRoomDialog } from "./allocate-room-dialog";
import { ReleaseAllocationButton } from "./release-allocation-button";
import { userCan } from "@/lib/auth-guard";

import type { BookingStatus } from "@/generated/prisma/client";

const statusVariant: Record<BookingStatus, "warning" | "success" | "info" | "muted" | "destructive"> = {
  TENTATIVE: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "info",
  COMPLETED: "muted",
  CANCELLED: "destructive",
  REFUNDED: "muted",
};

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const canCancel = await userCan("CANCEL_BOOKINGS");
  const canDelete = await userCan("DELETE_BOOKINGS");
  const [booking, rooms, settings] = await Promise.all([
    db.booking.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        customer: true,
        serviceItems: true,
        payments: {
          where: { deletedAt: null },
          orderBy: { receivedAt: "desc" },
          include: { recordedBy: true },
        },
        cateringVendor: true,
        decorationVendor: true,
        eventMgmtVendor: true,
        createdBy: true,
        roomAllocations: {
          orderBy: { startsAt: "asc" },
          include: { room: true },
        },
        enquiry: {
          select: {
            id: true,
            code: true,
            status: true,
            _count: { select: { quotations: true } },
          },
        },
      },
    }),
    db.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] }),
    db.settings.findUnique({ where: { id: "default" }, select: { freeRoomsPerBooking: true } }),
  ]);
  if (!booking) notFound();

  const complimentaryUsed = booking.roomAllocations.filter((a) => a.isComplimentary).length;
  const complimentaryAllowed = settings?.freeRoomsPerBooking ?? 0;

  const electricityCharge = Number(booking.electricityUnits) * Number(booking.electricityRate);
  const generatorCharge = Number(booking.generatorHours) * Number(booking.generatorRate);
  const mattressCharge = booking.addonMattresses * Number(booking.addonMattressRate);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/bookings"><ArrowLeft className="h-4 w-4" /> Back to bookings</Link>
      </Button>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {booking.code}
            <Badge variant={statusVariant[booking.status]}>
              {booking.status.replace("_", " ")}
            </Badge>
          </span>
        }
        description={`${booking.customer.firstName} ${booking.customer.lastName ?? ""} · ${booking.eventType.replace(/_/g, " ")}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/bookings/${booking.id}/print`} target="_blank">
                <FileText className="h-4 w-4" /> Print receipt
              </Link>
            </Button>
            {booking.status !== "CANCELLED" && canCancel && <CancelBookingButton id={booking.id} />}
            {booking.status === "CANCELLED" && canDelete && (
              <DeleteCancelledBookingButton
                bookingId={booking.id}
                linkedEnquiry={
                  booking.enquiry
                    ? {
                        id: booking.enquiry.id,
                        code: booking.enquiry.code,
                        quotationCount: booking.enquiry._count.quotations,
                      }
                    : null
                }
              />
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Info label="Start" value={formatDate(booking.eventStart, true)} />
              <Info label="End" value={formatDate(booking.eventEnd, true)} />
              <Info label="Guests" value={booking.guestCount?.toString() ?? "—"} />
              <Info label="Booked on" value={formatDate(booking.bookingDate)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.serviceItems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.label || s.kind.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.startsAt ? `${formatDate(s.startsAt, true)} → ${formatDate(s.endsAt, true)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{s.quantity}</TableCell>
                      <TableCell className="text-right">{formatINR(Number(s.unitPrice))}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(Number(s.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <RecordPaymentDialog bookingId={booking.id} balanceDue={Number(booking.balanceDue)} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Recorded by</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.receivedAt, true)}</TableCell>
                      <TableCell>
                        <Badge variant={p.kind === "REFUND" ? "destructive" : "secondary"}>
                          {p.kind.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.method.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs">{p.reference || "—"}</TableCell>
                      <TableCell className="text-xs">{p.recordedBy.name}</TableCell>
                      <TableCell className={`text-right font-medium ${p.kind === "REFUND" ? "text-rose-600" : ""}`}>
                        {p.kind === "REFUND" ? "− " : "+ "}{formatINR(Number(p.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {booking.payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No payments yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Room allocations</CardTitle>
                <CardDescription className="mt-1">
                  {booking.roomAllocations.length === 0
                    ? "No rooms assigned yet."
                    : `${booking.roomAllocations.length} ${booking.roomAllocations.length === 1 ? "room" : "rooms"} assigned · ${complimentaryUsed} complimentary${complimentaryAllowed > 0 ? ` / ${complimentaryAllowed} allowed` : ""}`}
                </CardDescription>
              </div>
              {booking.status !== "CANCELLED" && (
                <AllocateRoomDialog
                  bookingId={booking.id}
                  rooms={rooms.map((r) => ({
                    id: r.id,
                    number: r.number,
                    type: r.type,
                    status: r.status,
                    floor: r.floor,
                  }))}
                  defaultStart={booking.eventStart}
                  defaultEnd={booking.eventEnd}
                />
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right w-[1%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {booking.roomAllocations.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.room.number}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {a.room.type.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{a.guestName || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(a.startsAt, true)} → {formatDate(a.endsAt, true)}
                      </TableCell>
                      <TableCell>
                        {a.isComplimentary && (
                          <Badge variant="secondary">Complimentary</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status !== "CANCELLED" && (
                          <ReleaseAllocationButton id={a.id} roomNumber={a.room.number} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {booking.roomAllocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No rooms allocated to this booking yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {booking.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{booking.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-semibold text-base">
                {booking.customer.firstName} {booking.customer.lastName ?? ""}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {booking.customer.phone}
              </div>
              {booking.customer.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {booking.customer.email}
                </div>
              )}
              {(booking.customer.city || booking.customer.state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {booking.customer.city}, {booking.customer.state}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatINR(Number(booking.subtotal))} />
              {Number(booking.discount) > 0 && (
                <Row label="Discount" value={`− ${formatINR(Number(booking.discount))}`} className="text-emerald-600" />
              )}
              {Number(booking.miscCharges) > 0 && <Row label="Misc" value={formatINR(Number(booking.miscCharges))} />}
              {electricityCharge > 0 && <Row label={`Electricity (${booking.electricityUnits} × ₹${booking.electricityRate})`} value={formatINR(electricityCharge)} />}
              {generatorCharge > 0 && <Row label={`Generator (${booking.generatorHours}h)`} value={formatINR(generatorCharge)} />}
              {mattressCharge > 0 && <Row label={`Mattresses (${booking.addonMattresses})`} value={formatINR(mattressCharge)} />}
              <div className="h-px bg-border my-1" />
              <Row label="Total" value={formatINR(Number(booking.totalAmount))} bold />
              {Number(booking.securityDeposit) > 0 && (
                <Row label="Security deposit" value={formatINR(Number(booking.securityDeposit))} />
              )}
              <div className="h-px bg-border my-1" />
              <Row label="Paid" value={formatINR(Number(booking.paidAmount))} className="text-emerald-600" />
              {Number(booking.refundAmount) > 0 && (
                <Row label="Refunded" value={formatINR(Number(booking.refundAmount))} className="text-rose-600" />
              )}
              <Row
                label="Balance"
                value={formatINR(Number(booking.balanceDue))}
                bold
                className={Number(booking.balanceDue) > 0 ? "text-amber-600" : Number(booking.balanceDue) < 0 ? "text-rose-600" : "text-emerald-600"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {booking.cateringVendor && <VendorRow label="Catering" v={booking.cateringVendor} />}
              {booking.decorationVendor && <VendorRow label="Decoration" v={booking.decorationVendor} />}
              {booking.eventMgmtVendor && <VendorRow label="Event Mgmt" v={booking.eventMgmtVendor} />}
              {!booking.cateringVendor && !booking.decorationVendor && !booking.eventMgmtVendor && (
                <div className="text-muted-foreground">No vendors assigned</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <div>Created by <span className="text-foreground font-medium">{booking.createdBy.name}</span></div>
              <div>Created {formatDate(booking.createdAt, true)}</div>
              <div>Updated {formatDate(booking.updatedAt, true)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
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
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function VendorRow({ label, v }: { label: string; v: { name: string; phone: string | null } }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{v.name}</div>
      {v.phone && <div className="text-xs text-muted-foreground">{v.phone}</div>}
    </div>
  );
}
