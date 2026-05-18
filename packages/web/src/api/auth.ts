import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "./database";
import * as schema from "./database/schema";

export const createAuth = (baseURL: string) =>
  betterAuth({
    database: drizzleAdapter(database, {
      provider: "mysql",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET ?? "masakhe-secret-2026",
    baseURL,
    trustedOrigins: async (request) => {
      const origin = request?.headers.get("origin");
      if (origin) return [origin];
      return [];
    },
  });

// Static export for CLI schema generation
export const auth = createAuth("http://localhost:5000");
