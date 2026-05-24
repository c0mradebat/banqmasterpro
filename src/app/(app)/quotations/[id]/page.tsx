import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer, MessageSquare } from "lucide-react";
import { QuotationSendButton } from "@/components/quotation-send-button";
import { DeleteQuotationButton } from "./delete-quotation-button";

type Line = { label?: string; qty?: number; rate?: number };

export default async function QuotationDetailPage({ params }: { params: { id: string } }) {
  const q = await db.quotation.findUnique({
    where: { id: params.id },
    include: {
      enquiry: {
        include: { convertedBooking: { select: { id: true, status: true } } },
      },
    },
  });
  if (!q) notFound();

  const lines: Line[] = Array.isArray(q.body) ? (q.body as Line[]) : [];

  const canDeleteQuotation =
    q.enquiry != null &&
    (q.enquiry.status === "CANCELLED" ||
      q.enquiry.status === "LOST" ||
      (q.enquiry.convertedBooking != null && q.enquiry.convertedBooking.status === "CANCELLED"));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/quotations">
          <ArrowLeft className="h-4 w-4" /> Back to quotations
        </Link>
      </Button>
      <PageHeader
        title={q.code}
        description={`${q.customerName ?? "Customer"} · ${formatDate(q.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/quotations/${q.id}/print`} target="_blank" rel="noopener noreferrer">
                <Printer className="h-4 w-4" />
                Print
              </Link>
            </Button>
            <QuotationSendButton phone={q.phone} />
            {canDeleteQuotation && <DeleteQuotationButton id={q.id} code={q.code} />}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">{q.customerName ?? "—"}</div>
              <div className="text-muted-foreground">{q.phone ?? "—"}</div>
              {q.validUntil && (
                <div className="text-muted-foreground">Valid until {formatDate(q.validUntil)}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((row, i) => {
                    const qty = Number(row.qty ?? 1);
                    const rate = Number(row.rate ?? 0);
                    const lineTotal = qty * rate;
                    return (
                      <TableRow key={i}>
                        <TableCell>{row.label ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{qty}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(rate)}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatINR(lineTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="border-t px-4 py-3 text-right text-lg font-semibold tabular-nums">
                {formatINR(Number(q.total))}
              </div>
            </CardContent>
          </Card>

          {q.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{q.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {q.enquiry && (
            <Card>
              <CardHeader>
                <CardTitle>Enquiry</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/enquiries/${q.enquiry.id}`}>{q.enquiry.code}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
