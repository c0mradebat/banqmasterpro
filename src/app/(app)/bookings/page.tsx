import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR, formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import type { BookingStatus } from "@/generated/prisma/client";

const statusVariant: Record<BookingStatus, "default" | "success" | "warning" | "info" | "destructive" | "muted"> = {
  TENTATIVE: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "info",
  COMPLETED: "muted",
  CANCELLED: "destructive",
  REFUNDED: "muted",
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: BookingStatus };
}) {
  const where: any = { deletedAt: null };
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { code: { contains: searchParams.q, mode: "insensitive" } },
      { customer: { firstName: { contains: searchParams.q, mode: "insensitive" } } },
      { customer: { lastName: { contains: searchParams.q, mode: "insensitive" } } },
      { customer: { phone: { contains: searchParams.q } } },
    ];
  }

  const bookings = await db.booking.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Bookings"
        description="All confirmed and tentative bookings."
        actions={
          <Button asChild variant="gradient">
            <Link href="/bookings/new"><Plus className="h-4 w-4" /> New booking</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <form className="p-4 border-b flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={searchParams.q ?? ""}
                placeholder="Search by code, name, phone…"
                className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm"
              />
            </div>
            <select
              name="status"
              defaultValue={searchParams.status ?? ""}
              className="h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">All statuses</option>
              <option value="TENTATIVE">Tentative</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked-in</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Button type="submit" variant="outline">Filter</Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id} className="cursor-pointer">
                  <TableCell className="font-mono font-medium">
                    <Link href={`/bookings/${b.id}`} className="hover:underline">
                      {b.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {b.customer.firstName} {b.customer.lastName ?? ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{b.customer.phone}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{b.eventType.replace(/_/g, " ")}</span>
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(b.eventStart, true)}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(Number(b.totalAmount))}</TableCell>
                  <TableCell className="text-right">
                    <span className={Number(b.balanceDue) > 0 ? "text-amber-600 font-medium" : "text-emerald-600"}>
                      {formatINR(Number(b.balanceDue))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[b.status]}>{b.status.replace("_", " ")}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No bookings yet.
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
