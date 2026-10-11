import { describe, expect, test } from "bun:test";

import { parseServerEnv } from "@/env/server";

const pooled =
  "postgresql://portfolio:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const direct =
  "postgresql://portfolio:secret@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("parseServerEnv", () => {
  test("requires pooled and direct database URLs", () => {
    expect(() => parseServerEnv({})).toThrow("DATABASE_URL");
    expect(() => parseServerEnv({ DATABASE_URL: pooled })).toThrow(
      "DATABASE_URL_UNPOOLED",
    );
  });

  test("keeps database credentials out of public environment keys", () => {
    const environment = parseServerEnv({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
      NEXT_PUBLIC_DATABASE_URL: pooled,
      NEXT_PUBLIC_DATABASE_URL_UNPOOLED: direct,
    });

    expect(environment).toEqual({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
    });
    expect(
      Object.keys(environment).some((key) => key.startsWith("NEXT_PUBLIC_")),
    ).toBe(false);
  });
});
