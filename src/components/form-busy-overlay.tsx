"use client";

import { Loader2 } from "lucide-react";

type FormBusyOverlayProps = {
  show: boolean;
  /** Shown next to the spinner */
  label?: string;
};

/**
 * Non-blocking visual for long server actions (wrap the form in `relative`).
 * Announces state for screen readers while inputs stay visible underneath.
 */
export function FormBusyOverlay({ show, label = "Working…" }: FormBusyOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex cursor-wait items-start justify-center rounded-lg bg-background/55 pt-[min(28vh,12rem)] backdrop-blur-[2px]"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium shadow-md">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        {label}
      </div>
    </div>
  );
}
