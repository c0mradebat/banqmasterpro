import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import authConfig from "@/auth.config";
import type { Role } from "@/generated/prisma/client";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { env } from "@/env";
import { SYSTEM_ROLE_DEFAULTS, type PermissionKey } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      username: string;
      role: Role;
      /** Display name of the role (system or custom). */
      roleName: string;
      /** Stable key — system roles use the enum key, custom roles use their `id`. */
      roleKey: string;
      /** Permission keys the role grants. Use `requirePermission` / `userCan` to check. */
      permissions: PermissionKey[];
      avatarUrl?: string | null;
    };
  }
  interface User {
    id: string;
    username: string;
    role: Role;
    roleName: string;
    roleKey: string;
    permissions: PermissionKey[];
    avatarUrl?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    roleName: string;
    roleKey: string;
    permissions: PermissionKey[];
    avatarUrl?: string | null;
  }
}

/**
 * Resolve a user's effective role: prefer the linked RoleDef row (custom or seeded system),
 * fall back to the hard-coded defaults so the system still works before the seed runs.
 */
async function resolveRole(userId: string, enumRole: Role) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roleDef: true },
  });
  if (user?.roleDef) {
    return {
      roleKey: user.roleDef.id,
      roleName: user.roleDef.name,
      permissions: (user.roleDef.permissions ?? []) as PermissionKey[],
    };
  }
  const fallback = SYSTEM_ROLE_DEFAULTS[enumRole];
  return {
    roleKey: enumRole,
    roleName: fallback?.name ?? enumRole,
    permissions: (fallback?.permissions ?? []) as PermissionKey[],
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        try {
          const username = String(creds?.username ?? "").trim().toLowerCase();
          const password = String(creds?.password ?? "");
          if (!username || !password) return null;

          const bypassList = (env.AUTH_RATE_LIMIT_BYPASS ?? "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          if (!bypassList.includes(username)) {
            const limit = rateLimit(`login:${username}`, 8, 15 * 60 * 1000);
            if (!limit.ok) {
              throw new Error(
                `Too many login attempts. Try again in ${limit.retryAfter}s.`
              );
            }
          }

          const user = await db.user.findUnique({
            where: { username },
            include: { roleDef: true },
          });
          if (!user || !user.active) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;

          resetRateLimit(`login:${username}`);

          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          const resolved = await resolveRole(user.id, user.role);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            roleKey: resolved.roleKey,
            roleName: resolved.roleName,
            permissions: resolved.permissions,
            avatarUrl: user.avatarUrl,
          };
        } catch (err) {
          if (err instanceof Error && err.message.startsWith("Too many login attempts")) {
            throw err;
          }
          console.error("[auth.authorize] error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.roleKey = user.roleKey;
        token.roleName = user.roleName;
        token.permissions = user.permissions;
        token.avatarUrl = user.avatarUrl;
        token.name = user.name;
        token.email = user.email!;
      } else if (token.id && (trigger === "update" || !token.permissions)) {
        // Re-fetch role/permissions on session refresh so admin permission edits propagate
        // to active sessions when the user next reloads or `update()` is called.
        const resolved = await resolveRole(token.id as string, token.role as Role);
        token.roleKey = resolved.roleKey;
        token.roleName = resolved.roleName;
        token.permissions = resolved.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
        session.user.roleKey = (token.roleKey as string) ?? (token.role as string);
        session.user.roleName = (token.roleName as string) ?? (token.role as string);
        session.user.permissions = (token.permissions as PermissionKey[]) ?? [];
        session.user.avatarUrl = token.avatarUrl as string | null | undefined;
      }
      return session;
    },
  },
});
