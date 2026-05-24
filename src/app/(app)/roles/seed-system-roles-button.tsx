"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ensureSystemRoles } from "@/server/roles";
import { Wand2 } from "lucide-react";

export function SeedSystemRolesButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          try {
            await ensureSystemRoles();
            toast.success("System roles seeded");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        })
      }
    >
      <Wand2 className="h-4 w-4" /> Seed system roles
    </Button>
  );
}
