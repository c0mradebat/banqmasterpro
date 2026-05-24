import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, formatDate } from "@/lib/utils";
import {
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Hotel,
  IndianRupee,
  Plus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "./revenue-chart";

export default async function DashboardPage() {
  const session = await auth();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();
  const in7 = new Date();
  in7.setDate(today.getDate() + 7);

  const [
    bookingsThisMonth,
    eventsThisMonth,
    occupiedRooms,
    totalRooms,
    pendingEnquiries,
    revenueThisMonthAgg,
    pendingDuesAgg,
    upcomingEvents,
    recentBookings,
    paymentsByMonth,
  ] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } }),
    db.booking.count({ where: { eventStart: { gte: startOfMonth }, deletedAt: null } }),
    db.room.count({ where: { status: "OCCUPIED" } }),
    db.room.count(),
    db.enquiry.count({ where: { status: { in: ["NEW", "CONTACTED", "QUOTED"] } } }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: startOfMonth }, kind: { not: "REFUND" }, deletedAt: null },
    }),
    db.booking.aggregate({
      _sum: { balanceDue: true },
      where: {
        status: { in: ["TENTATIVE", "CONFIRMED", "CHECKED_IN"] },
        deletedAt: null,
      },
    }),
    db.booking.findMany({
      where: {
        eventStart: { gte: today, lte: in7 },
        status: { not: "CANCELLED" },
        deletedAt: null,
      },
      orderBy: { eventStart: "asc" },
      take: 6,
      include: { customer: true },
    }),
    db.booking.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true },
    }),
    db.$queryRaw<{ month: Date; total: number }[]>`
      SELECT date_trunc('month', "receivedAt") as month, sum(amount)::float as total
      FROM "Payment"
      WHERE "receivedAt" >= ${startOfYear} AND "kind" != 'REFUND' AND "deletedAt" IS NULL
      GROUP BY 1 ORDER BY 1
    `,
  ]);

  const chartData = paymentsByMonth.map((r) => ({
    month: new Date(r.month).toLocaleDateString("en-US", { month: "short" }),
    revenue: Number(r.total ?? 0),
  }));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${session?.user.name?.split(" ")[0] ?? "there"} 👋`}
        description="Here's what's happening across your venue today."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/enquiries/new"><Plus className="h-4 w-4" /> New enquiry</Link>
            </Button>
            <Button asChild variant="gradient">
              <Link href="/bookings/new"><Plus className="h-4 w-4" /> New booking</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Bookings this month"
          value={bookingsThisMonth}
          icon={ClipboardList}
          hint={`${eventsThisMonth} events scheduled`}
        />
        <StatCard
          label="Revenue this month"
          value={formatINR(Number(revenueThisMonthAgg._sum.amount ?? 0))}
          icon={IndianRupee}
          accent="success"
          hint="Net of refunds"
        />
        <StatCard
          label="Pending dues"
          value={formatINR(Number(pendingDuesAgg._sum.balanceDue ?? 0))}
          icon={Wallet}
          accent="warning"
          hint="Across active bookings"
        />
        <StatCard
          label="Rooms occupied"
          value={`${occupiedRooms} / ${totalRooms}`}
          icon={Hotel}
          accent="primary"
          hint={`${totalRooms - occupiedRooms} available`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>Payments received this year</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Open enquiries</CardTitle>
              <CardDescription>Awaiting follow-up</CardDescription>
            </div>
            <Badge variant="info">{pendingEnquiries}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="rounded-lg p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{pendingEnquiries} pending</div>
                  <div className="text-xs text-muted-foreground">Convert to bookings to lock dates</div>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/enquiries">View</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming events</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/calendar">Open calendar</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No events scheduled in the next week.
              </div>
            )}
            {upcomingEvents.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card hover:bg-accent transition-colors p-3"
              >
                <div className="text-center w-12 shrink-0">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {new Date(b.eventStart).toLocaleDateString("en", { month: "short" })}
                  </div>
                  <div className="text-lg font-bold">
                    {new Date(b.eventStart).getDate()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {b.customer.firstName} {b.customer.lastName ?? ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.eventType.replace(/_/g, " ")} · {formatDate(b.eventStart, true)}
                  </div>
                </div>
                <Badge
                  variant={
                    b.status === "CONFIRMED"
                      ? "success"
                      : b.status === "CHECKED_IN"
                      ? "info"
                      : "muted"
                  }
                >
                  {b.status}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent bookings</CardTitle>
            <CardDescription>Last 5 created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentBookings.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card hover:bg-accent transition-colors p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{b.code}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {b.customer.firstName} {b.customer.lastName ?? ""} · {formatDate(b.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatINR(Number(b.totalAmount))}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Bal {formatINR(Number(b.balanceDue))}
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
