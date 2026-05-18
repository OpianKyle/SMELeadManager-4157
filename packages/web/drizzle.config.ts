import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/api/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.APP_DATABASE_URL || process.env.DATABASE_URL!,
    authToken: process.env.APP_DATABASE_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
  },
});
