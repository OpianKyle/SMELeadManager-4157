import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, desc, or, isNull, inArray, sql, and } from "drizzle-orm";
import * as schema from "./database/schema";
import { database } from "./database";
import { createAuth } from "./auth";
import {
  stage1Email, stage2Email, stage3Email, stage4Email, stage5Email, demoReminderEmail, emailWrapper,
  CAMPAIGN_EMAILS,
  attempt1Email, attempt2Email, finalAttemptEmail, callbackConfirmEmail,
  onboardingReminderEmail, missedAppointmentEmail, onboardingCompleteEmail,
} from "./emails";
import { sendEmail } from "./mailer";
import { startAutomation, runAutomationTick } from "./automation";
import googleRoutes from "./google";

// Start the automation engine when the server loads
startAutomation();

// ── DB migrations: ensure new columns exist ───────────────────────────
async function runMigrations() {
  const stmts = [
    "ALTER TABLE `user` ADD COLUMN `manager_id` VARCHAR(191) NULL",
    "ALTER TABLE `lead` ADD COLUMN `created_by` VARCHAR(191) NULL",
    "ALTER TABLE `lead` ADD COLUMN `assigned_to` VARCHAR(191) NULL",
    "ALTER TABLE `user` ADD COLUMN `permissions` VARCHAR(1000) NULL",
    `CREATE TABLE IF NOT EXISTS \`activity_log\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`user_id\` VARCHAR(191),
      \`user_name\` VARCHAR(255),
      \`user_role\` VARCHAR(50),
      \`action\` VARCHAR(100) NOT NULL,
      \`entity\` VARCHAR(50),
      \`entity_id\` VARCHAR(191),
      \`details\` TEXT,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS \`media_file\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`original_name\` VARCHAR(500) NOT NULL,
      \`file_name\` VARCHAR(500) NOT NULL,
      \`mime_type\` VARCHAR(100) NOT NULL,
      \`size\` INT NOT NULL,
      \`category\` VARCHAR(50),
      \`uploaded_by\` VARCHAR(191),
      \`uploaded_by_name\` VARCHAR(255),
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS \`email_campaign_step\` (
      \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
      \`step_number\` INT NOT NULL,
      \`subject\` VARCHAR(500) NOT NULL,
      \`body_html\` TEXT NOT NULL,
      \`delay_days\` INT NOT NULL DEFAULT 2,
      \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`step_number_unique\` (\`step_number\`)
    )`,
  ];
  for (const stmt of stmts) {
    try {
      await database.execute(sql.raw(stmt));
    } catch (e: any) {
      if (e?.code !== "ER_DUP_FIELDNAME") console.warn("[migration]", e?.message);
    }
  }

  // Seed campaign emails if not present (use parameterised insert to handle special chars)
  for (const email of CAMPAIGN_EMAILS) {
    try {
      await database.insert(schema.emailCampaignStep).values({
        id: crypto.randomUUID(),
        stepNumber: email.stepNumber,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        delayDays: email.delayDays,
        enabled: true,
      });
    } catch (e: any) {
      // ER_DUP_ENTRY means the row already exists — skip silently
      if (e?.code !== "ER_DUP_ENTRY") console.warn("[seed] campaign step", email.stepNumber, e?.message);
    }
  }

  // One-time migration: update step 1 to the new onboarding call email.
  // Only applies if the row still has the old subject so manual edits are never overwritten.
  try {
    const step1 = CAMPAIGN_EMAILS.find(e => e.stepNumber === 1);
    if (step1) {
      await database.update(schema.emailCampaignStep)
        .set({ subject: step1.subject, bodyHtml: step1.bodyHtml })
        .where(and(
          eq(schema.emailCampaignStep.stepNumber, 1),
          eq(schema.emailCampaignStep.subject, "One platform. Everything your SMME needs.")
        ));
    }
  } catch (e: any) {
    console.warn("[migration] step1 content update:", e?.message);
  }
}
runMigrations();

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

async function logActivity(opts: {
  user: any;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, any>;
}) {
  try {
    await database.insert(schema.activityLog).values({
      id: crypto.randomUUID(),
      userId: opts.user?.id ?? null,
      userName: opts.user?.name ?? "System",
      userRole: opts.user?.role ?? null,
      action: opts.action,
      entity: opts.entity ?? null,
      entityId: opts.entityId ?? null,
      details: opts.details ? JSON.stringify(opts.details) : null,
    });
  } catch (e) {
    console.error("[activity_log] Failed to write log:", e);
  }
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

// ── Agents list for lead assignment ──────────────────────────────────
app.get("/users/agents", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const u = c.get("user")!;
  let agents;
  if (u.role === "admin") {
    // Admins see all agents so that any agent with assigned leads is visible in dropdowns/filters
    agents = await db().select({ id: schema.user.id, name: schema.user.name, role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.role, "agent"));
  } else {
    agents = await db().select({ id: schema.user.id, name: schema.user.name, role: schema.user.role })
      .from(schema.user)
      .where(inArray(schema.user.role, ["agent", "admin"]));
  }
  return c.json({ agents }, 200);
});

// ── Users CRUD (super_admin / admin only) ────────────────────────────
app.get("/users", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const u = c.get("user")!;
  let users;
  if (u.role === "admin") {
    users = await db().select().from(schema.user)
      .where(eq(schema.user.managerId, u.id))
      .orderBy(desc(schema.user.createdAt));
  } else {
    users = await db().select().from(schema.user).orderBy(desc(schema.user.createdAt));
  }
  return c.json({ users }, 200);
});

app.post("/users", async (c) => {
  const currentUser = c.get("user")!;
  const callerIsAdmin = currentUser.role === "admin";
  const callerIsSuperAdmin = currentUser.role === "super_admin";
  if (!callerIsAdmin && !callerIsSuperAdmin) return c.json({ error: "Forbidden" }, 403);
  const { name, email, role, phone, department, whatsappNumber } = await c.req.json();
  if (!name || !email) return c.json({ error: "name and email required" }, 400);
  const assignedRole = callerIsAdmin ? "agent" : (role ?? "admin");
  const managerId = callerIsAdmin ? currentUser.id : null;
  const baseURL = new URL(c.req.url).origin;
  const auth = createAuth(baseURL);
  // Generate a secure random temporary password — user will set their own via invite email
  const tempPassword = crypto.randomUUID() + "-" + crypto.randomUUID() + "-Tmp!";
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password: tempPassword } });
    if (result?.user?.id) {
      await db().update(schema.user)
        .set({ role: assignedRole as any, phone, department, whatsappNumber, ...(managerId ? { managerId } : {}) })
        .where(eq(schema.user.id, result.user.id));
      // Generate a password reset token directly and send invite email ourselves
      try {
        // Token must be 24 chars; identifier must be "reset-password:<token>"; value must be userId
        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await db().insert(schema.verification).values({
          id: crypto.randomUUID(),
          identifier: `reset-password:${token}`,
          value: result.user.id,
          expiresAt,
        });
        const resetUrl = `${baseURL}/reset-password?token=${token}`;
        const referralUrl = `https://masakheportal.co.za/register?ref=${result.user.id}`;
        const showReferral = assignedRole === "agent" || assignedRole === "admin";
        await sendEmail({
          to: email,
          subject: "Set your Masakhe Lead Manager password",
          html: `
            <div style="font-family:'Open Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
              <div style="background:#0f326b;border-radius:3px;padding:20px 24px;margin-bottom:24px;">
                <p style="font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;margin:0;">Masakhe Lead Manager</p>
              </div>
              <h2 style="color:#0f326b;margin:0 0 16px;">Set your password</h2>
              <p style="color:#192943;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Hi ${name},<br><br>
                An account has been created for you on Masakhe Lead Manager.
                Click the button below to set your password and log in.
                This link expires in 24 hours.
              </p>
              <a href="${resetUrl}" style="
                display:inline-block;background:#118849;color:#ffffff;
                font-size:14px;font-weight:700;text-decoration:none;
                padding:13px 28px;border-radius:3px;
              ">Set Password →</a>
              <p style="color:#9eafc2;font-size:11px;margin:10px 0 0;line-height:1.5;">
                ⚠️ This button can only be used once. Once you've set your password, use the sign-in page going forward.
              </p>
              ${showReferral ? `
              <div style="margin-top:28px;padding:20px;background:#f0f7ff;border-radius:4px;border-left:4px solid #0f326b;">
                <p style="font-family:'Open Sans',Arial,sans-serif;font-size:13px;font-weight:700;color:#0f326b;margin:0 0 8px;">Your Referral Link</p>
                <p style="font-family:'Open Sans',Arial,sans-serif;font-size:13px;color:#192943;margin:0 0 12px;line-height:1.5;">
                  Share this link with prospects to track sign-ups directly to your account. This link is permanent and can be shared as many times as you like:
                </p>
                <a href="${referralUrl}" style="
                  display:block;word-break:break-all;color:#118849;font-size:13px;
                  font-weight:700;text-decoration:none;
                ">${referralUrl}</a>
              </div>` : ""}
              <p style="color:#5e708d;font-size:12px;margin:24px 0 0;line-height:1.5;">
                If you were not expecting this email, you can safely ignore it.
              </p>
              <p style="color:#9eafc2;font-size:11px;margin:16px 0 0;">
                © ${new Date().getFullYear()} Masakhe Group (Pty) Ltd
              </p>
            </div>
          `,
        });
        console.log(`[invite] Sent invite email to ${email}`);
      } catch (emailErr: any) {
        console.error("[invite] Failed to send invite email:", emailErr?.message);
      }
      logActivity({ user: currentUser, action: "user_created", entity: "user", entityId: result.user.id, details: { name, email, role: assignedRole } });
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
  if (currentUser?.role === "super_admin") allowed.push("permissions");
  const update: any = {};
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }
  update.updatedAt = new Date();

  await db().update(schema.user).set(update).where(eq(schema.user.id, id));
  logActivity({ user: currentUser, action: "user_updated", entity: "user", entityId: id, details: update });
  return c.json({ success: true }, 200);
});

app.delete("/users/:id", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const id = c.req.param("id");
  const currentUser = c.get("user");
  if (id === currentUser?.id) return c.json({ error: "Cannot delete yourself" }, 400);
  const [target] = await db().select().from(schema.user).where(eq(schema.user.id, id));
  if (!target) return c.json({ error: "User not found" }, 404);
  // Clear FK references before deleting so constraints don't block the delete
  await db().update(schema.lead).set({ assignedTo: null }).where(eq(schema.lead.assignedTo, id));
  await db().update(schema.user).set({ managerId: null }).where(eq(schema.user.managerId, id));
  await db().delete(schema.user).where(eq(schema.user.id, id));
  logActivity({ user: currentUser, action: "user_deleted", entity: "user", entityId: id, details: { name: target?.name, email: target?.email } });
  return c.json({ success: true }, 200);
});

app.post("/users/:id/send-reset", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const id = c.req.param("id");
  const currentUser = c.get("user");
  const [target] = await db().select().from(schema.user).where(eq(schema.user.id, id));
  if (!target) return c.json({ error: "User not found" }, 404);
  const baseURL = new URL(c.req.url).origin;
  try {
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db().insert(schema.verification).values({
      id: crypto.randomUUID(),
      identifier: `reset-password:${token}`,
      value: target.id,
      expiresAt,
    });
    const resetUrl = `${baseURL}/reset-password?token=${token}`;
    const referralUrl = `https://masakheportal.co.za/register?ref=${target.id}`;
    const showReferral = target.role === "agent" || target.role === "admin";
    await sendEmail({
      to: target.email,
      subject: "Reset your Masakhe Lead Manager password",
      html: `
        <div style="font-family:'Open Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:#0f326b;border-radius:3px;padding:20px 24px;margin-bottom:24px;">
            <p style="font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;margin:0;">Masakhe Lead Manager</p>
          </div>
          <h2 style="color:#0f326b;margin:0 0 16px;">Reset your password</h2>
          <p style="color:#192943;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Hi ${target.name || target.email},<br><br>
            Your administrator has sent you a password reset link.
            Click the button below to set a new password and log in.
            This link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="
            display:inline-block;background:#118849;color:#ffffff;
            font-size:14px;font-weight:700;text-decoration:none;
            padding:13px 28px;border-radius:3px;
          ">Reset Password →</a>
          ${showReferral ? `
          <div style="margin-top:32px;padding:20px;background:#f0f7ff;border-radius:4px;border-left:4px solid #0f326b;">
            <p style="font-family:'Open Sans',Arial,sans-serif;font-size:13px;font-weight:700;color:#0f326b;margin:0 0 8px;">Your Referral Link</p>
            <p style="font-family:'Open Sans',Arial,sans-serif;font-size:13px;color:#192943;margin:0 0 12px;line-height:1.5;">
              Share this link with prospects to track sign-ups directly to your account:
            </p>
            <a href="${referralUrl}" style="
              display:block;word-break:break-all;color:#118849;font-size:13px;
              font-weight:700;text-decoration:none;
            ">${referralUrl}</a>
          </div>` : ""}
          <p style="color:#5e708d;font-size:12px;margin:24px 0 0;line-height:1.5;">
            If you were not expecting this email, you can safely ignore it.
          </p>
          <p style="color:#9eafc2;font-size:11px;margin:16px 0 0;">
            © ${new Date().getFullYear()} Masakhe Group (Pty) Ltd
          </p>
        </div>
      `,
    });
    logActivity({ user: currentUser, action: "user_reset_sent", entity: "user", entityId: id, details: { name: target.name, email: target.email } });
    return c.json({ success: true }, 200);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Failed to send reset email" }, 500);
  }
});

// ── Forgot password (self-service) ───────────────────────────────────
app.post("/forgot-password", async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "email required" }, 400);

  // Look up user – always return success so we don't reveal whether an email exists
  const [target] = await db().select().from(schema.user).where(eq(schema.user.email, email));
  if (!target) return c.json({ success: true }, 200);

  const baseURL = new URL(c.req.url).origin;
  try {
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db().insert(schema.verification).values({
      id: crypto.randomUUID(),
      identifier: `reset-password:${token}`,
      value: target.id,
      expiresAt,
    });
    const resetUrl = `${baseURL}/reset-password?token=${token}`;
    await sendEmail({
      to: target.email,
      subject: "Reset your Masakhe Lead Manager password",
      html: `
        <div style="font-family:'Open Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:#0f326b;border-radius:3px;padding:20px 24px;margin-bottom:24px;">
            <p style="font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;margin:0;">Masakhe Lead Manager</p>
          </div>
          <h2 style="color:#0f326b;margin:0 0 16px;">Reset your password</h2>
          <p style="color:#192943;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Hi ${target.name || target.email},<br><br>
            We received a request to reset your password.
            Click the button below to choose a new password.
            This link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="
            display:inline-block;background:#118849;color:#ffffff;
            font-size:14px;font-weight:700;text-decoration:none;
            padding:13px 28px;border-radius:3px;
          ">Reset Password →</a>
          <p style="color:#9eafc2;font-size:11px;margin:10px 0 0;line-height:1.5;">
            ⚠️ This link can only be used once and expires in 1 hour.
          </p>
          <p style="color:#5e708d;font-size:12px;margin:24px 0 0;line-height:1.5;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
          <p style="color:#9eafc2;font-size:11px;margin:16px 0 0;">
            © ${new Date().getFullYear()} Masakhe Group (Pty) Ltd
          </p>
        </div>
      `,
    });
  } catch (e: any) {
    console.error("[forgot-password] Failed to send reset email:", e?.message);
    return c.json({ error: "Failed to send reset email" }, 500);
  }
  return c.json({ success: true }, 200);
});

// ── Subscriptions (proxy to masakheportal.co.za) ─────────────────────
app.get("/subscriptions", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const secret = process.env.WEBHOOK_SECRET;
  try {
    const res = await fetch("https://masakheportal.co.za/api/external/subscriptions", {
      headers: { "x-webhook-secret": secret ?? "" },
    });
    if (!res.ok) return c.json({ error: `Portal returned ${res.status}` }, 502);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return c.json({ error: "Subscription data is temporarily unavailable. The portal endpoint did not return valid data." }, 502);
    }
    const data = await res.json();
    return c.json(data);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Failed to fetch subscriptions" }, 502);
  }
});

// ── Leads ────────────────────────────────────────────────────────────
app.get("/leads", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const u = c.get("user")!;

  const allUsers = await db()
    .select({ id: schema.user.id, name: schema.user.name, managerId: schema.user.managerId })
    .from(schema.user);
  const userMap = new Map(allUsers.map(au => [au.id, au.name]));

  let leads;
  if (u.role === "agent") {
    // Agent sees leads they created OR leads assigned to them
    leads = await db().select().from(schema.lead)
      .where(or(eq(schema.lead.createdBy, u.id), eq(schema.lead.assignedTo, u.id)))
      .orderBy(desc(schema.lead.createdAt));
  } else if (u.role === "admin") {
    // Distributor sees leads created by or assigned to themselves or any of their agents
    const agentRows = await db().select({ id: schema.user.id }).from(schema.user)
      .where(eq(schema.user.managerId, u.id));
    const scopeIds = [u.id, ...agentRows.map(a => a.id)];
    leads = await db().select().from(schema.lead)
      .where(or(
        inArray(schema.lead.createdBy, scopeIds),
        inArray(schema.lead.assignedTo, scopeIds)
      ))
      .orderBy(desc(schema.lead.createdAt));
  } else {
    leads = await db().select().from(schema.lead).orderBy(desc(schema.lead.createdAt));
  }

  const leadsWithCreator = leads.map(l => ({
    ...l,
    createdByName: l.createdBy ? (userMap.get(l.createdBy) ?? null) : null,
    assignedToName: l.assignedTo ? (userMap.get(l.assignedTo) ?? null) : null,
  }));
  return c.json({ leads: leadsWithCreator }, 200);
});

async function maybeSendStage1(leadId: string) {
  try {
    const [cfg] = await db().select().from(schema.workflowConfig);
    if (!cfg || (!cfg.stage1Auto && !cfg.autoMode)) return;
    const [lead] = await db().select().from(schema.lead).where(eq(schema.lead.id, leadId));
    if (!lead || lead.optedOut || lead.lastEmailAt) return;

    // Use the first enabled campaign step instead of the hardcoded stage1 email
    const steps = await db()
      .select()
      .from(schema.emailCampaignStep)
      .where(eq(schema.emailCampaignStep.enabled, true))
      .orderBy(schema.emailCampaignStep.stepNumber);
    const firstStep = steps[0];
    if (!firstStep) {
      console.warn(`[automation] No enabled campaign steps found — skipping stage 1 for ${lead.email}`);
      return;
    }

    const bodyHtml = firstStep.bodyHtml
      .replace(/\{\{name\}\}/g, lead.name)
      .replace(/\{\{business\}\}/g, lead.business ?? "your business");
    const subject = firstStep.subject
      .replace(/\{\{name\}\}/g, lead.name)
      .replace(/\{\{business\}\}/g, lead.business ?? "your business");

    // Mark lastEmailAt BEFORE sending to prevent race condition with automation tick
    await db().update(schema.lead)
      .set({ lastEmailAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.lead.id, leadId));
    await sendEmail({ to: lead.email, subject, html: emailWrapper(bodyHtml) });
    await db().insert(schema.emailLog).values({
      id: crypto.randomUUID(), leadId: lead.id, stage: `campaign_${firstStep.stepNumber}`,
      subject, sentBy: "auto", status: "sent",
    });
    console.log(`[automation] Campaign step 1 sent immediately to ${lead.email}`);
  } catch (e: any) {
    console.error(`[automation] Immediate stage 1 failed for lead ${leadId}:`, e.message);
  }
}

app.post("/leads", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;
  const u = c.get("user")!;
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await db().insert(schema.lead).values({ id, createdBy: u.id, ...body });
  logActivity({ user: u, action: "lead_created", entity: "lead", entityId: id, details: { name: body.name, email: body.email, business: body.business } });
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
  const u = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const [before] = await db().select().from(schema.lead).where(eq(schema.lead.id, id));
  await db().update(schema.lead).set({ ...body, updatedAt: new Date() }).where(eq(schema.lead.id, id));
  if (body.stage && before?.stage !== body.stage) {
    logActivity({ user: u, action: "lead_stage_changed", entity: "lead", entityId: id, details: { leadName: before?.name, from: before?.stage, to: body.stage } });
  } else if (body.optedOut !== undefined) {
    logActivity({ user: u, action: body.optedOut ? "lead_opted_out" : "lead_opted_in", entity: "lead", entityId: id, details: { leadName: before?.name } });
  } else if ("assignedTo" in body) {
    const allUsers = await db().select({ id: schema.user.id, name: schema.user.name }).from(schema.user);
    const agentName = body.assignedTo ? (allUsers.find(u2 => u2.id === body.assignedTo)?.name ?? "Unknown") : null;
    logActivity({ user: u, action: "lead_assigned", entity: "lead", entityId: id, details: { leadName: before?.name, assignedTo: agentName } });
  } else {
    logActivity({ user: u, action: "lead_updated", entity: "lead", entityId: id, details: { leadName: before?.name, changes: Object.keys(body).join(", ") } });
  }
  // If lead is being marked as booked with demo details, fire stage 5 confirmation
  if (body.stage === "booked") maybeSendStage5(id);
  return c.json({ success: true }, 200);
});

app.delete("/leads/:id", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const u = c.get("user")!;
  const lid = c.req.param("id");
  const [target] = await db().select().from(schema.lead).where(eq(schema.lead.id, lid));
  await db().delete(schema.lead).where(eq(schema.lead.id, lid));
  logActivity({ user: u, action: "lead_deleted", entity: "lead", entityId: lid, details: { name: target?.name, email: target?.email } });
  return c.json({ success: true }, 200);
});

// ── Bulk assign leads ─────────────────────────────────────────────────
app.put("/leads/bulk-assign", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const u = c.get("user")!;
  const { leadIds, agentId } = await c.req.json() as { leadIds: string[]; agentId: string | null };
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return c.json({ error: "leadIds array required" }, 400);
  }
  const [agent] = agentId
    ? await db().select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, agentId))
    : [null];
  await db().update(schema.lead)
    .set({ assignedTo: agentId ?? null, updatedAt: new Date() })
    .where(inArray(schema.lead.id, leadIds));
  logActivity({ user: u, action: "leads_bulk_assigned", entity: "lead", details: { count: leadIds.length, agentId, agentName: agent?.name ?? null } });
  return c.json({ success: true, count: leadIds.length }, 200);
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
      case "attempt1": emailData = attempt1Email(leadRow.name); break;
      case "attempt2": emailData = attempt2Email(leadRow.name); break;
      case "final_attempt": emailData = finalAttemptEmail(leadRow.name); break;
      case "callback_confirm":
        emailData = callbackConfirmEmail(leadRow.name, leadRow.demoDate ?? "TBD", "", leadRow.phone ?? "");
        break;
      case "reminder24":
        emailData = onboardingReminderEmail(leadRow.name, leadRow.demoDate ?? "TBD", "", leadRow.phone ?? "", 24);
        break;
      case "reminder1":
        emailData = onboardingReminderEmail(leadRow.name, leadRow.demoDate ?? "TBD", "", leadRow.phone ?? "", 1);
        break;
      case "missed_appt":
        emailData = missedAppointmentEmail(leadRow.name, leadRow.demoDate ?? "the scheduled time");
        break;
      case "onboarding_complete": emailData = onboardingCompleteEmail(leadRow.name); break;
      // Legacy stages (kept for backward compatibility)
      case "stage1": emailData = stage1Email(leadRow.name, leadRow.business ?? ""); break;
      case "stage2": emailData = stage2Email(leadRow.name, leadRow.business ?? ""); break;
      case "stage3": emailData = stage3Email(leadRow.name, slots); break;
      case "stage4_1": emailData = stage4Email(leadRow.name, 1); break;
      case "stage4_2": emailData = stage4Email(leadRow.name, 2); break;
      case "stage4_3": emailData = stage4Email(leadRow.name, 3); break;
      case "stage5":
        emailData = stage5Email(leadRow.name, leadRow.demoDate ?? "TBD", leadRow.demoLink ?? "https://meet.google.com/");
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
      attempt1: "initial_contact",
      attempt2: "follow_up",
      final_attempt: "follow_up",
      callback_confirm: "follow_up",
      missed_appt: "follow_up",
      onboarding_complete: "completed",
      // Legacy
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

    logActivity({ user: c.get("user"), action: "email_sent", entity: "lead", entityId: leadId, details: { leadName: leadRow.name, stage, subject: emailData!.subject } });
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
    case "attempt1": emailData = attempt1Email("Thabo"); break;
    case "attempt2": emailData = attempt2Email("Thabo"); break;
    case "final_attempt": emailData = finalAttemptEmail("Thabo"); break;
    case "callback_confirm": emailData = callbackConfirmEmail("Thabo", "Mon 9 Jun at 10:00 AM", "10:00 AM", "+27 81 000 0000"); break;
    case "reminder24": emailData = onboardingReminderEmail("Thabo", "Mon 9 Jun 2026", "10:00 AM", "+27 81 000 0000", 24); break;
    case "reminder1": emailData = onboardingReminderEmail("Thabo", "Mon 9 Jun 2026", "10:00 AM", "+27 81 000 0000", 1); break;
    case "missed_appt": emailData = missedAppointmentEmail("Thabo", "Mon 9 Jun at 10:00 AM"); break;
    case "onboarding_complete": emailData = onboardingCompleteEmail("Thabo"); break;
    // Legacy
    case "stage1": emailData = stage1Email("Thabo", "TechBuild Solutions"); break;
    case "stage2": emailData = stage2Email("Thabo", "TechBuild Solutions"); break;
    case "stage3": emailData = stage3Email("Thabo", sampleSlots); break;
    case "stage4_1": emailData = stage4Email("Thabo", 1); break;
    case "stage4_2": emailData = stage4Email("Thabo", 2); break;
    case "stage4_3": emailData = stage4Email("Thabo", 3); break;
    case "stage5": emailData = stage5Email("Thabo", "Mon 28 Apr at 10:00 AM", "https://meet.google.com/abc-defg-hij"); break;
    default: return c.json({ error: "Unknown stage" }, 404);
  }
  return new Response(emailData!.html, { headers: { "Content-Type": "text/html" } });
});

// ── Email logs ────────────────────────────────────────────────────────
app.get("/email/logs", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const u = c.get("user")!;

  const cols = {
    id: schema.emailLog.id,
    leadId: schema.emailLog.leadId,
    stage: schema.emailLog.stage,
    subject: schema.emailLog.subject,
    sentAt: schema.emailLog.sentAt,
    sentBy: schema.emailLog.sentBy,
    status: schema.emailLog.status,
    error: schema.emailLog.error,
    leadName: schema.lead.name,
    leadEmail: schema.lead.email,
    leadBusiness: schema.lead.business,
  };

  if (u.role === "super_admin") {
    const logs = await db()
      .select(cols)
      .from(schema.emailLog)
      .leftJoin(schema.lead, eq(schema.emailLog.leadId, schema.lead.id))
      .orderBy(desc(schema.emailLog.sentAt))
      .limit(1000);
    return c.json({ logs }, 200);
  }

  let scopeUserIds = [u.id];
  if (u.role === "admin") {
    const agents = await db().select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.managerId, u.id));
    scopeUserIds = [u.id, ...agents.map(a => a.id)];
  }
  const scopedLeads = await db().select({ id: schema.lead.id }).from(schema.lead)
    .where(inArray(schema.lead.createdBy, scopeUserIds));
  if (scopedLeads.length === 0) return c.json({ logs: [] }, 200);
  const logs = await db()
    .select(cols)
    .from(schema.emailLog)
    .leftJoin(schema.lead, eq(schema.emailLog.leadId, schema.lead.id))
    .where(inArray(schema.emailLog.leadId, scopedLeads.map(l => l.id)))
    .orderBy(desc(schema.emailLog.sentAt))
    .limit(1000);
  return c.json({ logs }, 200);
});

// ── Resend all failed emails ───────────────────────────────────────────
app.post("/email/resend-failed", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;

  // Find leads that have failed emails but zero successful emails
  const failedLogs = await db()
    .select({ leadId: schema.emailLog.leadId })
    .from(schema.emailLog)
    .where(eq(schema.emailLog.status, "failed"));

  const sentLogs = await db()
    .select({ leadId: schema.emailLog.leadId })
    .from(schema.emailLog)
    .where(eq(schema.emailLog.status, "sent"));

  const sentLeadIds = new Set(sentLogs.map(l => l.leadId));
  const failedLeadIds = [...new Set(failedLogs.map(l => l.leadId))]
    .filter(id => !sentLeadIds.has(id));

  if (failedLeadIds.length === 0) return c.json({ queued: 0 }, 200);

  // Send sequentially in the background so the response is instant
  (async () => {
    const steps = await db()
      .select()
      .from(schema.emailCampaignStep)
      .where(eq(schema.emailCampaignStep.enabled, true))
      .orderBy(schema.emailCampaignStep.stepNumber);
    const firstStep = steps[0];
    if (!firstStep) return;

    for (const leadId of failedLeadIds) {
      try {
        const [lead] = await db().select().from(schema.lead).where(eq(schema.lead.id, leadId));
        if (!lead || lead.optedOut) continue;

        const bodyHtml = firstStep.bodyHtml
          .replace(/\{\{name\}\}/g, lead.name)
          .replace(/\{\{business\}\}/g, lead.business ?? "your business");
        const subject = firstStep.subject
          .replace(/\{\{name\}\}/g, lead.name)
          .replace(/\{\{business\}\}/g, lead.business ?? "your business");

        await db().update(schema.lead)
          .set({ lastEmailAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.lead.id, leadId));
        await sendEmail({ to: lead.email, subject, html: emailWrapper(bodyHtml) });
        await db().insert(schema.emailLog).values({
          id: crypto.randomUUID(), leadId: lead.id,
          stage: `campaign_${firstStep.stepNumber}`,
          subject, sentBy: "auto", status: "sent",
        });
        console.log(`[resend] Sent to ${lead.email}`);
      } catch (e: any) {
        console.error(`[resend] Failed for lead ${leadId}:`, e.message);
      }
    }
  })();

  return c.json({ queued: failedLeadIds.length }, 200);
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
  const u = c.get("user")!;
  const body = await c.req.json();
  const [existing] = await db().select().from(schema.workflowConfig);
  if (existing) {
    await db().update(schema.workflowConfig).set({ ...body, updatedAt: new Date() }).where(eq(schema.workflowConfig.id, "default"));
  } else {
    await db().insert(schema.workflowConfig).values({ id: "default", ...body });
  }
  logActivity({ user: u, action: "workflow_updated", entity: "workflow", details: body });
  return c.json({ success: true }, 200);
});

// ── Activity Logs ─────────────────────────────────────────────────────
app.get("/activity-logs", async (c) => {
  const err = requireRole(c, ["super_admin", "admin"]);
  if (err) return err;
  const u = c.get("user")!;
  let logs;
  if (u.role === "admin") {
    const teamMembers = await db().select({ id: schema.user.id }).from(schema.user)
      .where(eq(schema.user.managerId, u.id));
    const ids = [u.id, ...teamMembers.map(m => m.id)];
    logs = await db().select().from(schema.activityLog)
      .where(inArray(schema.activityLog.userId, ids))
      .orderBy(desc(schema.activityLog.createdAt)).limit(500);
  } else {
    logs = await db().select().from(schema.activityLog)
      .orderBy(desc(schema.activityLog.createdAt)).limit(500);
  }
  return c.json({ logs }, 200);
});

// ── Media Library ─────────────────────────────────────────────────────
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const CHUNKS_DIR  = path.join(process.cwd(), "public", "uploads", "_chunks");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(CHUNKS_DIR))  fs.mkdirSync(CHUNKS_DIR,  { recursive: true });

function getCategory(mime: string, name: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const ext = name.split(".").pop()?.toLowerCase();
  if (["csv","xlsx","xls","ods"].includes(ext ?? "")) return "sheet";
  if (["mp3","wav","ogg","aac","flac","m4a","wma","opus"].includes(ext ?? "")) return "audio";
  if (["mp4","mov","avi","mkv","webm","wmv","flv"].includes(ext ?? "")) return "video";
  return "other";
}

app.get("/media", async (c) => {
  const err = requireRole(c, ["super_admin", "admin", "agent"]);
  if (err) return err;
  const files = await db().select().from(schema.mediaFile).orderBy(desc(schema.mediaFile.createdAt));
  return c.json({ files }, 200);
});

app.post("/media", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const u = c.get("user")!;
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "No file provided" }, 400);
    const MAX = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX) return c.json({ error: "File too large (max 50 MB)" }, 400);
    const ext = file.name.split(".").pop() ?? "bin";
    const id = crypto.randomUUID();
    const fileName = `${id}.${ext}`;
    const dest = path.join(UPLOADS_DIR, fileName);
    const buf = await file.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buf));
    const category = getCategory(file.type, file.name);
    await db().insert(schema.mediaFile).values({
      id, originalName: file.name, fileName,
      mimeType: file.type || "application/octet-stream",
      size: file.size, category,
      uploadedBy: u.id, uploadedByName: u.name,
    });
    return c.json({ success: true, id, fileName }, 200);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Upload failed" }, 500);
  }
});

// ── Chunked upload (for large files that exceed nginx body limit) ──────
app.post("/media/chunk", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const u = c.get("user")!;
  try {
    const formData  = await c.req.formData();
    const fileId      = formData.get("fileId")      as string;
    const chunkIndex  = parseInt(formData.get("chunkIndex")  as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const fileName    = formData.get("fileName")    as string;
    const mimeType    = formData.get("mimeType")    as string ?? "";
    const chunk       = formData.get("chunk")       as File | null;

    if (!fileId || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || !chunk) {
      return c.json({ error: "Missing required chunk fields" }, 400);
    }

    // Save this chunk to temp storage
    const chunkPath = path.join(CHUNKS_DIR, `${fileId}_${chunkIndex}`);
    fs.writeFileSync(chunkPath, Buffer.from(await chunk.arrayBuffer()));

    // Count received chunks
    const received = Array.from({ length: totalChunks }, (_, i) =>
      fs.existsSync(path.join(CHUNKS_DIR, `${fileId}_${i}`))
    ).filter(Boolean).length;

    if (received < totalChunks) {
      return c.json({ success: true, complete: false, received, total: totalChunks });
    }

    // All chunks received — assemble the file
    const ext = fileName.split(".").pop() ?? "bin";
    const finalFileName = `${fileId}.${ext}`;
    const dest = path.join(UPLOADS_DIR, finalFileName);
    const parts: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(CHUNKS_DIR, `${fileId}_${i}`);
      parts.push(fs.readFileSync(p));
      fs.unlinkSync(p);
    }
    fs.writeFileSync(dest, Buffer.concat(parts));

    const totalSize = fs.statSync(dest).size;
    const MAX = 200 * 1024 * 1024;
    if (totalSize > MAX) {
      fs.unlinkSync(dest);
      return c.json({ error: "File too large (max 200 MB)" }, 400);
    }

    const category = getCategory(mimeType, fileName);
    await db().insert(schema.mediaFile).values({
      id: fileId, originalName: fileName, fileName: finalFileName,
      mimeType: mimeType || "application/octet-stream",
      size: totalSize, category,
      uploadedBy: u.id, uploadedByName: u.name,
    });
    return c.json({ success: true, complete: true, id: fileId, fileName: finalFileName });
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Chunk upload failed" }, 500);
  }
});

app.delete("/media/:id", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const id = c.req.param("id");
  const [row] = await db().select().from(schema.mediaFile).where(eq(schema.mediaFile.id, id));
  if (row) {
    const filePath = path.join(UPLOADS_DIR, row.fileName);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    await db().delete(schema.mediaFile).where(eq(schema.mediaFile.id, id));
  }
  return c.json({ success: true }, 200);
});

// ── Campaign Steps ────────────────────────────────────────────────────
app.get("/campaign-steps", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const steps = await db().select().from(schema.emailCampaignStep)
    .orderBy(schema.emailCampaignStep.stepNumber);
  return c.json({ steps }, 200);
});

app.put("/campaign-steps/:id", async (c) => {
  const err = requireRole(c, ["super_admin"]);
  if (err) return err;
  const id = c.req.param("id");
  const body = await c.req.json();
  const update: Record<string, any> = {};
  if (body.delayDays !== undefined) update.delayDays = Math.max(0, parseInt(body.delayDays) || 0);
  if (body.enabled !== undefined) update.enabled = !!body.enabled;
  if (body.subject !== undefined && body.subject.trim()) update.subject = body.subject.trim();
  if (body.bodyHtml !== undefined && body.bodyHtml.trim()) update.bodyHtml = body.bodyHtml.trim();
  update.updatedAt = new Date();
  await db().update(schema.emailCampaignStep).set(update).where(eq(schema.emailCampaignStep.id, id));
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
  const u = c.get("user")!;
  const results = { success: 0, failed: 0, errors: [] as string[] };
  const createdIds: string[] = [];
  for (const lead of leads) {
    try {
      const id = crypto.randomUUID();
      await db().insert(schema.lead).values({ id, createdBy: u.id, ...lead });
      createdIds.push(id);
      results.success++;
    } catch (e: any) {
      results.failed++;
      results.errors.push(e?.message ?? "Unknown error");
    }
  }
  // Fire stage 1 for all successfully created leads sequentially in the background.
  // Sequential (not concurrent) to avoid overwhelming the SMTP server with simultaneous connections.
  (async () => {
    for (const id of createdIds) {
      await maybeSendStage1(id);
    }
  })();
  return c.json(results, 200);
});

// ── Email Templates ───────────────────────────────────────────────────
app.get("/email/templates/defaults", async (c) => {
  const err = requireAuth(c);
  if (err) return err;
  const PLACEHOLDER_NAME = "{{name}}";
  const PLACEHOLDER_BUSINESS = "{{business}}";
  const defaults = [
    { stageId: "attempt1",            ...attempt1Email(PLACEHOLDER_NAME) },
    { stageId: "attempt2",            ...attempt2Email(PLACEHOLDER_NAME) },
    { stageId: "final_attempt",       ...finalAttemptEmail(PLACEHOLDER_NAME) },
    { stageId: "callback_confirm",    ...callbackConfirmEmail(PLACEHOLDER_NAME, "{{demoDate}}", "", "{{phone}}") },
    { stageId: "reminder24",          ...onboardingReminderEmail(PLACEHOLDER_NAME, "{{demoDate}}", "", "{{phone}}", 24) },
    { stageId: "reminder1",           ...onboardingReminderEmail(PLACEHOLDER_NAME, "{{demoDate}}", "", "{{phone}}", 1) },
    { stageId: "missed_appt",         ...missedAppointmentEmail(PLACEHOLDER_NAME, "{{demoDate}}") },
    { stageId: "onboarding_complete", ...onboardingCompleteEmail(PLACEHOLDER_NAME) },
  ];
  return c.json({ defaults }, 200);
});

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
  const u = c.get("user")!;

  // Determine which leads are in scope for this user's role
  let leads;
  if (u.role === "super_admin") {
    leads = await db().select().from(schema.lead);
  } else if (u.role === "admin") {
    const agentRows = await db().select({ id: schema.user.id }).from(schema.user)
      .where(eq(schema.user.managerId, u.id));
    const scopeIds = [u.id, ...agentRows.map(a => a.id)];
    leads = await db().select().from(schema.lead)
      .where(inArray(schema.lead.createdBy, scopeIds));
  } else {
    leads = await db().select().from(schema.lead)
      .where(eq(schema.lead.createdBy, u.id));
  }

  const leadIds = leads.map(l => l.id);
  const logs = leadIds.length > 0
    ? await db().select().from(schema.emailLog).where(inArray(schema.emailLog.leadId, leadIds))
    : [];
  const users = u.role === "super_admin"
    ? await db().select().from(schema.user)
    : [];

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

// ── Portal Signup Webhook ─────────────────────────────────────────────
// Called by masakheportal.co.za when a visitor signs up via an agent's link.
// Payload: { name, email, phone?, business?, agentId, notes? }
// Header:  x-webhook-secret: <WEBHOOK_SECRET>
app.post("/webhooks/signup", async (c) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const incoming = c.req.header("x-webhook-secret");
    if (incoming !== secret) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { name, email, phone, business, agentId, notes } = body ?? {};

  if (!name || !email) {
    return c.json({ error: "name and email are required" }, 400);
  }

  // Resolve agent — agentId is optional; if provided it must match a real user
  let resolvedAgentId: string | null = null;
  if (agentId) {
    const [agent] = await db()
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, agentId));
    if (!agent) {
      return c.json({ error: `Agent not found: ${agentId}` }, 404);
    }
    resolvedAgentId = agent.id;
  }

  const id = crypto.randomUUID();
  await db().insert(schema.lead).values({
    id,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : undefined,
    business: business ? String(business).trim() : undefined,
    source: "portal_signup",
    notes: notes ? String(notes).trim() : undefined,
    createdBy: resolvedAgentId ?? undefined,
  });

  await logActivity({
    user: { id: resolvedAgentId, name: "Portal Webhook", role: "system" },
    action: "lead_created",
    entity: "lead",
    entityId: id,
    details: { name, email, source: "portal_signup", agentId: resolvedAgentId },
  });

  // Fire stage 1 automation immediately
  maybeSendStage1(id);

  return c.json({ success: true, leadId: id }, 201);
});

app.route("/google", googleRoutes);

export default app;
export type AppType = typeof app;
