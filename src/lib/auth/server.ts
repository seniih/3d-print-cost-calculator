import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { moveUserData } from "@/lib/auth/move-user-data";

function createAuth() {
  const env = getEnv();

  const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};
  if (env.providers.google) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    };
  }
  if (env.providers.github) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID!,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
    };
  }

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db(), { provider: "postgresql" }),
    socialProviders,
    session: {
      // Keep the session readable without a DB round-trip for 5 minutes.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [
      // Guests get an anonymous account the first time they save something.
      // When they later sign in, everything they saved moves to the real account.
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await moveUserData(anonymousUser.user.id, newUser.user.id);
        },
      }),
      // Must be last: lets Server Actions set auth cookies.
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

/** Better Auth instance, created on first use. */
export function auth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}
