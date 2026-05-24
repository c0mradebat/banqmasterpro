import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma, no bcryptjs).
// Used by middleware. The full config in auth.ts extends this.
export default {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [],
} satisfies NextAuthConfig;
