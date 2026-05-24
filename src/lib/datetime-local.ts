/** `datetime-local` string ↔ Date in local timezone (same convention as `input[type="datetime-local"]`). */

export function toDatetimeLocalValue(d: Date): string {
  const local = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(local).toISOString().slice(0, 16);
}

export function parseDatetimeLocalValue(value: string): Date {
  return new Date(value);
}

/** Next calendar day at 17:00 local, relative to the calendar day of `startLocal`. */
export function defaultEndFromStartLocal(startLocal: string): string {
  const d = parseDatetimeLocalValue(startLocal);
  if (Number.isNaN(d.getTime())) return startLocal;
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 17, 0, 0, 0);
  return toDatetimeLocalValue(end);
}

/** Smallest valid end after start (default +1 hour) — used when start moves and invalidates end, without forcing the long template window. */
export function minEndAfterStartLocal(startLocal: string, hoursAfter = 1): string {
  const start = parseDatetimeLocalValue(startLocal);
  if (Number.isNaN(start.getTime())) return startLocal;
  return toDatetimeLocalValue(new Date(start.getTime() + hoursAfter * 60 * 60 * 1000));
}

/**
 * When **start** changes: keep existing end if it is still strictly after start; otherwise nudge end
 * forward by `hoursAfter` (short default so users can still pick multi-hour slots freely).
 */
export function adjustEndWhenStartChangesLocal(startLocal: string, previousEndLocal: string, hoursAfter = 1): string {
  if (!startLocal) return previousEndLocal;
  const start = parseDatetimeLocalValue(startLocal);
  const prevEnd = parseDatetimeLocalValue(previousEndLocal);
  if (
    previousEndLocal &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(prevEnd.getTime()) &&
    prevEnd.getTime() > start.getTime()
  ) {
    return previousEndLocal;
  }
  return minEndAfterStartLocal(startLocal, hoursAfter);
}
