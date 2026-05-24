import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const bookings = await db.booking.findMany({
    where: { status: { not: "CANCELLED" }, deletedAt: null },
    include: { customer: true },
    orderBy: { eventStart: "asc" },
    take: 500,
  });
  const blackouts = await db.blackoutDate.findMany({ orderBy: { date: "asc" } });

  const events = [
    ...bookings.map((b) => ({
      id: b.id,
      title: `${b.customer.firstName} ${b.customer.lastName ?? ""} · ${b.eventType.replace(/_/g, " ")}`,
      start: b.eventStart.toISOString(),
      end: b.eventEnd.toISOString(),
      url: `/bookings/${b.id}`,
      backgroundColor:
        b.status === "TENTATIVE" ? "#f59e0b"
        : b.status === "CHECKED_IN" ? "#3b82f6"
        : b.status === "COMPLETED" ? "#6b7280"
        : "#10b981",
      borderColor: "transparent",
    })),
    ...blackouts.map((bo) => ({
      id: `bo-${bo.id}`,
      title: `Blackout: ${bo.reason ?? ""}`,
      start: bo.date.toISOString().slice(0, 10),
      allDay: true,
      backgroundColor: "#ef4444",
      borderColor: "transparent",
      display: "background" as const,
    })),
  ];

  return (
    <>
      <PageHeader title="Calendar" description="Every confirmed and tentative event in one view." />
      <CalendarView events={events} />
    </>
  );
}
