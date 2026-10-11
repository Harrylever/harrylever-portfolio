import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  DATABASE_URL_UNPOOLED: z.url().startsWith("postgresql://"),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.url().optional(),
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
  get BETTER_AUTH_SECRET() {
    return readServerEnv().BETTER_AUTH_SECRET;
  },
  get BETTER_AUTH_URL() {
    return readServerEnv().BETTER_AUTH_URL;
  },
});
