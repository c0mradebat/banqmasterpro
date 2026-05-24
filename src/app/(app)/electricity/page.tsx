import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Zap } from "lucide-react";
import { MeterReadingForm } from "./meter-reading-form";

export default async function ElectricityPage() {
  const [readings, activeBookings] = await Promise.all([
    db.meterReading.findMany({
      orderBy: { readingAt: "desc" },
      take: 50,
      include: {
        booking: { include: { customer: true } },
        recordedBy: true,
      },
    }),
    db.booking.findMany({
      where: { status: { in: ["CONFIRMED", "CHECKED_IN"] }, deletedAt: null },
      include: { customer: true },
      orderBy: { eventStart: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Electricity meter"
        description="Track meter readings and link consumption to bookings."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Record reading</CardTitle>
          </CardHeader>
          <CardContent>
            <MeterReadingForm activeBookings={activeBookings.map((b) => ({
              id: b.id,
              label: `${b.code} · ${b.customer.firstName} ${b.customer.lastName ?? ""}`,
            }))} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent readings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="text-right">Reading</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{formatDate(r.readingAt, true)}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.booking ? `${r.booking.code}` : "—"}
                    </TableCell>
                    <TableCell><span className="text-xs">{r.kind}</span></TableCell>
                    <TableCell className="text-right font-medium">{Number(r.reading)}</TableCell>
                    <TableCell className="text-xs">{r.recordedBy?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {readings.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No readings yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
