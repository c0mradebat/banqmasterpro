import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { QuotationForm } from "./quotation-form";
import { buildQuotationLinesFromEnquiry, type QuotationFromEnquiryPrefill } from "@/lib/enquiry-booking-prefill";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: { fromEnquiry?: string };
}) {
  const settings = await db.settings.findUnique({ where: { id: "default" } });
  const rawDefaults = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, unknown>;

  let fromEnquiry: QuotationFromEnquiryPrefill | null = null;
  const enquiryParam = searchParams.fromEnquiry?.trim();
  if (enquiryParam) {
    const e = await db.enquiry.findUnique({
      where: { id: enquiryParam },
      include: { customer: true },
    });
    if (e && !e.convertedBookingId && e.status !== "CONVERTED") {
      const lines = buildQuotationLinesFromEnquiry(e, rawDefaults);
      const customerName = [e.customer.firstName, e.customer.lastName ?? ""].filter(Boolean).join(" ").trim();
      fromEnquiry = {
        enquiryId: e.id,
        enquiryCode: e.code,
        customerName: customerName || e.customer.firstName,
        phone: e.customer.phone,
        notes: e.notes,
        lines,
      };
    }
  }

  return (
    <>
      <PageHeader
        title={fromEnquiry ? "New quotation from enquiry" : "New quotation"}
        description={
          fromEnquiry
            ? `Prefilled from ${fromEnquiry.enquiryCode}. Edit line items as needed, then save.`
            : "Build a quick estimate for a prospect."
        }
      />
      <QuotationForm defaults={JSON.parse(JSON.stringify(settings))} fromEnquiry={fromEnquiry} />
    </>
  );
}
