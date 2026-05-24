"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { ALL_PERMISSIONS, type PermissionKey, SYSTEM_ROLE_DEFAULTS } from "@/lib/permissions";

const PermissionsArraySchema = z
  .array(z.string())
  .transform((arr) => Array.from(new Set(arr)).filter((p): p is PermissionKey => (ALL_PERMISSIONS as readonly string[]).includes(p)));

const CreateRoleInput = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional().nullable(),
  level: z.coerce.number().int().min(0).max(100).default(20),
  permissions: PermissionsArraySchema,
});

export type CreateRoleInput = z.input<typeof CreateRoleInput>;

function slugifyKey(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createRole(input: CreateRoleInput) {
  const user = await requirePermission("MANAGE_ROLES");
  const data = CreateRoleInput.parse(input);

  // Generate a unique custom key (CUSTOM_<slug> + optional suffix).
  const base = `CUSTOM_${slugifyKey(data.name) || "ROLE"}`;
  let key = base;
  for (let i = 2; i < 100; i++) {
    const exists = await db.roleDef.findUnique({ where: { key }, select: { id: true } });
    if (!exists) break;
    key = `${base}_${i}`;
  }

  const created = await db.$transaction(async (tx) => {
    const role = await tx.roleDef.create({
      data: {
        key,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        level: data.level,
        isSystem: false,
        permissions: data.permissions,
      },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "CREATE_ROLE",
      entity: "RoleDef",
      entityId: role.id,
      description: `Created role "${role.name}" with ${role.permissions.length} permission(s)`,
    });
    return role;
  });

  revalidatePath("/roles");
  revalidatePath("/staff");
  return created.id;
}

const UpdateRoleInput = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60).optional(),
  description: z.string().max(300).optional().nullable(),
  level: z.coerce.number().int().min(0).max(100).optional(),
  permissions: PermissionsArraySchema.optional(),
});

export type UpdateRoleInput = z.input<typeof UpdateRoleInput>;

export async function updateRole(input: UpdateRoleInput) {
  const user = await requirePermission("MANAGE_ROLES");
  const data = UpdateRoleInput.parse(input);

  const existing = await db.roleDef.findUnique({ where: { id: data.id } });
  if (!existing) throw new Error("Role not found");

  // System roles: name is locked (key + name preserve identity); permissions and level are editable.
  const nameUpdate = !existing.isSystem && data.name ? { name: data.name.trim() } : {};

  await db.$transaction(async (tx) => {
    await tx.roleDef.update({
      where: { id: data.id },
      data: {
        ...nameUpdate,
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.permissions !== undefined ? { permissions: data.permissions } : {}),
      },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "UPDATE_ROLE",
      entity: "RoleDef",
      entityId: existing.id,
      description: `Updated role "${existing.name}"${data.permissions ? ` — ${data.permissions.length} permission(s)` : ""}`,
    });
  });

  revalidatePath("/roles");
  revalidatePath("/staff");
}

export async function deleteRole(id: string) {
  const user = await requirePermission("MANAGE_ROLES");

  const existing = await db.roleDef.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystem) throw new Error("System roles cannot be deleted");
  if (existing._count.users > 0) {
    throw new Error(
      `Cannot delete role "${existing.name}" — ${existing._count.users} user(s) still assigned. Reassign them first.`
    );
  }

  await db.$transaction(async (tx) => {
    await tx.roleDef.delete({ where: { id } });
    await logAudit(tx, {
      userId: user.id,
      action: "DELETE_ROLE",
      entity: "RoleDef",
      entityId: id,
      description: `Deleted role "${existing.name}"`,
    });
  });

  revalidatePath("/roles");
  revalidatePath("/staff");
}

/**
 * Ensure the seven system roles exist with their default permissions.
 * Safe to call repeatedly — it upserts by key and never overwrites custom changes
 * an admin has made (only fills in missing rows).
 */
export async function ensureSystemRoles() {
  await requirePermission("MANAGE_ROLES");
  for (const [key, def] of Object.entries(SYSTEM_ROLE_DEFAULTS)) {
    await db.roleDef.upsert({
      where: { key },
      update: {}, // do not stomp on admin-edited permissions
      create: {
        key,
        name: def.name,
        description: def.description,
        level: def.level,
        isSystem: true,
        permissions: def.permissions,
      },
    });
  }
  revalidatePath("/roles");
}

/**
 * Restore a role's permissions to its seeded defaults. Only valid for system roles.
 */
export async function resetSystemRoleDefaults(id: string) {
  const user = await requirePermission("MANAGE_ROLES");
  const role = await db.roleDef.findUnique({ where: { id } });
  if (!role) throw new Error("Role not found");
  if (!role.isSystem) throw new Error("Only system roles can be reset to defaults");

  const def = SYSTEM_ROLE_DEFAULTS[role.key as keyof typeof SYSTEM_ROLE_DEFAULTS];
  if (!def) throw new Error("No default defined for this role key");

  await db.$transaction(async (tx) => {
    await tx.roleDef.update({
      where: { id },
      data: {
        permissions: def.permissions,
        level: def.level,
        description: def.description,
      },
    });
    await logAudit(tx, {
      userId: user.id,
      action: "RESET_ROLE",
      entity: "RoleDef",
      entityId: id,
      description: `Reset "${role.name}" to default permissions`,
    });
  });

  revalidatePath("/roles");
}
