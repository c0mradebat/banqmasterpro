import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getDefaultEventWindowLocal, isoToDatetimeLocalValue } from "@/lib/enquiry-booking-prefill";
import { EnquiryEditForm, type EnquiryEditInitial } from "./enquiry-edit-form";

export default async function EditEnquiryPage({ params }: { params: { id: string } }) {
  const e = await db.enquiry.findUnique({
    where: { id: params.id },
    include: { customer: true },
  });
  if (!e) notFound();
  if (e.status === "CONVERTED" || e.convertedBookingId) {
    redirect(`/enquiries/${params.id}`);
  }

  const def = getDefaultEventWindowLocal();
  const initial: EnquiryEditInitial = {
    id: e.id,
    code: e.code,
    customer: {
      firstName: e.customer.firstName,
      lastName: e.customer.lastName ?? "",
      phone: e.customer.phone,
      city: e.customer.city ?? "",
      state: e.customer.state ?? "",
    },
    eventType: e.eventType,
    eventStart: e.eventStart ? isoToDatetimeLocalValue(e.eventStart.toISOString(), def.start) : "",
    eventEnd: e.eventEnd ? isoToDatetimeLocalValue(e.eventEnd.toISOString(), def.end) : "",
    guestCount: e.guestCount ?? "",
    notes: e.notes ?? "",
    hasMarriageHall: e.hasMarriageHall,
    hasDiningHall: e.hasDiningHall,
    hasShahiBhoj: e.hasShahiBhoj,
    hasLawn: e.hasLawn,
    hasSwimmingPool: e.hasSwimmingPool,
    hasPoolRefill: e.hasPoolRefill,
    hasPoolParty: e.hasPoolParty,
    hasDjHall: e.hasDjHall,
    hasCocktail: e.hasCocktail,
    hasRooms: e.hasRooms,
  };

  return (
    <>
      <PageHeader title={`Edit ${e.code}`} description="Update customer, event, services, and notes." />
      <EnquiryEditForm initial={initial} />
    </>
  );
}
