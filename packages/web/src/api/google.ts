import { Hono } from "hono";
import { eq, inArray, sql } from "drizzle-orm";
import * as schema from "./database/schema";
import { database } from "./database";

type Variables = {
  user: typeof schema.user.$inferSelect | null;
  session: typeof schema.session.$inferSelect | null;
};

// Ensure the google_token table exists (runs once on first request)
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await database.execute(sql`CREATE TABLE IF NOT EXISTS google_token (
      user_id VARCHAR(191) PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP NOT NULL,
      scope VARCHAR(512),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_gt_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    )`);
    tableReady = true;
  } catch (e: any) {
    if (e?.message?.includes("already exists") || e?.code === "ER_TABLE_EXISTS_ERROR") {
      tableReady = true;
    } else {
      console.error("[google] table init error:", e?.message);
    }
  }
}

const SCOPES = "https://www.googleapis.com/auth/contacts";

function getRedirectUri(origin: string) {
  return `${origin}/api/google/callback`;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await database
    .update(schema.googleToken)
    .set({ accessToken: data.access_token, expiresAt, updatedAt: new Date() })
    .where(eq(schema.googleToken.userId, userId));
  return data.access_token;
}

async function getValidToken(userId: string): Promise<string | null> {
  const [token] = await database
    .select()
    .from(schema.googleToken)
    .where(eq(schema.googleToken.userId, userId));
  if (!token) return null;
  if (token.expiresAt > new Date()) return token.accessToken;
  if (!token.refreshToken) return null;
  return refreshAccessToken(userId, token.refreshToken);
}

const google = new Hono<{ Variables: Variables }>();

google.get("/auth-url", async (c) => {
  await ensureTable();
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!process.env.GOOGLE_CLIENT_ID) return c.json({ error: "Google not configured" }, 503);

  const origin = new URL(c.req.url).origin;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", user.id);
  return c.json({ url: url.toString() });
});

google.get("/callback", async (c) => {
  await ensureTable();
  const { code, state, error } = c.req.query();
  if (error) {
    return c.html(`<html><body><p>Google auth error: ${error}</p>
      <script>if(window.opener){window.opener.postMessage({type:'google-auth-error',error:'${error}'},'*');window.close();}</script>
      </body></html>`);
  }
  if (!code || !state) return c.html("<p>Missing code or state</p>", 400);

  const origin = new URL(c.req.url).origin;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return c.html(`<html><body><p>Token exchange failed: ${err}</p>
      <script>if(window.opener){window.opener.postMessage({type:'google-auth-error',error:'token_exchange_failed'},'*');window.close();}</script>
      </body></html>`, 500);
  }

  const tokenData = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const userId = state;

  await database.delete(schema.googleToken).where(eq(schema.googleToken.userId, userId));
  await database.insert(schema.googleToken).values({
    userId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    expiresAt,
    scope: tokenData.scope,
  });

  return c.html(`<html><body>
    <p style="font-family:sans-serif;text-align:center;margin-top:80px">
      ✅ Connected to Google Contacts! Closing…
    </p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'google-auth-success' }, '*');
        window.close();
      } else {
        window.location.href = '/leads';
      }
    </script>
    </body></html>`);
});

google.get("/status", async (c) => {
  await ensureTable();
  const user = c.get("user");
  if (!user) return c.json({ connected: false });
  const configured = !!process.env.GOOGLE_CLIENT_ID;
  const [token] = await database
    .select({ userId: schema.googleToken.userId })
    .from(schema.googleToken)
    .where(eq(schema.googleToken.userId, user.id));
  return c.json({ connected: !!token, configured });
});

google.delete("/disconnect", async (c) => {
  await ensureTable();
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await database.delete(schema.googleToken).where(eq(schema.googleToken.userId, user.id));
  return c.json({ ok: true });
});

google.post("/sync", async (c) => {
  await ensureTable();
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const accessToken = await getValidToken(user.id);
  if (!accessToken) return c.json({ error: "not_connected" }, 403);

  const body = await c.req.json().catch(() => ({})) as { leadIds?: string[] };
  const leadIds = body.leadIds;

  const leads = leadIds && leadIds.length > 0
    ? await database.select().from(schema.lead).where(inArray(schema.lead.id, leadIds))
    : await database.select().from(schema.lead);

  let created = 0, failed = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const contact: Record<string, unknown> = {
      names: [{ givenName: lead.name.split(" ")[0], familyName: lead.name.split(" ").slice(1).join(" ") }],
      emailAddresses: [{ value: lead.email, type: "work" }],
    };
    if (lead.phone) contact.phoneNumbers = [{ value: lead.phone, type: "mobile" }];
    if (lead.business) contact.organizations = [{ name: lead.business, type: "work" }];

    const res = await fetch("https://people.googleapis.com/v1/people:createContact", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contact),
    });

    if (res.ok) {
      created++;
    } else {
      failed++;
      const err = await res.json() as { error?: { message?: string } };
      if (errors.length < 3) errors.push(err?.error?.message ?? "Unknown error");
    }

    if (created + failed < leads.length) {
      await new Promise(r => setTimeout(r, 120));
    }
  }

  return c.json({ ok: true, created, failed, total: leads.length, errors });
});

export default google;
