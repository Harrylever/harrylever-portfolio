import { z } from "zod";

// Treat blank values (e.g. copied from .env.example) as unset.
const optionalSecret = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

// Any Postgres URL: a local server in development/tests, Neon in production.
const postgresUrl = z.url().regex(/^postgres(ql)?:\/\//, {
  message: "Expected a postgres:// or postgresql:// URL",
});

// A public link to the résumé; optional so builds work without it.
const httpUrl = z.url().regex(/^https?:\/\//, {
  message: "Expected an http(s) URL",
});

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_UNPOOLED: postgresUrl,
  // Optional at parse time so builds and public pages do not need them; the
  // admin auth module requires all three before it signs or verifies anything.
  ADMIN_EMAIL: optionalSecret(z.email()),
  ADMIN_PASSWORD: optionalSecret(z.string().min(12)),
  ADMIN_SESSION_SECRET: optionalSecret(z.string().min(32)),
  RESUME_URL: optionalSecret(httpUrl),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv;
export function parseServerEnv(input: Partial<NodeJS.ProcessEnv>): ServerEnv;
export function parseServerEnv(input: Partial<NodeJS.ProcessEnv>): ServerEnv {
  return serverEnvSchema.parse(input);
}

let cachedServerEnv: ServerEnv | undefined;

function readServerEnv(): ServerEnv {
  cachedServerEnv ??= parseServerEnv(process.env);

  return cachedServerEnv;
}

export const serverEnv: ServerEnv = Object.freeze({
  get DATABASE_URL() {
    return readServerEnv().DATABASE_URL;
  },
  get DATABASE_URL_UNPOOLED() {
    return readServerEnv().DATABASE_URL_UNPOOLED;
  },
  get ADMIN_EMAIL() {
    return readServerEnv().ADMIN_EMAIL;
  },
  get ADMIN_PASSWORD() {
    return readServerEnv().ADMIN_PASSWORD;
  },
  get ADMIN_SESSION_SECRET() {
    return readServerEnv().ADMIN_SESSION_SECRET;
  },
  get RESUME_URL() {
    return readServerEnv().RESUME_URL;
  },
});
