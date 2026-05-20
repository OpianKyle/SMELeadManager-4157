import { mysqlTable, varchar, text, boolean, timestamp, int, mysqlEnum } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── Better Auth tables ──────────────────────────────────────────────
export const user = mysqlTable("user", {
  id: varchar("id", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  role: mysqlEnum("role", ["super_admin", "admin", "agent", "viewer"]).notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  phone: varchar("phone", { length: 50 }),
  department: varchar("department", { length: 255 }),
  whatsappNumber: varchar("whatsapp_number", { length: 50 }),
  managerId: varchar("manager_id", { length: 191 }),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 191 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 191 }).notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = mysqlTable("account", {
  id: varchar("id", { length: 191 }).primaryKey(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 191 }).notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: varchar("scope", { length: 255 }),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 191 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ── Leads ────────────────────────────────────────────────────────────
export const lead = mysqlTable("lead", {
  id: varchar("id", { length: 191 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  business: varchar("business", { length: 255 }),
  source: varchar("source", { length: 100 }).default("manual"),
  stage: mysqlEnum("stage", ["initial_contact", "product_intro", "demo_scheduling", "follow_up", "booked", "completed", "opted_out"]).notNull().default("initial_contact"),
  assignedTo: varchar("assigned_to", { length: 191 }).references(() => user.id),
  createdBy: varchar("created_by", { length: 191 }),
  notes: text("notes"),
  followUpCount: int("follow_up_count").notNull().default(0),
  demoDate: varchar("demo_date", { length: 100 }),
  demoLink: varchar("demo_link", { length: 512 }),
  lastEmailAt: timestamp("last_email_at"),
  optedOut: boolean("opted_out").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Email Log ────────────────────────────────────────────────────────
export const emailLog = mysqlTable("email_log", {
  id: varchar("id", { length: 191 }).primaryKey(),
  leadId: varchar("lead_id", { length: 191 }).notNull().references(() => lead.id, { onDelete: "cascade" }),
  stage: varchar("stage", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  sentAt: timestamp("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  sentBy: varchar("sent_by", { length: 191 }),
  status: mysqlEnum("status", ["sent", "failed", "scheduled"]).notNull().default("sent"),
  error: text("error"),
});

// ── Email Templates ──────────────────────────────────────────────────
export const emailTemplate = mysqlTable("email_template", {
  id: varchar("id", { length: 191 }).primaryKey(),
  stageId: varchar("stage_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Lead Notes ───────────────────────────────────────────────────────
export const leadNote = mysqlTable("lead_note", {
  id: varchar("id", { length: 191 }).primaryKey(),
  leadId: varchar("lead_id", { length: 191 }).notNull().references(() => lead.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  authorId: varchar("author_id", { length: 191 }),
  authorName: varchar("author_name", { length: 255 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── WhatsApp Log ─────────────────────────────────────────────────────
export const whatsappLog = mysqlTable("whatsapp_log", {
  id: varchar("id", { length: 191 }).primaryKey(),
  leadId: varchar("lead_id", { length: 191 }).notNull().references(() => lead.id, { onDelete: "cascade" }),
  sentById: varchar("sent_by_id", { length: 191 }).references(() => user.id),
  sentByName: varchar("sent_by_name", { length: 255 }),
  fromNumber: varchar("from_number", { length: 50 }),
  toNumber: varchar("to_number", { length: 50 }),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Google OAuth Tokens ──────────────────────────────────────────────
export const googleToken = mysqlTable("google_token", {
  userId: varchar("user_id", { length: 191 }).primaryKey().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: varchar("scope", { length: 512 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── Workflow Config ──────────────────────────────────────────────────
export const workflowConfig = mysqlTable("workflow_config", {
  id: varchar("id", { length: 50 }).primaryKey().default("default"),
  autoMode: boolean("auto_mode").notNull().default(false),
  stage1Auto: boolean("stage1_auto").notNull().default(true),
  stage2Auto: boolean("stage2_auto").notNull().default(true),
  stage3Auto: boolean("stage3_auto").notNull().default(false),
  stage4Auto: boolean("stage4_auto").notNull().default(true),
  stage5Auto: boolean("stage5_auto").notNull().default(false),
  businessHoursOnly: boolean("business_hours_only").notNull().default(true),
  followUpInterval: int("follow_up_interval").notNull().default(24),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
