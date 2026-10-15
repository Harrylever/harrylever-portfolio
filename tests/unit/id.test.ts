import { describe, expect, test } from "bun:test";

import { createId } from "@/server/db/id";

const cuid2Pattern = /^[a-z][a-z0-9]{23}$/;

describe("createId", () => {
  test("generates unique CUID2 primary keys", () => {
    const ids = Array.from({ length: 100 }, createId);

    expect(new Set(ids).size).toBe(100);
    expect(ids.every((id) => cuid2Pattern.test(id))).toBe(true);
  });
});
