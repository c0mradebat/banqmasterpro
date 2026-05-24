"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createRole } from "@/server/roles";
import { permissionLabel, type PermissionKey } from "@/lib/permissions";

export function CreateRoleDialog({
  trigger,
  groupedPermissions,
}: {
  trigger: React.ReactNode;
  groupedPermissions: Record<string, PermissionKey[]>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState(30);
  const [perms, setPerms] = useState<Set<PermissionKey>>(new Set(["VIEW_DASHBOARD"]));

  function togglePerm(key: PermissionKey) {
    setPerms((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function reset() {
    setName("");
    setDescription("");
    setLevel(30);
    setPerms(new Set(["VIEW_DASHBOARD"]));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a custom role</DialogTitle>
          <DialogDescription>
            Pick exactly what this role can do. You can edit permissions later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Role name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Head Chef, Maintenance Lead"
            />
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What this role is responsible for"
          />
        </div>

        <div className="max-h-[40vh] overflow-y-auto pr-1 -mr-1 space-y-3">
          {Object.entries(groupedPermissions).map(([group, keys]) => (
            <div key={group} className="rounded-lg border p-3">
              <div className="text-sm font-medium mb-2">{group}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {keys.map((k) => (
                  <label
                    key={k}
                    className="flex items-start gap-2 text-sm cursor-pointer rounded px-2 py-1 hover:bg-accent"
                  >
                    <Checkbox
                      checked={perms.has(k)}
                      onCheckedChange={() => togglePerm(k)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">{permissionLabel(k)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
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
                if (!name.trim()) {
                  toast.error("Name is required");
                  return;
                }
                try {
                  await createRole({
                    name: name.trim(),
                    description: description.trim() || null,
                    level,
                    permissions: Array.from(perms),
                  });
                  toast.success(`Role "${name}" created`);
                  setOpen(false);
                  reset();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              })
            }
          >
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
