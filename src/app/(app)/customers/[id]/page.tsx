import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, MapPin, Mail } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const c = await db.customer.findUnique({
    where: { id: params.id },
    include: {
      bookings: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      enquiries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();

  const lifetimeValue = c.bookings.reduce((s, b) => s + Number(b.totalAmount), 0);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/customers"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </Button>
      <PageHeader title={`${c.firstName} ${c.lastName ?? ""}`} description={`Customer since ${formatDate(c.createdAt)}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {c.phone}</div>
            {c.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {c.email}</div>}
            {(c.city || c.state) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {c.city}, {c.state}</div>}
            {c.notes && <div className="text-muted-foreground italic mt-2">{c.notes}</div>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>At a glance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-3xl font-bold">{c.bookings.length}</div><div className="text-xs text-muted-foreground">Bookings</div></div>
            <div><div className="text-3xl font-bold">{c.enquiries.length}</div><div className="text-xs text-muted-foreground">Enquiries</div></div>
            <div><div className="text-3xl font-bold">{formatINR(lifetimeValue)}</div><div className="text-xs text-muted-foreground">Lifetime value</div></div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Bookings</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {c.bookings.length === 0 && <div className="text-sm text-muted-foreground">No bookings yet.</div>}
          {c.bookings.map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="block rounded-lg border p-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div className="font-mono">{b.code}</div>
                <Badge variant="muted">{b.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(b.eventStart, true)} · {b.eventType.replace(/_/g, " ")}</div>
              <div className="text-sm font-medium">{formatINR(Number(b.totalAmount))}</div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Enquiries</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {c.enquiries.length === 0 && <div className="text-sm text-muted-foreground">No enquiries yet.</div>}
          {c.enquiries.map((e) => (
            <Link key={e.id} href={`/enquiries/${e.id}`} className="block rounded-lg border p-3 hover:bg-accent">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">{e.code}</div>
                <Badge variant="muted">{e.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{e.eventStart ? formatDate(e.eventStart) : "No date set"} · {e.eventType.replace(/_/g, " ")}</div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
