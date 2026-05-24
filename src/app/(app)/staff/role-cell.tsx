"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffRole } from "@/server/staff";

type RoleOption = { id: string; name: string };

export function RoleCell({
  userId,
  currentRoleId,
  currentRoleName,
  roles,
}: {
  userId: string;
  currentRoleId: string | null;
  currentRoleName: string;
  roles: RoleOption[];
}) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(currentRoleId ?? "");

  if (roles.length === 0) {
    return <span className="text-xs text-muted-foreground">{currentRoleName}</span>;
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const nextId = e.target.value;
        const prev = value;
        setValue(nextId);
        start(async () => {
          try {
            await updateStaffRole({ userId, roleId: nextId });
            toast.success("Role updated");
          } catch (err) {
            setValue(prev);
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
      className="h-7 text-xs px-2 rounded border bg-background disabled:opacity-60"
      aria-busy={pending}
    >
      {!currentRoleId && <option value="">{currentRoleName}</option>}
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
