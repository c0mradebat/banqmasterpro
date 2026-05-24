import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatINR } from "@/lib/utils";
import { Plus, FileText, CalendarPlus, Pencil } from "lucide-react";
import type { EnquiryStatus } from "@/generated/prisma/client";
import { sumEnquiryInterestEstimate } from "@/lib/enquiry-booking-prefill";

const statusVariant: Record<EnquiryStatus, "default" | "info" | "warning" | "success" | "muted" | "destructive"> = {
  NEW: "info",
  CONTACTED: "warning",
  QUOTED: "warning",
  CONVERTED: "success",
  LOST: "muted",
  CANCELLED: "destructive",
};

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: { status?: EnquiryStatus };
}) {
  const [enquiries, settings] = await Promise.all([
    db.enquiry.findMany({
      where: searchParams.status ? { status: searchParams.status } : undefined,
      include: { customer: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.settings.findUnique({ where: { id: "default" } }),
  ]);

  const rawDefaults = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, unknown>;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Track every walk-in, call, and online enquiry."
        actions={
          <Button asChild variant="gradient">
            <Link href="/enquiries/new">
              <Plus className="h-4 w-4" /> New enquiry
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b flex flex-wrap gap-2">
            {(["", "NEW", "CONTACTED", "QUOTED", "CONVERTED", "LOST"] as const).map((s) => (
              <Link
                key={s}
                href={s ? `/enquiries?status=${s}` : "/enquiries"}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  (searchParams.status ?? "") === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                }`}
              >
                {s || "All"}
              </Link>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right whitespace-nowrap">Guide total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[1%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((e) => {
                const guide = sumEnquiryInterestEstimate(e, rawDefaults);
                const canConvert = e.status !== "CONVERTED" && !e.convertedBookingId;
                const canEdit = canConvert;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono">
                      <Link href={`/enquiries/${e.id}`} className="hover:underline">
                        {e.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {e.customer.firstName} {e.customer.lastName ?? ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{e.customer.phone}</div>
                    </TableCell>
                    <TableCell className="text-xs">{e.eventType.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {e.eventStart ? formatDate(e.eventStart, true) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                      {formatINR(guide)}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(e.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-nowrap">
                        {canEdit && (
                          <Button asChild size="sm" variant="secondary" className="h-8 px-2 gap-1">
                            <Link href={`/enquiries/${e.id}/edit`} title="Edit enquiry">
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </Link>
                          </Button>
                        )}
                        {canConvert && (
                          <>
                            <Button asChild size="sm" variant="outline" className="h-8 px-2 gap-1">
                              <Link href={`/quotations/new?fromEnquiry=${e.id}`} title="Create quotation">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Quote</span>
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="gradient" className="h-8 px-2 gap-1">
                              <Link href={`/bookings/new?fromEnquiry=${e.id}`} title="Convert to booking">
                                <CalendarPlus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Book</span>
                              </Link>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {enquiries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No enquiries match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
