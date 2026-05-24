import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { ArrowDownToLine, ArrowUpToLine, IndianRupee, Wallet } from "lucide-react";

export default async function PaymentsPage() {
  const [payments, totals] = await Promise.all([
    db.payment.findMany({
      where: { deletedAt: null },
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: { booking: { include: { customer: true } }, recordedBy: true },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { kind: { not: "REFUND" }, deletedAt: null },
    }),
  ]);

  const refundsAgg = await db.payment.aggregate({
    _sum: { amount: true },
    where: { kind: "REFUND", deletedAt: null },
  });
  const dueAgg = await db.booking.aggregate({
    _sum: { balanceDue: true },
    where: {
      status: { in: ["TENTATIVE", "CONFIRMED", "CHECKED_IN"] },
      deletedAt: null,
    },
  });

  return (
    <>
      <PageHeader title="Payments" description="Every payment and refund recorded in the system." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total received" value={formatINR(Number(totals._sum.amount ?? 0))} icon={ArrowDownToLine} accent="success" />
        <StatCard label="Total refunded" value={formatINR(Number(refundsAgg._sum.amount ?? 0))} icon={ArrowUpToLine} accent="danger" />
        <StatCard label="Outstanding" value={formatINR(Number(dueAgg._sum.balanceDue ?? 0))} icon={Wallet} accent="warning" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{formatDate(p.receivedAt, true)}</TableCell>
                  <TableCell><Link href={`/bookings/${p.bookingId}`} className="font-mono hover:underline">{p.booking.code}</Link></TableCell>
                  <TableCell className="text-sm">{p.booking.customer.firstName} {p.booking.customer.lastName ?? ""}</TableCell>
                  <TableCell><Badge variant={p.kind === "REFUND" ? "destructive" : "secondary"}>{p.kind.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-xs">{p.method.replace("_", " ")}</TableCell>
                  <TableCell className="text-xs">{p.recordedBy.name}</TableCell>
                  <TableCell className={`text-right font-medium ${p.kind === "REFUND" ? "text-rose-600" : "text-emerald-600"}`}>
                    {p.kind === "REFUND" ? "− " : "+ "}{formatINR(Number(p.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No payments recorded.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
