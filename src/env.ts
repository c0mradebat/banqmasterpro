import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/db)"),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters (generate one with `openssl rand -base64 32`)"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  APP_NAME: z.string().default("BanqMaster Pro"),
  DEFAULT_CURRENCY: z.string().default("INR"),
  DEFAULT_TIMEZONE: z.string().default("Asia/Kolkata"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  /** Comma-separated list of usernames or IPs to bypass login rate limit (dev only). */
  AUTH_RATE_LIMIT_BYPASS: z.string().optional(),
});

function loadEnv() {
  if (process.env.NODE_ENV === "test") {
    return EnvSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret",
      ...process.env,
    });
  }
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export const env = loadEnv();
