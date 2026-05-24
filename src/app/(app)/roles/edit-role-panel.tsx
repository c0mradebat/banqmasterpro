"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { deleteRole, resetSystemRoleDefaults, updateRole } from "@/server/roles";
import { permissionLabel, type PermissionKey } from "@/lib/permissions";
import { RotateCcw, Save, Trash2 } from "lucide-react";

type Role = {
  id: string;
  name: string;
  description: string | null;
  level: number;
  isSystem: boolean;
  permissions: PermissionKey[];
  userCount: number;
};

export function EditRolePanel({
  role,
  groupedPermissions,
}: {
  role: Role;
  groupedPermissions: Record<string, PermissionKey[]>;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [level, setLevel] = useState(role.level);
  const [perms, setPerms] = useState<Set<PermissionKey>>(new Set(role.permissions));

  function togglePerm(key: PermissionKey) {
    setPerms((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAll(keys: PermissionKey[]) {
    setPerms((current) => new Set([...current, ...keys]));
  }
  function clearAll(keys: PermissionKey[]) {
    setPerms((current) => {
      const next = new Set(current);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2 sm:col-span-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={role.isSystem}
            placeholder="Role name"
          />
          {role.isSystem && (
            <p className="text-[11px] text-muted-foreground">
              System role names are locked. You can still edit permissions and description.
            </p>
          )}
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
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What does this role do?"
        />
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Permissions ({perms.size})
        </div>
        {Object.entries(groupedPermissions).map(([group, keys]) => {
          const allOn = keys.every((k) => perms.has(k));
          const noneOn = keys.every((k) => !perms.has(k));
          return (
            <div key={group} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{group}</div>
                <div className="flex gap-2 text-[11px]">
                  <button
                    type="button"
                    className="text-emerald-600 hover:underline disabled:opacity-40"
                    disabled={allOn}
                    onClick={() => selectAll(keys)}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-rose-600 hover:underline disabled:opacity-40"
                    disabled={noneOn}
                    onClick={() => clearAll(keys)}
                  >
                    Clear
                  </button>
                </div>
              </div>
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
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
        {role.isSystem ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                if (!confirm(`Reset "${role.name}" to default permissions? Your customizations will be lost.`)) return;
                try {
                  await resetSystemRoleDefaults(role.id);
                  toast.success("Reset to defaults");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              })
            }
          >
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            loading={pending}
            disabled={role.userCount > 0}
            title={role.userCount > 0 ? `Reassign the ${role.userCount} user(s) first` : undefined}
            onClick={() =>
              start(async () => {
                if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
                try {
                  await deleteRole(role.id);
                  toast.success("Role deleted");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              })
            }
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
        <Button
          type="button"
          variant="gradient"
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              try {
                await updateRole({
                  id: role.id,
                  name: role.isSystem ? undefined : name.trim(),
                  description: description.trim() || null,
                  level,
                  permissions: Array.from(perms),
                });
                toast.success("Role saved");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            })
          }
        >
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}
