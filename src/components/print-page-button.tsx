"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintPageButton({ className }: { className?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      Print
    </Button>
  );
}
