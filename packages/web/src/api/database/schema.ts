import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Better Auth tables ──────────────────────────────────────────────
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  // Custom fields
  role: text("role", { enum: ["super_admin", "admin", "agent", "viewer"] }).notNull().default("viewer"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  phone: text("phone"),
  department: text("department"),
  whatsappNumber: text("whatsapp_number"), // E.164 format e.g. +27821234567
});


export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ── Leads ────────────────────────────────────────────────────────────
export const lead = sqliteTable("lead", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  business: text("business"),
  source: text("source").default("manual"),
  stage: text("stage", {
    enum: ["initial_contact", "product_intro", "demo_scheduling", "follow_up", "booked", "completed", "opted_out"],
  }).notNull().default("initial_contact"),
  assignedTo: text("assigned_to").references(() => user.id),
  notes: text("notes"),
  followUpCount: integer("follow_up_count").notNull().default(0),
  demoDate: text("demo_date"),
  demoLink: text("demo_link"),
  lastEmailAt: integer("last_email_at", { mode: "timestamp" }),
  optedOut: integer("opted_out", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ── Email Log ────────────────────────────────────────────────────────
export const emailLog = sqliteTable("email_log", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => lead.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  subject: text("subject").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  sentBy: text("sent_by"), // 'auto' or user id
  status: text("status", { enum: ["sent", "failed", "scheduled"] }).notNull().default("sent"),
  error: text("error"),
});

// ── Email Templates ──────────────────────────────────────────────────
export const emailTemplate = sqliteTable("email_template", {
  id: text("id").primaryKey(), // e.g. "stage1_v1", "stage1_v2"
  stageId: text("stage_id").notNull(), // e.g. "stage1", "stage4_1"
  name: text("name").notNull(), // display name
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(), // inner content only (injected into emailWrapper)
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ── Lead Notes ───────────────────────────────────────────────────────
export const leadNote = sqliteTable("lead_note", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => lead.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  authorId: text("author_id"),
  authorName: text("author_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ── WhatsApp Log ─────────────────────────────────────────────────────
export const whatsappLog = sqliteTable("whatsapp_log", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().references(() => lead.id, { onDelete: "cascade" }),
  sentById: text("sent_by_id").references(() => user.id),
  sentByName: text("sent_by_name"),
  fromNumber: text("from_number"),
  toNumber: text("to_number"),
  message: text("message").notNull(),
  sentAt: integer("sent_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ── Workflow Config ──────────────────────────────────────────────────
export const workflowConfig = sqliteTable("workflow_config", {
  id: text("id").primaryKey().default("default"),
  autoMode: integer("auto_mode", { mode: "boolean" }).notNull().default(false),
  stage1Auto: integer("stage1_auto", { mode: "boolean" }).notNull().default(true),
  stage2Auto: integer("stage2_auto", { mode: "boolean" }).notNull().default(true),
  stage3Auto: integer("stage3_auto", { mode: "boolean" }).notNull().default(false),
  stage4Auto: integer("stage4_auto", { mode: "boolean" }).notNull().default(true),
  stage5Auto: integer("stage5_auto", { mode: "boolean" }).notNull().default(false),
  businessHoursOnly: integer("business_hours_only", { mode: "boolean" }).notNull().default(true),
  followUpInterval: integer("follow_up_interval").notNull().default(24),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
