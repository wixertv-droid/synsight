import { describe, expect, it } from "vitest";
import { readMysqlInsertId } from "@/lib/analysis/digital-exposure/repository";

describe("readMysqlInsertId", () => {
  it("reads drizzle mysql2 tuple shape [ResultSetHeader, ...]", () => {
    expect(readMysqlInsertId([{ insertId: 42 }, []])).toBe(42);
    expect(readMysqlInsertId([{ insertId: BigInt(7) }, []])).toBe(7);
  });

  it("reads direct ResultSetHeader shape", () => {
    expect(readMysqlInsertId({ insertId: 99 })).toBe(99);
  });

  it("returns 0 for missing shapes", () => {
    expect(readMysqlInsertId(undefined)).toBe(0);
    expect(readMysqlInsertId([])).toBe(0);
    expect(readMysqlInsertId({})).toBe(0);
  });
});
