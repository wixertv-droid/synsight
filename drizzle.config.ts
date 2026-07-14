import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/database/schema.ts",
  out: "./database/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://root:password@localhost:3306/synsight",
  },
  strict: true,
  verbose: true,
});
