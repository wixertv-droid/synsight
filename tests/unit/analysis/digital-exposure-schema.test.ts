import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";

describe("ensureDigitalExposureSchema", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
  });

  it("returns false without DATABASE_URL and does not throw", async () => {
    const {
      ensureDigitalExposureSchema,
      resetDigitalExposureSchemaEnsureForTests,
    } = await import("@/lib/analysis/digital-exposure/ensure-schema");
    resetDigitalExposureSchemaEnsureForTests();
    await expect(ensureDigitalExposureSchema(true)).resolves.toBe(false);
  });

  it("getLatestDigitalExposureReport returns null without DB", async () => {
    const { getLatestDigitalExposureReport } =
      await import("@/lib/analysis/digital-exposure/repository");
    await expect(getLatestDigitalExposureReport(1)).resolves.toBeNull();
  });
});
