"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormBusyOverlay } from "@/components/form-busy-overlay";
import { checkAvailabilityWindow } from "@/server/bookings";
import { getDefaultAvailabilityWindowLocal } from "@/lib/enquiry-booking-prefill";
import { defaultEndFromStartLocal, parseDatetimeLocalValue } from "@/lib/datetime-local";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export function AvailabilityChecker() {
  const def = useMemo(() => getDefaultAvailabilityWindowLocal(), []);
  const [pending, start] = useTransition();
  const [startTs, setStartTs] = useState(def.start);
  const [endTs, setEndTs] = useState(def.end);
  const [result, setResult] = useState<null | Awaited<ReturnType<typeof checkAvailabilityWindow>>>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!startTs || !endTs) {
      toast.error("Choose both start and end.");
      return;
    }
    if (new Date(endTs) <= new Date(startTs)) {
      toast.error("End must be after start.");
      return;
    }
    start(async () => {
      try {
        setResult(await checkAvailabilityWindow({ start: startTs, end: endTs }));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Check failed");
      }
    });
  }

  return (
    <div className="relative space-y-6">
      <FormBusyOverlay show={pending} label="Checking availability…" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Time window</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={check} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Default is today 7:00 PM through tomorrow 5:00 PM (local). Changing From sets To to the next calendar
                day at 5:00 PM; you can then edit To for shorter windows.
              </p>
              <div className="space-y-2">
                <Label>From</Label>
                <Input
                  type="datetime-local"
                  value={startTs}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartTs(v);
                    if (!v) return;
                    const d = parseDatetimeLocalValue(v);
                    if (!Number.isNaN(d.getTime())) setEndTs(defaultEndFromStartLocal(v));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input
                  type="datetime-local"
                  value={endTs}
                  onChange={(e) => setEndTs(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="gradient" loading={pending} className="w-full sm:w-auto">
                Check all resources
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result && (
              <div className="text-sm text-muted-foreground">Pick a window and run the check to see each resource.</div>
            )}
            {result && (
              <>
                <div className="text-xs text-muted-foreground">
                  Window: {formatDate(result.windowStart, true)} → {formatDate(result.windowEnd, true)}
                </div>
                <div className="space-y-3">
                  {result.rows.map((row) => (
                    <div
                      key={row.key}
                      className={`rounded-lg border p-4 ${row.available ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/25 bg-rose-500/5"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{row.label}</div>
                        {row.available ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <XCircle className="h-3.5 w-3.5" />
                            Unavailable
                          </Badge>
                        )}
                      </div>

                      {row.bookingConflicts.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Booking conflicts
                          </div>
                          {row.bookingConflicts.map((c) => (
                            <Link
                              key={`${c.bookingId}-${c.itemKind}-${c.startsAt}`}
                              href={`/bookings/${c.bookingId}`}
                              className="block rounded-md border bg-background/80 p-3 text-sm hover:bg-accent"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-xs">{c.code}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {c.itemKind.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              <div className="font-medium">{c.customer}</div>
                              <div className="text-xs text-muted-foreground">
                                {c.startsAt && c.endsAt
                                  ? `${formatDate(c.startsAt, true)} → ${formatDate(c.endsAt, true)}`
                                  : "—"}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {row.enquiryConflicts.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Enquiry overlaps (tentative times)
                          </div>
                          {row.enquiryConflicts.map((q) => (
                            <Link
                              key={q.enquiryId}
                              href={`/enquiries/${q.enquiryId}`}
                              className="block rounded-md border border-amber-500/30 bg-background/80 p-3 text-sm hover:bg-accent"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono text-xs">{q.code}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {q.status}
                                </Badge>
                              </div>
                              <div className="font-medium">{q.customer}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(q.eventStart, true)} → {formatDate(q.eventEnd, true)}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {row.enquiryInterestNoDates.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Enquiries interested (no full tentative times yet)
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {row.enquiryInterestNoDates.map((q) => (
                              <Link
                                key={q.enquiryId}
                                href={`/enquiries/${q.enquiryId}`}
                                className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-accent"
                              >
                                <span className="font-mono">{q.code}</span>
                                <span className="text-muted-foreground">·</span>
                                <span>{q.customer}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
