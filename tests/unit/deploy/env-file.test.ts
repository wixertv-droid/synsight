import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  mergeDeploymentEnv,
  parseEnvFileText,
}: {
  mergeDeploymentEnv: (
    processEnv: Record<string, string>,
    fileEnv: Record<string, string>
  ) => Record<string, string>;
  parseEnvFileText: (contents: string) => Record<string, string>;
} = require("../../../deployment/env-file.cjs");

describe("PM2 production env loading", () => {
  it("parses comments and quoted values", () => {
    expect(
      parseEnvFileText(`
        # comment
        DATABASE_URL=mysql://synsight:new@localhost/synsight
        SMTP_FROM="SynSight <noreply@synsight.de>"
      `)
    ).toEqual({
      DATABASE_URL: "mysql://synsight:new@localhost/synsight",
      SMTP_FROM: "SynSight <noreply@synsight.de>",
    });
  });

  it("lets .env.production override stale PM2/shell credentials", () => {
    const merged = mergeDeploymentEnv(
      { DATABASE_URL: "mysql://stale", APP_URL: "http://old" },
      { DATABASE_URL: "mysql://correct", APP_URL: "https://synsight.de" }
    );
    expect(merged.DATABASE_URL).toBe("mysql://correct");
    expect(merged.APP_URL).toBe("https://synsight.de");
  });
});
