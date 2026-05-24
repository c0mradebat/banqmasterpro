import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

type AuditableClient = Pick<PrismaClient, "auditLog">;

export type AuditArgs = {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Write an audit log entry. Pass `tx` when inside a `db.$transaction`, otherwise pass `db`.
 * Centralised so every server action logs through the same shape.
 */
export async function logAudit(client: AuditableClient, args: AuditArgs) {
  await client.auditLog.create({
    data: {
      userId: args.userId ?? null,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId ?? undefined,
      description: args.description ?? undefined,
      meta: (args.meta as never) ?? undefined,
    },
  });
}
