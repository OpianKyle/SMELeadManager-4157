import { eq, and, lt, notInArray, isNull, or } from "drizzle-orm";
import { database } from "./database";
import * as schema from "./database/schema";
import { sendEmail } from "./mailer";
import {
  stage1Email, stage2Email, stage4Email, stage5Email, demoReminderEmail, emailWrapper,
} from "./emails";

const TICK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

// Track globally to avoid duplicate intervals on HMR reloads
const g = globalThis as any;

export function startAutomation() {
  if (g.__automationRunning) {
    clearInterval(g.__automationInterval);
  }
  g.__automationRunning = true;
  g.__automationInterval = setInterval(runAutomationTick, TICK_INTERVAL_MS);
  console.log("[automation] Engine started — ticking every 5 minutes");
}

export async function runAutomationTick() {
  try {
    const [config] = await database.select().from(schema.workflowConfig);
    if (!config) return;

    // Check business hours (SAST = UTC+2)
    if (config.businessHoursOnly) {
      const now = new Date();
      const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hour = sast.getUTCHours();
      const day = sast.getUTCDay(); // 0=Sun, 6=Sat
      if (hour < 8 || hour >= 18 || day === 0) {
        console.log("[automation] Outside business hours — skipping tick");
        return;
      }
    }

    const now = new Date();

    // ── Stage 1 Auto ─────────────────────────────────────────────────
    // Send stage1 to leads created in the last 10 minutes with no emails yet
    if (config.stage1Auto || config.autoMode) {
      const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const newLeads = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            eq(schema.lead.stage, "initial_contact"),
            eq(schema.lead.optedOut, false),
            isNull(schema.lead.lastEmailAt),
          )
        );

      for (const lead of newLeads) {
        const createdAt = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt as any);
        if (createdAt < tenMinsAgo) continue; // only newly added leads
        try {
          const email = stage1Email(lead.name, lead.business ?? "");
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(),
            leadId: lead.id,
            stage: "stage1",
            subject: email.subject,
            sentBy: "auto",
            status: "sent",
          });
          await database.update(schema.lead)
            .set({ lastEmailAt: now, updatedAt: now })
            .where(eq(schema.lead.id, lead.id));
          console.log(`[automation] Stage 1 sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Stage 1 failed for ${lead.email}:`, e.message);
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage1",
            subject: stage1Email(lead.name, lead.business ?? "").subject,
            sentBy: "auto", status: "failed", error: e.message,
          });
        }
      }
    }

    // ── Stage 2 Auto ─────────────────────────────────────────────────
    // Send stage2 to leads in initial_contact who replied (stage advanced) — handled manually
    // Auto: send stage2 after stage1 if lead hasn't progressed in followUpInterval hours
    if (config.stage2Auto || config.autoMode) {
      const intervalMs = (config.followUpInterval || 24) * 60 * 60 * 1000;
      const cutoff = new Date(now.getTime() - intervalMs);

      const stage2Candidates = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            eq(schema.lead.stage, "initial_contact"),
            eq(schema.lead.optedOut, false),
            lt(schema.lead.lastEmailAt, cutoff),
          )
        );

      for (const lead of stage2Candidates) {
        // Check they've already received stage1 but not stage2
        const logs = await database
          .select()
          .from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        const stages = logs.map(l => l.stage);
        if (!stages.includes("stage1") || stages.includes("stage2")) continue;

        try {
          const email = stage2Email(lead.name, lead.business ?? "");
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage2",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          await database.update(schema.lead)
            .set({ stage: "product_intro", lastEmailAt: now, updatedAt: now })
            .where(eq(schema.lead.id, lead.id));
          console.log(`[automation] Stage 2 sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Stage 2 failed for ${lead.email}:`, e.message);
        }
      }
    }

    // ── Stage 4 Auto (Follow-ups) ────────────────────────────────────
    // Send follow-up 1/2/3 to leads who haven't responded within followUpInterval hours
    if (config.stage4Auto || config.autoMode) {
      const intervalMs = (config.followUpInterval || 24) * 60 * 60 * 1000;
      const cutoff = new Date(now.getTime() - intervalMs);

      const followUpCandidates = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            notInArray(schema.lead.stage, ["booked", "completed", "opted_out"]),
            eq(schema.lead.optedOut, false),
            lt(schema.lead.lastEmailAt, cutoff),
          )
        );

      for (const lead of followUpCandidates) {
        if ((lead.followUpCount ?? 0) >= 3) continue;

        const nextFollowUp = ((lead.followUpCount ?? 0) + 1) as 1 | 2 | 3;

        // Don't re-send a follow-up that was already sent
        const logs = await database
          .select()
          .from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        const stageSent = `stage4_${nextFollowUp}`;
        if (logs.some(l => l.stage === stageSent)) continue;

        try {
          const email = stage4Email(lead.name, nextFollowUp);
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: stageSent,
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          await database.update(schema.lead)
            .set({
              stage: "follow_up",
              followUpCount: nextFollowUp,
              lastEmailAt: now,
              updatedAt: now,
            })
            .where(eq(schema.lead.id, lead.id));
          console.log(`[automation] Follow-up ${nextFollowUp} sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Follow-up failed for ${lead.email}:`, e.message);
        }
      }
    }

    // ── Demo Reminders (24h + 1h) ────────────────────────────────────
    // Always run regardless of stage5Auto — these are time-critical
    const bookedLeads = await database
      .select()
      .from(schema.lead)
      .where(
        and(
          eq(schema.lead.stage, "booked"),
          eq(schema.lead.optedOut, false),
        )
      );

    for (const lead of bookedLeads) {
      if (!lead.demoDate || !lead.demoLink) continue;

      // Try to parse demoDate — supports ISO strings or common formats
      const demoTime = Date.parse(lead.demoDate);
      if (isNaN(demoTime)) continue;

      const msUntilDemo = demoTime - now.getTime();
      const logs = await database
        .select()
        .from(schema.emailLog)
        .where(eq(schema.emailLog.leadId, lead.id));
      const sentStages = new Set(logs.map(l => l.stage));

      // 24h reminder: send when 23h–25h away
      if (msUntilDemo > 23 * 3600000 && msUntilDemo < 25 * 3600000 && !sentStages.has("reminder24")) {
        try {
          const email = demoReminderEmail(lead.name, lead.demoDate!, lead.demoLink!, 24);
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "reminder24",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] 24h reminder sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] 24h reminder failed for ${lead.email}:`, e.message);
        }
      }

      // 1h reminder: send when 50min–70min away
      if (msUntilDemo > 50 * 60000 && msUntilDemo < 70 * 60000 && !sentStages.has("reminder1")) {
        try {
          const email = demoReminderEmail(lead.name, lead.demoDate!, lead.demoLink!, 1);
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "reminder1",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] 1h reminder sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] 1h reminder failed for ${lead.email}:`, e.message);
        }
      }
    }

  } catch (e: any) {
    console.error("[automation] Tick error:", e.message);
  }
}
