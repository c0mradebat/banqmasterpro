"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const RoleEnumValues = ["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT", "STAFF", "DEV"] as const;

const CreateStaffInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, _, ., -"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  /** A RoleDef id from the database. The legacy enum field is auto-derived from the linked role's key. */
  roleId: z.string().min(1),
  phone: z.string().optional().nullable(),
});

export type CreateStaffInput = z.infer<typeof CreateStaffInput>;

/** Map a Role row to the legacy User.role enum so existing reads still work. STAFF is the safe default. */
function roleEnumFromKey(key: string): Role {
  return (RoleEnumValues as readonly string[]).includes(key) ? (key as Role) : ("STAFF" as Role);
}

export async function createStaff(input: CreateStaffInput) {
  const actor = await requirePermission("MANAGE_STAFF");
  const data = CreateStaffInput.parse(input);

  const role = await db.roleDef.findUnique({ where: { id: data.roleId } });
  if (!role) throw new Error("Selected role not found");

  const passwordHash = await bcrypt.hash(data.password, 10);

  await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username.toLowerCase(),
        passwordHash,
        role: roleEnumFromKey(role.key),
        roleId: role.id,
        phone: data.phone || null,
      },
    });
    await logAudit(tx, {
      userId: actor.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: created.id,
      description: `Created ${role.name} ${data.username}`,
    });
  });

  revalidatePath("/staff");
}

const UpdateStaffRoleInput = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

export async function updateStaffRole(input: z.infer<typeof UpdateStaffRoleInput>) {
  const actor = await requirePermission("MANAGE_STAFF");
  const data = UpdateStaffRoleInput.parse(input);

  const [user, role] = await Promise.all([
    db.user.findUnique({ where: { id: data.userId }, select: { id: true, username: true, role: true } }),
    db.roleDef.findUnique({ where: { id: data.roleId } }),
  ]);
  if (!user) throw new Error("User not found");
  if (!role) throw new Error("Role not found");

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { roleId: role.id, role: roleEnumFromKey(role.key) },
    });
    await logAudit(tx, {
      userId: actor.id,
      action: "UPDATE_USER_ROLE",
      entity: "User",
      entityId: user.id,
      description: `${user.username} → ${role.name}`,
    });
  });

  revalidatePath("/staff");
}

export async function toggleUserActive(id: string) {
  const actor = await requirePermission("MANAGE_STAFF");
  const u = await db.user.findUnique({ where: { id } });
  if (!u) throw new Error("User not found");
  if (u.id === actor.id) throw new Error("You can't deactivate your own account");

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { active: !u.active } });
    await logAudit(tx, {
      userId: actor.id,
      action: "TOGGLE_USER_ACTIVE",
      entity: "User",
      entityId: id,
      description: `${u.username} → ${!u.active ? "active" : "inactive"}`,
    });
  });

  revalidatePath("/staff");
}
