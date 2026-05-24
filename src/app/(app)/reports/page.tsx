import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { formatINR } from "@/lib/utils";
import { CalendarDays, ClipboardList, IndianRupee, TrendingUp } from "lucide-react";
import { ReportsCharts } from "./charts";
import { userCan } from "@/lib/auth-guard";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  if (!(await userCan("VIEW_REPORTS"))) redirect("/dashboard");
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

  const [
    monthlyRevenue,
    monthlyBookings,
    yearlyRevenue,
    eventTypeStats,
    topCustomers,
    serviceStats,
  ] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: monthStart }, kind: { not: "REFUND" }, deletedAt: null },
    }),
    db.booking.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: yearStart }, kind: { not: "REFUND" }, deletedAt: null },
    }),
    db.booking.groupBy({
      by: ["eventType"],
      _count: true,
      where: { createdAt: { gte: yearStart }, deletedAt: null },
    }),
    db.booking.groupBy({
      by: ["customerId"],
      _sum: { totalAmount: true },
      _count: { _all: true },
      where: { deletedAt: null },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    }),
    db.bookingServiceItem.groupBy({
      by: ["kind"],
      _sum: { total: true },
      _count: true,
      where: { booking: { deletedAt: null } },
    }),
  ]);

  const customerIds = topCustomers.map((t) => t.customerId);
  const customers = await db.customer.findMany({ where: { id: { in: customerIds } } });
  const cmap = new Map(customers.map((c) => [c.id, c]));

  const monthlyByMonth = await db.$queryRaw<{ month: Date; revenue: number; bookings: number }[]>`
    SELECT date_trunc('month', "receivedAt") AS month,
           sum(amount)::float AS revenue,
           0 AS bookings
    FROM "Payment"
    WHERE "receivedAt" >= ${yearStart} AND "kind" != 'REFUND' AND "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `;

  const chartData = monthlyByMonth.map((r) => ({
    month: new Date(r.month).toLocaleDateString("en-US", { month: "short" }),
    revenue: Number(r.revenue ?? 0),
  }));

  const eventTypeData = eventTypeStats.map((e) => ({
    type: e.eventType.replace(/_/g, " "),
    count: e._count,
  }));

  const serviceData = serviceStats
    .filter((s) => Number(s._sum.total ?? 0) > 0)
    .map((s) => ({ kind: s.kind.replace(/_/g, " "), revenue: Number(s._sum.total ?? 0) }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <>
      <PageHeader title="Reports" description="High-level performance across your venue." />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="This month revenue" value={formatINR(Number(monthlyRevenue._sum.amount ?? 0))} icon={IndianRupee} accent="success" />
        <StatCard label="This month bookings" value={monthlyBookings} icon={ClipboardList} />
        <StatCard label="YTD revenue" value={formatINR(Number(yearlyRevenue._sum.amount ?? 0))} icon={TrendingUp} accent="primary" />
        <StatCard label="Active events" value={eventTypeStats.reduce((s, e) => s + e._count, 0)} icon={CalendarDays} />
      </div>

      <ReportsCharts revenueByMonth={chartData} eventTypeData={eventTypeData} serviceData={serviceData} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top customers (lifetime value)</CardTitle>
          <CardDescription>Your highest revenue customers this year.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topCustomers.map((t, i) => {
              const c = cmap.get(t.customerId);
              if (!c) return null;
              return (
                <div key={t.customerId} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">{i + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium">{c.firstName} {c.lastName ?? ""}</div>
                    <div className="text-xs text-muted-foreground">{c.phone} · {t._count._all} bookings</div>
                  </div>
                  <div className="font-semibold">{formatINR(Number(t._sum.totalAmount ?? 0))}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
