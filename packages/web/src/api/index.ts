import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, desc } from "drizzle-orm";
import * as schema from "./database/schema";
import { database } from "./database";
import { createAuth } from "./auth";
import {
  stage1Email, stage2Email, stage3Email, stage4Email, stage5Email, demoReminderEmail, emailWrapper
} from "./emails";
import { sendEmail } from "./mailer";
import { startAutomation, runAutomationTick } from "./automation";

// Start the automation engine when the server loads
startAutomation();

type Variables = {
  user: typeof schema.user.$inferSelect | null;
  session: typeof schema.session.$inferSelect | null;
};

const app = new Hono<{ Variables: Variables }>().basePath("api");

app.use(cors({ origin: "*" }));

// ── Auth passthrough ─────────────────────────────────────────────────
app.use("/auth/*", async (c, next) => {
  const url = new URL(c.req.raw.url);
  if (!url.pathname.startsWith("/api/auth")) return next();
  const auth = createAuth(url.origin);
  try {
    return await auth.handler(c.req.raw);
  } catch(e) {
    console.error("[auth]", e);
    return c.json({ error: "Auth error" }, 500);
  }
});

// ── Auth middleware ──────────────────────────────────────────────────
app.use("*", async (c, next) => {
  try {
    const baseURL = new URL(c.req.url).origin;
    const auth = createAuth(baseURL);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user?.id) {
      const [fullUser] = await database
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, session.user.id));
      c.set("user", fullUser ?? null);
    } else {
      c.set("user", null);
    }
    c.set("session", session?.session as any ?? null);
  } catch {
    c.set("user", null);
    c.set("session", null);
  }
  return next();
});

function db() {
  return database;
}

function requireAuth(c: any) {
  const u = c.get("user");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  return null;
}

function requireRole(c: any, roles: string[]) {
  const u = c.get("user");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  if (!roles.includes(u.role)) return c.json({ error: "Forbidden" }, 403);
  return null;
}

// ── Ping ─────────────────────────────────────────────────────────────
app.get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }, 200));

// ── One-time setup: create super admin if no users exist ─────────────
app.post("/setup", async (c) => {
  const users = await db().select().from(schema.user);
  if (users.length > 0) {
    return c.json({ error: "Setup already complete. Users already exist." }, 400);
  }
  const { name, email, password } = await c.req.json();
  if (!name || !email || !password) {
    return c.json({ error: "name, email and password required" }, 400);
  }
  const baseURL = new URL(c.req.url).origin;
  const auth = createAuth(baseURL);
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    if (result?.user?.id) {
      await db().update(schema.user)
        .set({ role: "super_admin" })
        .where(eq(schema.user.id, result.user.id));
    }
    return c.json({ success: true, message: "Super admin created", userId: result?.user?.id }, 200);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Failed" }, 400);
  }
});

// ── Current user ─────────────────────────────────────────────────────
app.get("/me", (c) => {
  const u = c.get("user");
  if (!u) return c.json({ user: null }, 200);
  return c.json({ user: u }, 200);
});

// ── Users CRUD (super_admin / admin only) ────────────────────────────
app.get("/users", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const users = await db().select().from(schema.user).orderBy(desc(schema.user.createdAt));
  return c.json({ users }, 200);
});

app.post("/users", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const { name, email, password, role, phone, department } = await c.req.json();
  if (!name || !email || !password) return c.json({ error: "name, email, password required" }, 400);

  const baseURL = new URL(c.req.url).origin;
  const auth = createAuth(baseURL);
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    if (result?.user?.id) {
      await db().update(schema.user)
        .set({ role: role ?? "viewer", phone, department })
        .where(eq(schema.user.id, result.user.id));
    }
    return c.json({ success: true, userId: result?.user?.id }, 200);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Failed to create user" }, 400);
  }
});

app.put("/users/:id", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const id = c.req.param("id");
  const currentUser = c.get("user");
  const body = await c.req.json();

  if (body.role && currentUser?.role !== "super_admin") {
    delete body.role;
  }

  const allowed = ["name", "phone", "department", "isActive", "role"];
  const update: any = {};
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }
  update.updatedAt = new Date();

  await db().update(schema.user).set(update).where(eq(schema.user.id, id));
  return c.json({ success: true }, 200);
});

app.delete("/users/:id", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const id = c.req.param("id");
  const currentUser = c.get("user");
  if (id === currentUser?.id) return c.json({ error: "Cannot delete yourself" }, 400);
  await db().delete(schema.user).where(eq(schema.user.id, id));
  return c.json({ success: true }, 200);
});

// ── Leads ────────────────────────────────────────────────────────────
app.get("/leads", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const leads = await db().select().from(schema.lead).orderBy(desc(schema.lead.createdAt));
  return c.json({ leads }, 200);
});

async function maybeSendStage1(leadId: string) {
  try {
    const [cfg] = await db().select().from(schema.workflowConfig);
    if (!cfg || (!cfg.stage1Auto && !cfg.autoMode)) return;
    const [lead] = await db().select().from(schema.lead).where(eq(schema.lead.id, leadId));
    if (!lead || lead.optedOut || lead.lastEmailAt) return;
    const email = stage1Email(lead.name, lead.business ?? "");
    await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
    await db().insert(schema.emailLog).values({
      id: crypto.randomUUID(), leadId: lead.id, stage: "stage1",
      subject: email.subject, sentBy: "auto", status: "sent",
    });
    await db().update(schema.lead)
      .set({ lastEmailAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.lead.id, leadId));
    console.log(`[automation] Stage 1 sent immediately to ${lead.email}`);
  } catch (e: any) {
    console.error(`[automation] Immediate stage 1 failed for lead ${leadId}:`, e.message);
  }
}

app.post("/leads", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await db().insert(schema.lead).values({ id, ...body });
  // Fire stage 1 immediately — don't await so the response is instant
  maybeSendStage1(id);
  return c.json({ success: true, id }, 200);
});

async function maybeSendStage5(leadId: string) {
  try {
    const [cfg] = await db().select().from(schema.workflowConfig);
    if (!cfg || (!cfg.stage5Auto && !cfg.autoMode)) return;
    const [lead] = await db().select().from(schema.lead).where(eq(schema.lead.id, leadId));
    if (!lead || lead.stage !== "booked" || !lead.demoDate || !lead.demoLink || lead.optedOut) return;
    const logs = await db().select().from(schema.emailLog).where(eq(schema.emailLog.leadId, leadId));
    if (logs.some(l => l.stage === "stage5")) return;
    const { stage5Email } = await import("./emails");
    const email = stage5Email(lead.name, lead.demoDate!, lead.demoLink!, "Masakhe Team");
    await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
    await db().insert(schema.emailLog).values({
      id: crypto.randomUUID(), leadId: lead.id, stage: "stage5",
      subject: email.subject, sentBy: "auto", status: "sent",
    });
    console.log(`[automation] Stage 5 sent immediately to ${lead.email}`);
  } catch (e: any) {
    console.error(`[automation] Immediate stage 5 failed for lead ${leadId}:`, e.message);
  }
}

app.put("/leads/:id", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;
  const id = c.req.param("id");
  const body = await c.req.json();
  await db().update(schema.lead).set({ ...body, updatedAt: new Date() }).where(eq(schema.lead.id, id));
  // If lead is being marked as booked with demo details, fire stage 5 confirmation
  if (body.stage === "booked") maybeSendStage5(id);
  return c.json({ success: true }, 200);
});

app.delete("/leads/:id", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  await db().delete(schema.lead).where(eq(schema.lead.id, c.req.param("id")));
  return c.json({ success: true }, 200);
});

// ── Email Send ────────────────────────────────────────────────────────
app.post("/email/send", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;

  const { leadId, stage } = await c.req.json();
  const [leadRow] = await db().select().from(schema.lead).where(eq(schema.lead.id, leadId));
  if (!leadRow) return c.json({ error: "Lead not found" }, 404);
  if (leadRow.optedOut) return c.json({ error: "Lead has opted out" }, 400);

  let emailData: { subject: string; html: string } | null = null;
  const slots = [
    "Monday, 28 Apr 2026 at 10:00 AM",
    "Tuesday, 29 Apr 2026 at 2:00 PM",
    "Wednesday, 30 Apr 2026 at 11:00 AM",
  ];

  const [savedTpl] = await db().select().from(schema.emailTemplate).where(eq(schema.emailTemplate.id, stage));

  if (savedTpl) {
    const body = savedTpl.bodyHtml
      .replace(/\{\{name\}\}/g, leadRow.name)
      .replace(/\{\{business\}\}/g, leadRow.business ?? "your business");
    emailData = { subject: savedTpl.subject, html: emailWrapper(body) };
  } else {
    switch (stage) {
      case "stage1": emailData = stage1Email(leadRow.name, leadRow.business ?? ""); break;
      case "stage2": emailData = stage2Email(leadRow.name, leadRow.business ?? ""); break;
      case "stage3": emailData = stage3Email(leadRow.name, slots); break;
      case "stage4_1": emailData = stage4Email(leadRow.name, 1); break;
      case "stage4_2": emailData = stage4Email(leadRow.name, 2); break;
      case "stage4_3": emailData = stage4Email(leadRow.name, 3); break;
      case "stage5":
        emailData = stage5Email(leadRow.name, leadRow.demoDate ?? "TBD", leadRow.demoLink ?? "https://meet.google.com/");
        break;
      case "reminder24":
        emailData = demoReminderEmail(leadRow.name, leadRow.demoDate ?? "TBD", leadRow.demoLink ?? "https://meet.google.com/", 24);
        break;
      case "reminder1":
        emailData = demoReminderEmail(leadRow.name, leadRow.demoDate ?? "TBD", leadRow.demoLink ?? "https://meet.google.com/", 1);
        break;
      default: return c.json({ error: "Unknown stage" }, 400);
    }
  }

  try {
    await sendEmail({
      to: leadRow.email,
      subject: emailData!.subject,
      html: emailData!.html,
    });

    await db().insert(schema.emailLog).values({
      id: crypto.randomUUID(),
      leadId: leadRow.id,
      stage,
      subject: emailData!.subject,
      sentBy: c.get("user")?.id ?? "auto",
      status: "sent",
    });

    const stageMap: Record<string, string> = {
      stage1: "initial_contact",
      stage2: "product_intro",
      stage3: "demo_scheduling",
      stage4_1: "follow_up",
      stage4_2: "follow_up",
      stage4_3: "follow_up",
      stage5: "booked",
    };
    const newStage = stageMap[stage];
    if (newStage) {
      await db().update(schema.lead)
        .set({ stage: newStage as any, lastEmailAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.lead.id, leadId));
    }

    return c.json({ success: true }, 200);
  } catch (e: any) {
    await db().insert(schema.emailLog).values({
      id: crypto.randomUUID(),
      leadId: leadRow.id,
      stage,
      subject: emailData!.subject,
      sentBy: c.get("user")?.id ?? "auto",
      status: "failed",
      error: e?.message,
    });
    return c.json({ error: "Email failed: " + e?.message }, 500);
  }
});

// ── Email preview ─────────────────────────────────────────────────────
app.get("/email/preview/:stage", async (c) => {
  const stage = c.req.param("stage");
  const sampleSlots = ["Mon 28 Apr at 10:00 AM", "Tue 29 Apr at 2:00 PM", "Wed 30 Apr at 11:00 AM"];
  const [savedTpl] = await db().select().from(schema.emailTemplate).where(eq(schema.emailTemplate.id, stage));
  if (savedTpl) {
    const body = savedTpl.bodyHtml.replace(/\{\{name\}\}/g, "Thabo").replace(/\{\{business\}\}/g, "TechBuild Solutions");
    return new Response(emailWrapper(body), { headers: { "Content-Type": "text/html" } });
  }
  let emailData: { subject: string; html: string } | null = null;
  switch (stage) {
    case "stage1": emailData = stage1Email("Thabo", "TechBuild Solutions"); break;
    case "stage2": emailData = stage2Email("Thabo", "TechBuild Solutions"); break;
    case "stage3": emailData = stage3Email("Thabo", sampleSlots); break;
    case "stage4_1": emailData = stage4Email("Thabo", 1); break;
    case "stage4_2": emailData = stage4Email("Thabo", 2); break;
    case "stage4_3": emailData = stage4Email("Thabo", 3); break;
    case "stage5": emailData = stage5Email("Thabo", "Mon 28 Apr at 10:00 AM", "https://meet.google.com/abc-defg-hij"); break;
    case "reminder24": emailData = demoReminderEmail("Thabo", "Mon 28 Apr at 10:00 AM", "https://meet.google.com/abc-defg-hij", 24); break;
    case "reminder1": emailData = demoReminderEmail("Thabo", "Mon 28 Apr at 10:00 AM", "https://meet.google.com/abc-defg-hij", 1); break;
    default: return c.json({ error: "Unknown stage" }, 404);
  }
  return new Response(emailData!.html, { headers: { "Content-Type": "text/html" } });
});

// ── Email logs ────────────────────────────────────────────────────────
app.get("/email/logs", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const logs = await db().select().from(schema.emailLog).orderBy(desc(schema.emailLog.sentAt)).limit(100);
  return c.json({ logs }, 200);
});

// ── Workflow config ────────────────────────────────────────────────────
app.get("/workflow/config", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  let [config] = await db().select().from(schema.workflowConfig);
  if (!config) {
    await db().insert(schema.workflowConfig).values({ id: "default" });
    [config] = await db().select().from(schema.workflowConfig);
  }
  return c.json({ config }, 200);
});

app.put("/workflow/config", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const body = await c.req.json();
  const [existing] = await db().select().from(schema.workflowConfig);
  if (existing) {
    await db().update(schema.workflowConfig).set({ ...body, updatedAt: new Date() }).where(eq(schema.workflowConfig.id, "default"));
  } else {
    await db().insert(schema.workflowConfig).values({ id: "default", ...body });
  }
  return c.json({ success: true }, 200);
});

// ── Automation manual trigger ─────────────────────────────────────────
app.post("/automation/run", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  try {
    await runAutomationTick();
    return c.json({ success: true, message: "Automation tick completed" }, 200);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Automation failed" }, 500);
  }
});

// ── Google Sheets proxy ───────────────────────────────────────────────
app.get("/sheets/fetch", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;
  const url = c.req.query("url");
  if (!url) return c.json({ error: "url param required" }, 400);
  try {
    const res = await fetch(decodeURIComponent(url), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return c.json({ error: `Upstream error ${res.status}` }, 502);
    const csv = await res.text();
    return new Response(csv, { headers: { "Content-Type": "text/csv" } });
  } catch (e: any) {
    return c.json({ error: "Fetch failed: " + e?.message }, 502);
  }
});

// ── Bulk lead import ──────────────────────────────────────────────────
app.post("/leads/bulk", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;
  const { leads } = await c.req.json() as { leads: any[] };
  if (!Array.isArray(leads) || leads.length === 0) {
    return c.json({ error: "leads array required" }, 400);
  }
  const results = { success: 0, failed: 0, errors: [] as string[] };
  const createdIds: string[] = [];
  for (const lead of leads) {
    try {
      const id = crypto.randomUUID();
      await db().insert(schema.lead).values({ id, ...lead });
      createdIds.push(id);
      results.success++;
    } catch (e: any) {
      results.failed++;
      results.errors.push(e?.message ?? "Unknown error");
    }
  }
  // Fire stage 1 for all successfully created leads (non-blocking)
  for (const id of createdIds) maybeSendStage1(id);
  return c.json(results, 200);
});

// ── Email Templates ───────────────────────────────────────────────────
app.get("/email/templates", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const templates = await db().select().from(schema.emailTemplate);
  return c.json({ templates }, 200);
});

app.put("/email/templates/:stageId", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const stageId = c.req.param("stageId");
  const body = await c.req.json() as any;
  const [existing] = await db().select().from(schema.emailTemplate).where(eq(schema.emailTemplate.id, stageId));
  if (existing) {
    await db().update(schema.emailTemplate)
      .set({ subject: body.subject, bodyHtml: body.bodyHtml, updatedAt: new Date() })
      .where(eq(schema.emailTemplate.id, stageId));
  } else {
    await db().insert(schema.emailTemplate).values({
      id: stageId,
      stageId,
      name: stageId,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      isActive: true,
    });
  }
  return c.json({ success: true }, 200);
});

// ── Lead Notes ────────────────────────────────────────────────────────
app.get("/leads/:id/notes", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const notes = await db()
    .select()
    .from(schema.leadNote)
    .where(eq(schema.leadNote.leadId, c.req.param("id")))
    .orderBy(desc(schema.leadNote.createdAt));
  return c.json({ notes }, 200);
});

app.post("/leads/:id/notes", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const { body } = await c.req.json();
  if (!body?.trim()) return c.json({ error: "body required" }, 400);
  const u = c.get("user");
  const id = crypto.randomUUID();
  await db().insert(schema.leadNote).values({
    id,
    leadId: c.req.param("id"),
    body: body.trim(),
    authorId: u?.id ?? null,
    authorName: u?.name ?? "Unknown",
  });
  const [note] = await db().select().from(schema.leadNote).where(eq(schema.leadNote.id, id));
  return c.json({ note }, 200);
});

app.put("/leads/:id/notes/:noteId", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const { body } = await c.req.json();
  if (!body?.trim()) return c.json({ error: "body required" }, 400);
  const u = c.get("user");
  const [note] = await db().select().from(schema.leadNote).where(eq(schema.leadNote.id, c.req.param("noteId")));
  if (!note) return c.json({ error: "Not found" }, 404);
  // Only author or admin/super_admin can edit
  if (note.authorId !== u?.id && !["super_admin", "admin"].includes(u?.role ?? "")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await db()
    .update(schema.leadNote)
    .set({ body: body.trim(), updatedAt: new Date() })
    .where(eq(schema.leadNote.id, c.req.param("noteId")));
  return c.json({ success: true }, 200);
});

app.delete("/leads/:id/notes/:noteId", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const u = c.get("user");
  const [note] = await db().select().from(schema.leadNote).where(eq(schema.leadNote.id, c.req.param("noteId")));
  if (!note) return c.json({ error: "Not found" }, 404);
  if (note.authorId !== u?.id && !["super_admin", "admin"].includes(u?.role ?? "")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await db().delete(schema.leadNote).where(eq(schema.leadNote.id, c.req.param("noteId")));
  return c.json({ success: true }, 200);
});

// ── Stats ─────────────────────────────────────────────────────────────
app.get("/stats", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const leads = await db().select().from(schema.lead);
  const logs = await db().select().from(schema.emailLog);
  const users = await db().select().from(schema.user);

  const stats = {
    totalLeads: leads.length,
    booked: leads.filter(l => l.stage === "booked" || l.stage === "completed").length,
    inProgress: leads.filter(l => !["booked","completed","opted_out"].includes(l.stage)).length,
    optedOut: leads.filter(l => l.optedOut).length,
    emailsSent: logs.filter(l => l.status === "sent").length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    byStage: {
      initial_contact: leads.filter(l => l.stage === "initial_contact").length,
      product_intro: leads.filter(l => l.stage === "product_intro").length,
      demo_scheduling: leads.filter(l => l.stage === "demo_scheduling").length,
      follow_up: leads.filter(l => l.stage === "follow_up").length,
      booked: leads.filter(l => l.stage === "booked").length,
      completed: leads.filter(l => l.stage === "completed").length,
    },
  };
  return c.json({ stats }, 200);
});

// ── WhatsApp routes ─────────────────────────────────────────────────
app.get("/whatsapp/my-number", (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const u = c.get("user");
  return c.json({ whatsappNumber: u?.whatsappNumber ?? null });
});

app.put("/whatsapp/my-number", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const u = c.get("user");
  const { whatsappNumber } = await c.req.json();
  await db().update(schema.user).set({ whatsappNumber }).where(eq(schema.user.id, u!.id));
  return c.json({ ok: true });
});

app.post("/whatsapp/log", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const u = c.get("user");
  const { leadId, toNumber, message, fromNumber } = await c.req.json();
  const id = crypto.randomUUID();
  await db().insert(schema.whatsappLog).values({
    id,
    leadId,
    sentById: u!.id,
    sentByName: u!.name,
    fromNumber,
    toNumber,
    message,
  });
  return c.json({ ok: true });
});

app.get("/leads/:id/whatsapp", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const logs = await db()
    .select()
    .from(schema.whatsappLog)
    .where(eq(schema.whatsappLog.leadId, c.req.param("id")))
    .orderBy(desc(schema.whatsappLog.sentAt));
  return c.json({ logs });
});

export default app;
export type AppType = typeof app;
