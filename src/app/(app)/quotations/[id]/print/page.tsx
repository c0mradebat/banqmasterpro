import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/utils";
import { PrintPageButton } from "@/components/print-page-button";

export const dynamic = "force-dynamic";

type Line = { label?: string; qty?: number; rate?: number };

export default async function QuotationPrintPage({ params }: { params: { id: string } }) {
  const q = await db.quotation.findUnique({
    where: { id: params.id },
    include: { enquiry: { select: { code: true } } },
  });
  if (!q) notFound();

  const settings = await db.settings.findUnique({ where: { id: "default" } });
  const lines: Line[] = Array.isArray(q.body) ? (q.body as Line[]) : [];

  return (
    <div className="mx-auto max-w-3xl py-6 print:max-w-none print:py-2">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="no-print mb-4 flex gap-2">
        <PrintPageButton />
      </div>

      <div className="border-b-2 border-foreground pb-4 mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold">{settings?.venueName ?? "Banquet Hall"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {settings?.venueAddress}
            <br />
            {settings?.venuePhone} {settings?.venueEmail ? `· ${settings.venueEmail}` : ""}
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="text-lg font-bold">{q.code}</div>
          <div className="text-muted-foreground">{formatDate(q.createdAt)}</div>
          {q.validUntil && <div className="text-muted-foreground">Valid until {formatDate(q.validUntil)}</div>}
        </div>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Customer</h2>
      <p className="text-sm mb-6">
        <span className="font-semibold">{q.customerName ?? "—"}</span>
        <br />
        <span className="text-muted-foreground">{q.phone ?? "—"}</span>
      </p>

      {q.enquiry && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Enquiry</h2>
          <p className="text-sm mb-6 text-muted-foreground">Linked to enquiry {q.enquiry.code}</p>
        </>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Line items</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left font-medium text-muted-foreground">Item</th>
            <th className="py-2 text-right font-medium text-muted-foreground">Qty</th>
            <th className="py-2 text-right font-medium text-muted-foreground">Rate</th>
            <th className="py-2 text-right font-medium text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row, i) => {
            const qty = Number(row.qty ?? 1);
            const rate = Number(row.rate ?? 0);
            const lineTotal = qty * rate;
            return (
              <tr key={i} className="border-b border-border">
                <td className="py-2">{row.label ?? "—"}</td>
                <td className="py-2 text-right tabular-nums">{qty}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(rate)}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-4 text-right text-base font-bold tabular-nums">Total: {formatINR(Number(q.total))}</p>

      {q.notes && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-8 mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{q.notes}</p>
        </>
      )}
    </div>
  );
}
