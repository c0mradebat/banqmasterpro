import "server-only";

import { auth } from "@/auth";
import type { PermissionKey } from "@/lib/permissions";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Returns the session user. Throws `UnauthorizedError` if no session. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

/** Throws unless the current user's role grants this permission. */
export async function requirePermission(perm: PermissionKey) {
  const user = await requireUser();
  if (!user.permissions?.includes(perm)) {
    throw new ForbiddenError();
  }
  return user;
}

/** Throws unless the current user's role grants *any* of these permissions. */
export async function requireAnyPermission(perms: PermissionKey[]) {
  const user = await requireUser();
  if (!perms.some((p) => user.permissions?.includes(p))) {
    throw new ForbiddenError();
  }
  return user;
}

/** Non-throwing check — for page-level redirects and conditional UI. */
export async function userCan(perm: PermissionKey): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.permissions?.includes(perm));
}
