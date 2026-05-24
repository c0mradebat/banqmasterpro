"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, CardContent } from "@/components/ui/card";

export function CalendarView({ events }: { events: any[] }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="[&_.fc]:!font-sans [&_.fc-toolbar-title]:!text-lg [&_.fc-button]:!bg-primary [&_.fc-button]:!border-primary hover:[&_.fc-button]:!opacity-90 [&_.fc-event]:!cursor-pointer">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            events={events}
            eventClick={(info) => {
              if (info.event.url) {
                info.jsEvent.preventDefault();
                window.location.href = info.event.url;
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
