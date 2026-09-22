import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  OWNER_NAME: z.string().default("Mill Owner"),
  OWNER_EMAIL: z.string().email().default("owner@example.com"),
  OWNER_PASSWORD: z.string().min(8).default("change-me-strong-password"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be long"),
  SESSION_TTL: z.coerce.number().int().positive().default(1209600),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}