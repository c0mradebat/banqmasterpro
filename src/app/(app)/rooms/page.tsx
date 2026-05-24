import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { Hotel, BedDouble, Sparkles, Wrench } from "lucide-react";
import type { RoomStatus } from "@/generated/prisma/client";
import { RoomStatusToggle } from "./room-status-toggle";

const statusColor: Record<RoomStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  OCCUPIED: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  RESERVED: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  DIRTY: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  MAINTENANCE: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

export default async function RoomsPage() {
  const rooms = await db.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] });
  const counts = rooms.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }),
    {} as Record<RoomStatus, number>
  );

  return (
    <>
      <PageHeader title="Rooms" description="Live status across all guest rooms." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Available" value={counts.AVAILABLE ?? 0} icon={Hotel} accent="success" />
        <StatCard label="Occupied" value={counts.OCCUPIED ?? 0} icon={BedDouble} accent="primary" />
        <StatCard label="Needs cleaning" value={counts.DIRTY ?? 0} icon={Sparkles} accent="warning" />
        <StatCard label="Maintenance" value={counts.MAINTENANCE ?? 0} icon={Wrench} accent="danger" />
      </div>

      <Card>
        <CardHeader><CardTitle>All rooms</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {rooms.map((r) => (
              <div key={r.id} className={`rounded-xl border p-4 ${statusColor[r.status]}`}>
                <div className="text-xs uppercase tracking-wider opacity-70">{r.type.replace(/_/g, " ")}</div>
                <div className="text-2xl font-bold mt-1">{r.number}</div>
                <div className="text-xs mt-1">Floor {r.floor} · cap {r.capacity}</div>
                <div className="mt-3 flex flex-col gap-1">
                  <Badge variant="outline" className="bg-background/80 self-start">{r.status}</Badge>
                  <RoomStatusToggle id={r.id} current={r.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
