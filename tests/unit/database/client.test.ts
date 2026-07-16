import { afterEach, describe, expect, it } from "vitest";
import { getDatabase } from "@/lib/database/client";

describe("database client production guard", () => {
  const previousRequired = process.env.REQUIRE_DATABASE;
  const previousUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (previousRequired === undefined) delete process.env.REQUIRE_DATABASE;
    else process.env.REQUIRE_DATABASE = previousRequired;
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  it("rejects in-memory fallback when the database is required", () => {
    process.env.REQUIRE_DATABASE = "true";
    delete process.env.DATABASE_URL;

    expect(() => getDatabase()).toThrow("In-memory repositories are disabled");
  });

  it("keeps in-memory repositories available for explicit local tests", () => {
    process.env.REQUIRE_DATABASE = "false";
    delete process.env.DATABASE_URL;

    expect(getDatabase()).toBeNull();
  });
});
