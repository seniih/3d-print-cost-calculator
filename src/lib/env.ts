import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup.
 *
 * The app runs in one of two modes, picked automatically:
 * - **local**: no OAuth provider is configured. Everyone using this instance
 *   shares a single built-in "Local user" — ideal for running on your own
 *   machine with `docker compose up`.
 * - **public**: at least one OAuth provider (Google / GitHub) is configured.
 *   Visitors can calculate as guests and sign in to save their data.
 */

const DEV_SECRET = "dev-only-secret-change-me-before-going-public";

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32).default(DEV_SECRET),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  const env = parsed.data;

  const providers = {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  };
  const mode: AppMode = providers.google || providers.github ? "public" : "local";

  if (mode === "public" && env.BETTER_AUTH_SECRET === DEV_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set to a random value when sign-in providers are enabled. " +
        "Generate one with: openssl rand -base64 32",
    );
  }

  return { ...env, providers, mode };
}

export type AppMode = "local" | "public";
export type Env = ReturnType<typeof load>;

let cached: Env | undefined;

/**
 * Validated environment. Read lazily so that `next build` (which imports
 * route modules) does not need runtime secrets or a database URL.
 */
export function getEnv(): Env {
  cached ??= load();
  return cached;
}
