"use client";

import NextTopLoader from "nextjs-toploader";

/** Thin top bar + subtle activity while App Router navigates between pages. */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color="hsl(var(--primary))"
      height={3}
      showSpinner={false}
      speed={200}
      shadow="0 0 12px hsl(var(--primary) / 0.35)"
      zIndex={99999}
    />
  );
}
