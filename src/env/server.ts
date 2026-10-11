import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url().startsWith("postgresql://"),
  DATABASE_URL_UNPOOLED: z.url().startsWith("postgresql://"),
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
});
