"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addBlackoutDate, removeBlackoutDate } from "@/server/settings";
import { toast } from "sonner";
import { Trash2, Plus, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function BlackoutDatesPanel({
  initial,
}: {
  initial: { id: string; date: string; reason: string | null }[];
}) {
  const [list, setList] = useState(initial);
  const [pending, start] = useTransition();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blackout dates</CardTitle>
        <CardDescription>Block specific days from receiving bookings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maintenance, festival, etc." /></div>
        </div>
        <Button
          variant="gradient"
          disabled={!date}
          loading={pending}
          onClick={() =>
            start(async () => {
              try {
                const created = await addBlackoutDate(date, reason);
                setList([...list, { id: created.id, date, reason: reason || null }]);
                setDate("");
                setReason("");
                toast.success("Date blocked");
              } catch (e: any) {
                toast.error(e?.message || "Failed");
              }
            })
          }
        >
          <Plus className="h-4 w-4" />
          Add blackout
        </Button>

        <div className="space-y-2">
          {list.length === 0 && <div className="text-sm text-muted-foreground">No blackout dates set.</div>}
          {list.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Calendar className="h-4 w-4 text-rose-500" />
              <div className="flex-1">
                <div className="font-medium">{formatDate(b.date)}</div>
                {b.reason && <div className="text-xs text-muted-foreground">{b.reason}</div>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                className="shrink-0"
                onClick={() =>
                  start(async () => {
                    await removeBlackoutDate(b.id);
                    setList(list.filter((x) => x.id !== b.id));
                    toast.success("Removed");
                  })
                }
              >
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
