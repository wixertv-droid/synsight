import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/validation/**/*.ts",
        "src/lib/security/**/*.ts",
        "src/lib/auth/session-token.ts",
        "src/lib/utils/crypto.ts",
        "src/lib/api/response.ts",
        "src/lib/services/verification-service.ts",
        "src/lib/services/auth-service.ts",
      ],
    },
  },
});
