import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/utils";
import { PrintPageButton } from "@/components/print-page-button";

export const dynamic = "force-dynamic";

export default async function PrintReceiptPage({ params }: { params: { id: string } }) {
  const booking = await db.booking.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      customer: true,
      serviceItems: true,
      payments: { where: { deletedAt: null } },
    },
  });
  if (!booking) notFound();

  const settings = await db.settings.findUnique({ where: { id: "default" } });
  const electricity = Number(booking.electricityUnits) * Number(booking.electricityRate);
  const generator = Number(booking.generatorHours) * Number(booking.generatorRate);
  const mattress = booking.addonMattresses * Number(booking.addonMattressRate);

  return (
    <html>
      <head>
        <title>Receipt {booking.code}</title>
        <style>{`
          @media print { .no-print { display: none } body { margin: 0 } }
          body { font-family: ui-sans-serif, system-ui; padding: 32px; color: #111; max-width: 820px; margin: 0 auto; }
          h1 { font-size: 24px; margin: 0; }
          h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 24px 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
          th { font-weight: 600; color: #666; }
          .right { text-align: right; }
          .total { font-weight: 700; font-size: 16px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #111; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; background: #eef; color: #224; }
        `}</style>
      </head>
      <body>
        <div className="no-print" style={{ position: "absolute", top: 16, right: 16 }}>
          <PrintPageButton />
        </div>
        <div className="header">
          <div>
            <h1>{settings?.venueName || "Banquet Hall"}</h1>
            <div style={{ fontSize: 12, color: "#666" }}>
              {settings?.venueAddress}
              <br />
              {settings?.venuePhone} · {settings?.venueEmail}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="badge">{booking.status}</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>{booking.code}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{formatDate(booking.bookingDate)}</div>
          </div>
        </div>

        <h2>Customer</h2>
        <div style={{ fontSize: 14 }}>
          <strong>{booking.customer.firstName} {booking.customer.lastName ?? ""}</strong>
          <br />
          {booking.customer.phone}
          {booking.customer.city && ` · ${booking.customer.city}, ${booking.customer.state}`}
        </div>

        <h2>Event</h2>
        <div style={{ fontSize: 14 }}>
          <strong>{booking.eventType.replace(/_/g, " ")}</strong>
          <br />
          {formatDate(booking.eventStart, true)} → {formatDate(booking.eventEnd, true)}
          {booking.guestCount && ` · ${booking.guestCount} guests`}
        </div>

        <h2>Services</h2>
        <table>
          <thead>
            <tr><th>Item</th><th className="right">Qty</th><th className="right">Rate</th><th className="right">Total</th></tr>
          </thead>
          <tbody>
            {booking.serviceItems.map((s) => (
              <tr key={s.id}>
                <td>{s.label || s.kind.replace(/_/g, " ")}</td>
                <td className="right">{s.quantity}</td>
                <td className="right">{formatINR(Number(s.unitPrice))}</td>
                <td className="right">{formatINR(Number(s.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Charges & Payments</h2>
        <table>
          <tbody>
            <tr><td>Subtotal</td><td className="right">{formatINR(Number(booking.subtotal))}</td></tr>
            {Number(booking.discount) > 0 && <tr><td>Discount {booking.discountReason ? `(${booking.discountReason})` : ""}</td><td className="right" style={{ color: "#0a0" }}>− {formatINR(Number(booking.discount))}</td></tr>}
            {Number(booking.miscCharges) > 0 && <tr><td>Misc {booking.miscReason ? `(${booking.miscReason})` : ""}</td><td className="right">{formatINR(Number(booking.miscCharges))}</td></tr>}
            {electricity > 0 && <tr><td>Electricity ({String(booking.electricityUnits)} units × ₹{String(booking.electricityRate)})</td><td className="right">{formatINR(electricity)}</td></tr>}
            {generator > 0 && <tr><td>Generator ({String(booking.generatorHours)}h × ₹{String(booking.generatorRate)})</td><td className="right">{formatINR(generator)}</td></tr>}
            {mattress > 0 && <tr><td>Add-on mattresses ({booking.addonMattresses})</td><td className="right">{formatINR(mattress)}</td></tr>}
            <tr className="total"><td>Total</td><td className="right">{formatINR(Number(booking.totalAmount))}</td></tr>
            {Number(booking.securityDeposit) > 0 && <tr><td>Security deposit</td><td className="right">{formatINR(Number(booking.securityDeposit))}</td></tr>}
            <tr><td>Total received</td><td className="right">{formatINR(Number(booking.paidAmount))}</td></tr>
            {Number(booking.refundAmount) > 0 && <tr><td>Refunded</td><td className="right" style={{ color: "#a00" }}>− {formatINR(Number(booking.refundAmount))}</td></tr>}
            <tr className="total"><td>Balance</td><td className="right">{formatINR(Number(booking.balanceDue))}</td></tr>
          </tbody>
        </table>

        <div style={{ marginTop: 32, fontSize: 11, color: "#999", textAlign: "center" }}>
          Thank you for choosing {settings?.venueName}. This is a system-generated receipt.
        </div>
        <div className="no-print" style={{ marginTop: 24, textAlign: "center" }}>
          <PrintPageButton />
        </div>
      </body>
    </html>
  );
}
