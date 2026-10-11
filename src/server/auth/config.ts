import type { BetterAuthOptions } from "better-auth";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { serverEnv } from "@/env/server";
import { db } from "@/server/db/client";
import { createId } from "@/server/db/id";
import { authSchema } from "@/server/db/schema/auth";

function requireAuthEnvironment() {
  const secret = serverEnv.BETTER_AUTH_SECRET;
  const baseURL = serverEnv.BETTER_AUTH_URL;

  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  if (!baseURL) throw new Error("BETTER_AUTH_URL is required");

  return { secret, baseURL };
}

export function createAuthOptions({ allowSignUp }: { allowSignUp: boolean }) {
  const { secret, baseURL } = requireAuthEnvironment();
  const isProduction = process.env.NODE_ENV === "production";

  return {
    appName: "Harrylever Portfolio Admin",
    baseURL,
    secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          input: false,
          defaultValue: "user",
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 10,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": false,
      },
    },
    advanced: {
      database: {
        generateId: (_options: { model: string; size?: number }) => createId(),
      },
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
      },
    },
    trustedOrigins: [baseURL],
  } satisfies BetterAuthOptions;
}
