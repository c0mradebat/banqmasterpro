"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStaff } from "@/server/staff";
import { toast } from "sonner";

type RoleOption = { id: string; key: string; name: string };

export function StaffDialog({
  trigger,
  roles,
}: {
  trigger: React.ReactNode;
  roles: RoleOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const defaultRoleId = roles.find((r) => r.key === "STAFF")?.id ?? roles[0]?.id ?? "";
  const [u, setU] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    roleId: defaultRoleId,
    phone: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Full name</Label>
            <Input value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={u.username}
              onChange={(e) => setU({ ...u, username: e.target.value.toLowerCase() })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={u.email}
              onChange={(e) => setU({ ...u, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={u.phone} onChange={(e) => setU({ ...u, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              value={u.roleId}
              onChange={(e) => setU({ ...u, roleId: e.target.value })}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {roles.length === 0 && <option value="">No roles defined — visit /roles first</option>}
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={u.password}
              onChange={(e) => setU({ ...u, password: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  if (!u.name || !u.username || !u.password || !u.email) {
                    toast.error("Name, email, username, password are required");
                    return;
                  }
                  if (!u.roleId) {
                    toast.error("Pick a role");
                    return;
                  }
                  await createStaff({
                    name: u.name,
                    email: u.email,
                    username: u.username,
                    password: u.password,
                    roleId: u.roleId,
                    phone: u.phone || null,
                  });
                  toast.success("Staff member added");
                  setOpen(false);
                  setU({
                    name: "",
                    email: "",
                    username: "",
                    password: "",
                    roleId: defaultRoleId,
                    phone: "",
                  });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              })
            }
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
