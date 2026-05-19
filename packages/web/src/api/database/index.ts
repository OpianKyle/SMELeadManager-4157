// Bun compatibility fix: mysql2's pool.query() calls Error.captureStackTrace with a plain
// object, but Bun requires the first argument to be an actual Error instance. Patch it to
// silently ignore that case so queries don't crash.
const _origCaptureStackTrace = Error.captureStackTrace;
if (typeof _origCaptureStackTrace === "function") {
  (Error as any).captureStackTrace = (target: unknown, ...args: unknown[]) => {
    try {
      _origCaptureStackTrace(target as Error, ...(args as [Function?]));
    } catch {
      // silently ignore — happens when target is a plain object (mysql2 internal)
    }
  };
}

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
});

export const database = drizzle(pool, { schema, mode: "default" });
