import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.APP_DATABASE_URL || process.env.DATABASE_URL!,
  authToken: process.env.APP_DATABASE_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
});

export const database = drizzle(client, { schema });
