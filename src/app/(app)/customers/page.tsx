import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatDate } from "@/lib/utils";
import { Search } from "lucide-react";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const where: any = {};
  if (searchParams.q) {
    where.OR = [
      { firstName: { contains: searchParams.q, mode: "insensitive" } },
      { lastName: { contains: searchParams.q, mode: "insensitive" } },
      { phone: { contains: searchParams.q } },
      { city: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }
  const customers = await db.customer.findMany({
    where,
    include: {
      _count: {
        select: {
          bookings: { where: { deletedAt: null } },
          enquiries: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totals = await db.booking.groupBy({
    by: ["customerId"],
    _sum: { totalAmount: true },
    where: { deletedAt: null },
  });
  const totalsMap = new Map(totals.map((t) => [t.customerId, Number(t._sum.totalAmount ?? 0)]));

  return (
    <>
      <PageHeader title="Customers" description="Your CRM — every customer who has ever booked or enquired." />
      <Card>
        <CardContent className="p-0">
          <form className="p-4 border-b">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search by name, phone, city…" className="w-full h-9 pl-9 pr-3 rounded-md border bg-background text-sm" />
            </div>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Enquiries</TableHead>
                <TableHead className="text-right">Lifetime value</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${c.id}`} className="hover:underline">
                      {c.firstName} {c.lastName ?? ""}
                    </Link>
                    {c.blacklist && <Badge variant="destructive" className="ml-2">Blacklisted</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell className="text-right">{c._count.bookings}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{c._count.enquiries}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(totalsMap.get(c.id) ?? 0)}</TableCell>
                  <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">No customers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
