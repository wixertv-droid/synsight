import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("serpapi account integration", () => {
  it("exposes admin account route and cache helpers", () => {
    const route = readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/admin/search-provider/account/route.ts"
      ),
      "utf8"
    );
    const service = readFileSync(
      path.join(process.cwd(), "src/lib/services/search-provider-service.ts"),
      "utf8"
    );
    expect(route).toContain("getSerpApiAccountSnapshot");
    expect(service).toContain("serpapi.com/account.json");
    expect(service).toContain("estimatedMonthSpendUsd");
    expect(service).toContain("ACCOUNT_CACHE_TTL_MS");
    expect(service).toContain("refreshSerpApiAccountCacheQuietly");
  });
});
