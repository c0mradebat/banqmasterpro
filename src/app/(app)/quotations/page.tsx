import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { Plus, FileText, Printer, ExternalLink } from "lucide-react";
import { QuotationSendButton } from "@/components/quotation-send-button";

export default async function QuotationsPage() {
  const quotations = await db.quotation.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader
        title="Quotations"
        description="Send price estimates to prospects."
        actions={
          <Button asChild variant="gradient">
            <Link href="/quotations/new">
              <Plus className="h-4 w-4" /> New quotation
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          {quotations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No quotations yet. Create one to share a price estimate.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right w-[1%] whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono">
                      <Link href={`/quotations/${q.id}`} className="hover:underline">
                        {q.code}
                      </Link>
                    </TableCell>
                    <TableCell>{q.customerName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{q.phone ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatINR(Number(q.total))}</TableCell>
                    <TableCell className="text-xs">{q.validUntil ? formatDate(q.validUntil) : "—"}</TableCell>
                    <TableCell className="text-xs">{formatDate(q.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-nowrap">
                        <Button asChild size="sm" variant="ghost" className="h-8 px-2 gap-1">
                          <Link href={`/quotations/${q.id}`} title="Open quotation">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-8 px-2 gap-1">
                          <Link
                            href={`/quotations/${q.id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Print"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Print</span>
                          </Link>
                        </Button>
                        <QuotationSendButton phone={q.phone} compact />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
