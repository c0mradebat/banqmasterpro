import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "./booking-form";
import {
  buildServiceRowsFromEnquiry,
  getDefaultEventWindowLocal,
  isoToDatetimeLocalValue,
  type BookingFromEnquiryPrefill,
} from "@/lib/enquiry-booking-prefill";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { fromEnquiry?: string };
}) {
  const [settings, vendors] = await Promise.all([
    db.settings.findUnique({ where: { id: "default" } }),
    db.vendor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const rawDefaults = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, unknown>;

  let fromEnquiry: BookingFromEnquiryPrefill | null = null;
  const enquiryParam = searchParams.fromEnquiry?.trim();
  if (enquiryParam) {
    const enquiry = await db.enquiry.findUnique({
      where: { id: enquiryParam },
      include: { customer: true },
    });
    if (enquiry && !enquiry.convertedBookingId) {
      const { start: defStart, end: defEnd } = getDefaultEventWindowLocal();
      const eventStart = isoToDatetimeLocalValue(enquiry.eventStart?.toISOString() ?? null, defStart);
      const eventEnd = isoToDatetimeLocalValue(enquiry.eventEnd?.toISOString() ?? null, defEnd);
      const serviceItems = buildServiceRowsFromEnquiry(enquiry, rawDefaults, eventStart, eventEnd);
      fromEnquiry = {
        enquiryId: enquiry.id,
        enquiryCode: enquiry.code,
        customer: {
          firstName: enquiry.customer.firstName,
          lastName: enquiry.customer.lastName,
          phone: enquiry.customer.phone,
          city: enquiry.customer.city,
          state: enquiry.customer.state,
        },
        eventType: enquiry.eventType,
        eventStart,
        eventEnd,
        guestCount: enquiry.guestCount,
        notes: enquiry.notes,
        serviceItems,
      };
    }
  }

  return (
    <>
      <PageHeader
        title={fromEnquiry ? "New booking from enquiry" : "New booking"}
        description={
          fromEnquiry
            ? `Prefilled from ${fromEnquiry.enquiryCode}. Review services and pricing, then create the booking.`
            : "Create a booking with one or more services. Each service can have its own timing."
        }
      />
      <BookingForm
        defaults={JSON.parse(JSON.stringify(settings))}
        vendors={vendors.map((v) => ({ id: v.id, name: v.name, kind: v.kind }))}
        fromEnquiry={fromEnquiry}
      />
    </>
  );
}
