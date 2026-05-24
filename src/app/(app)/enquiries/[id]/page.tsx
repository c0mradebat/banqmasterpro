import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ArrowLeft, ArrowRight, FileText, MessageSquare, Pencil } from "lucide-react";
import { formatDate, formatINR } from "@/lib/utils";
import { sumEnquiryInterestEstimate } from "@/lib/enquiry-booking-prefill";
import { EnquiryStatusButtons } from "./status-buttons";
import { DeleteEnquiryButton } from "./delete-enquiry-button";

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  const [e, settings] = await Promise.all([
    db.enquiry.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        createdBy: true,
        convertedBooking: { select: { id: true, status: true, code: true } },
        quotations: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, code: true, total: true, createdAt: true } },
      },
    }),
    db.settings.findUnique({ where: { id: "default" } }),
  ]);
  if (!e) notFound();

  const rawDefaults = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, unknown>;
  const guideTotal = sumEnquiryInterestEstimate(e, rawDefaults);

  const canDeleteEnquiry =
    e.status === "CANCELLED" ||
    e.status === "LOST" ||
    (e.convertedBooking != null && e.convertedBooking.status === "CANCELLED");

  const isLockedConverted = e.status === "CONVERTED" || !!e.convertedBookingId;

  const services = [
    e.hasMarriageHall && "Marriage Hall",
    e.hasDiningHall && "Dining Hall",
    e.hasShahiBhoj && "Shahi Bhoj",
    e.hasLawn && "Lawn",
    e.hasSwimmingPool && "Swimming Pool",
    e.hasPoolRefill && "Pool Refill",
    e.hasPoolParty && "Pool Party",
    e.hasDjHall && "DJ Hall",
    e.hasCocktail && "Cocktail",
    e.hasRooms && "Rooms",
  ].filter(Boolean) as string[];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/enquiries"><ArrowLeft className="h-4 w-4" /> Back to enquiries</Link>
      </Button>
      <PageHeader
        title={`${e.code} · ${e.customer.firstName} ${e.customer.lastName ?? ""}`}
        description={`${e.eventType.replace(/_/g, " ")} · created ${formatDate(e.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isLockedConverted && (
              <>
                <Button asChild variant="secondary">
                  <Link href={`/enquiries/${e.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/quotations/new?fromEnquiry=${e.id}`}>
                    <FileText className="h-4 w-4" />
                    Create quotation
                  </Link>
                </Button>
                <Button asChild variant="gradient">
                  <Link href={`/bookings/new?fromEnquiry=${e.id}`}>
                    Convert to booking <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
            {isLockedConverted && e.convertedBookingId && (
              <Button asChild variant="outline">
                <Link href={`/bookings/${e.convertedBookingId}`}>View booking →</Link>
              </Button>
            )}
            {canDeleteEnquiry && <DeleteEnquiryButton id={e.id} code={e.code} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">{e.customer.firstName} {e.customer.lastName ?? ""}</div>
              <div className="text-muted-foreground">{e.customer.phone}</div>
              {(e.customer.city || e.customer.state) && <div className="text-muted-foreground">{e.customer.city}, {e.customer.state}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Event</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-muted-foreground">Event type</div><div className="font-medium">{e.eventType.replace(/_/g, " ")}</div></div>
              <div><div className="text-muted-foreground">Guests</div><div className="font-medium">{e.guestCount ?? "—"}</div></div>
              <div><div className="text-muted-foreground">Start</div><div className="font-medium">{e.eventStart ? formatDate(e.eventStart, true) : "—"}</div></div>
              <div><div className="text-muted-foreground">End</div><div className="font-medium">{e.eventEnd ? formatDate(e.eventEnd, true) : "—"}</div></div>
            </CardContent>
          </Card>

          {services.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Services interested</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {services.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </CardContent>
            </Card>
          )}

          {e.notes && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Notes</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{e.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guide total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="text-2xl font-semibold tabular-nums">{formatINR(guideTotal)}</div>
              <p className="text-xs text-muted-foreground">
                Sum of default list prices for services they selected (for prioritisation; final quote or booking may differ).
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge>{e.status}</Badge>
              <EnquiryStatusButtons id={e.id} current={e.status} />
            </CardContent>
          </Card>
          {e.quotations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quotations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {e.quotations.map((q) => (
                  <Link
                    key={q.id}
                    href={`/quotations/${q.id}`}
                    className="flex justify-between gap-2 rounded-md border px-2 py-1.5 hover:bg-accent"
                  >
                    <span className="font-mono text-xs">{q.code}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{formatINR(Number(q.total))}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Meta</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <div>Created by <span className="text-foreground">{e.createdBy.name}</span></div>
              <div>Created {formatDate(e.createdAt, true)}</div>
              <div>Updated {formatDate(e.updatedAt, true)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
