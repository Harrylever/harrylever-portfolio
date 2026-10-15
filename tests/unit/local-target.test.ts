import { describe, expect, test } from "bun:test";

import { assertLocalDatabaseTarget } from "@/server/db/local-target";

const local = "postgresql://me@localhost:5432/harrylever_portfolio";

describe("assertLocalDatabaseTarget", () => {
  test("accepts a loopback database with a local label", () => {
    expect(() => assertLocalDatabaseTarget(local, "local-dev")).not.toThrow();
    expect(() =>
      assertLocalDatabaseTarget("postgresql://me@127.0.0.1/db", "local-dev"),
    ).not.toThrow();
  });

  test("rejects Neon hosts, pooled or not", () => {
    for (const host of [
      "ep-x.us-east-2.aws.neon.tech",
      "ep-x-pooler.us-east-2.aws.neon.tech",
    ]) {
      expect(() =>
        assertLocalDatabaseTarget(`postgresql://u:p@${host}/db`, "local-dev"),
      ).toThrow(/neon/i);
    }
  });

  test("rejects production labels in any case, and a missing label", () => {
    for (const label of ["production", "Prod", "main", "master"]) {
      expect(() => assertLocalDatabaseTarget(local, label)).toThrow(/label/i);
    }
    expect(() => assertLocalDatabaseTarget(local, undefined)).toThrow(/label/i);
    expect(() => assertLocalDatabaseTarget(local, "  ")).toThrow(/label/i);
  });

  test("rejects a host or hostaddr query parameter that overrides the URL host", () => {
    for (const query of [
      "host=ep-x.neon.tech",
      "hostaddr=10.0.0.5",
      "HOST=x",
    ]) {
      expect(() =>
        assertLocalDatabaseTarget(`${local}?${query}`, "local-dev"),
      ).toThrow(/host/i);
    }
  });

  test("rejects an unparsable or missing URL and a non-loopback host", () => {
    expect(() => assertLocalDatabaseTarget("not a url", "local-dev")).toThrow();
    expect(() => assertLocalDatabaseTarget(undefined, "local-dev")).toThrow();
    expect(() =>
      assertLocalDatabaseTarget(
        "postgresql://u@db.example.com/db",
        "local-dev",
      ),
    ).toThrow(/local/i);
  });
});
