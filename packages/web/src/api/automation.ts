import { eq, and, lt, notInArray, isNull, inArray, asc } from "drizzle-orm";
import { database } from "./database";
import * as schema from "./database/schema";
import { sendEmail } from "./mailer";
import {
  stage1Email, stage2Email, stage3Email, stage4Email, stage5Email, demoReminderEmail, emailWrapper,
} from "./emails";

function generateDemoSlots(from: Date): string[] {
  const slots: string[] = [];
  const times = ["10:00 AM", "2:00 PM", "4:00 PM"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (slots.length < 3) {
    const dow = d.getUTCDay();
    if (dow !== 0) {
      slots.push(`${days[dow]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} at ${times[slots.length]}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return slots;
}

const TICK_INTERVAL_MS = 5 * 60 * 1000;

const g = globalThis as any;

export function startAutomation() {
  if (g.__automationRunning) {
    clearInterval(g.__automationInterval);
  }
  g.__automationRunning = true;
  g.__automationTickInProgress = false;
  g.__automationInterval = setInterval(runAutomationTick, TICK_INTERVAL_MS);
  console.log("[automation] Engine started — ticking every 5 minutes");
}

export async function runAutomationTick() {
  // Prevent overlapping ticks — if previous tick is still running, skip this one
  if (g.__automationTickInProgress) {
    console.log("[automation] Previous tick still running — skipping");
    return;
  }
  g.__automationTickInProgress = true;

  try {
    const [config] = await database.select().from(schema.workflowConfig);
    if (!config) return;

    // Check business hours (SAST = UTC+2)
    if (config.businessHoursOnly) {
      const now = new Date();
      const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const hour = sast.getUTCHours();
      const day = sast.getUTCDay();
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
        if (createdAt < tenMinsAgo) continue;

        // Extra guard: skip if any email has already been sent (stage1 or any campaign_* step)
        const existingLogs = await database.select().from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        if (existingLogs.some(l => l.stage === "stage1" || l.stage.startsWith("campaign_"))) continue;

        try {
          const email = stage1Email(lead.name, lead.business ?? "");
          // Mark lastEmailAt first to prevent race conditions
          await database.update(schema.lead)
            .set({ lastEmailAt: now, updatedAt: now })
            .where(eq(schema.lead.id, lead.id));
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage1",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] Stage 1 sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Stage 1 failed for ${lead.email}:`, e.message);
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage1",
            subject: stage1Email(lead.name, lead.business ?? "").subject,
            sentBy: "auto", status: "failed", error: e.message,
          }).catch(() => {});
        }
      }
    }

    // ── Stage 2 Auto ─────────────────────────────────────────────────
    // Send stage2 after followUpInterval hours if lead is still in initial_contact
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
        const logs = await database.select().from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        const stages = logs.map(l => l.stage);
        if (!stages.includes("stage1") || stages.includes("stage2")) continue;

        try {
          const email = stage2Email(lead.name, lead.business ?? "");
          await database.update(schema.lead)
            .set({ stage: "product_intro", lastEmailAt: now, updatedAt: now })
            .where(eq(schema.lead.id, lead.id));
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage2",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] Stage 2 sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Stage 2 failed for ${lead.email}:`, e.message);
        }
      }
    }

    // ── Stage 3 Auto (Demo Scheduling) ──────────────────────────────
    // Send stage3 after followUpInterval hours if lead is still in product_intro
    if (config.stage3Auto || config.autoMode) {
      const intervalMs = (config.followUpInterval || 24) * 60 * 60 * 1000;
      const cutoff = new Date(now.getTime() - intervalMs);

      const stage3Candidates = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            eq(schema.lead.stage, "product_intro"),
            eq(schema.lead.optedOut, false),
            lt(schema.lead.lastEmailAt, cutoff),
          )
        );

      for (const lead of stage3Candidates) {
        const logs = await database.select().from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        const stages = logs.map(l => l.stage);
        if (!stages.includes("stage2") || stages.includes("stage3")) continue;

        try {
          const slots = generateDemoSlots(now);
          const email = stage3Email(lead.name, slots);
          await database.update(schema.lead)
            .set({ stage: "demo_scheduling", lastEmailAt: now, updatedAt: now })
            .where(eq(schema.lead.id, lead.id));
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage3",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] Stage 3 sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Stage 3 failed for ${lead.email}:`, e.message);
        }
      }
    }

    // ── Stage 5 Auto (Booking Confirmation) ──────────────────────────
    if (config.stage5Auto || config.autoMode) {
      const bookedConfirm = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            eq(schema.lead.stage, "booked"),
            eq(schema.lead.optedOut, false),
          )
        );

      for (const lead of bookedConfirm) {
        if (!lead.demoDate || !lead.demoLink) continue;
        const logs = await database.select().from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        if (logs.some(l => l.stage === "stage5")) continue;

        try {
          const email = stage5Email(lead.name, lead.demoDate, lead.demoLink, "Masakhe Team");
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: "stage5",
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] Stage 5 (booking confirmation) sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Stage 5 failed for ${lead.email}:`, e.message);
        }
      }
    }

    // ── Stage 4 Auto (Follow-ups) ────────────────────────────────────
    // Only send follow-ups to leads that have COMPLETED the main sequence (stage3 sent)
    // but haven't booked yet. This prevents follow-ups overlapping with stage emails.
    if (config.stage4Auto || config.autoMode) {
      const intervalMs = (config.followUpInterval || 24) * 60 * 60 * 1000;
      const cutoff = new Date(now.getTime() - intervalMs);

      const followUpCandidates = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            // Only leads past the demo_scheduling stage that haven't converted
            inArray(schema.lead.stage, ["demo_scheduling", "follow_up"]),
            eq(schema.lead.optedOut, false),
            lt(schema.lead.lastEmailAt, cutoff),
          )
        );

      for (const lead of followUpCandidates) {
        const currentCount = Number(lead.followUpCount ?? 0);
        if (currentCount >= 3) continue;

        const nextFollowUp = (currentCount + 1) as 1 | 2 | 3;

        const logs = await database.select().from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));
        const stageSent = `stage4_${nextFollowUp}`;
        if (logs.some(l => l.stage === stageSent)) continue;

        // Must have gone through stage3 before receiving follow-ups
        if (!logs.some(l => l.stage === "stage3")) continue;

        try {
          const email = stage4Email(lead.name, nextFollowUp);
          await database.update(schema.lead)
            .set({ stage: "follow_up", followUpCount: nextFollowUp, lastEmailAt: now, updatedAt: now })
            .where(eq(schema.lead.id, lead.id));
          await sendEmail({ to: lead.email, subject: email.subject, html: email.html });
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(), leadId: lead.id, stage: stageSent,
            subject: email.subject, sentBy: "auto", status: "sent",
          });
          console.log(`[automation] Follow-up ${nextFollowUp} sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[automation] Follow-up failed for ${lead.email}:`, e.message);
        }
      }
    }

    // ── Demo Reminders (24h + 1h) ────────────────────────────────────
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

      const demoTime = Date.parse(lead.demoDate);
      if (isNaN(demoTime)) continue;

      const msUntilDemo = demoTime - now.getTime();
      const logs = await database.select().from(schema.emailLog)
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

    // ── Campaign Sequence ────────────────────────────────────────────
    const campaignSteps = await database
      .select()
      .from(schema.emailCampaignStep)
      .where(eq(schema.emailCampaignStep.enabled, true))
      .orderBy(asc(schema.emailCampaignStep.stepNumber));

    if (campaignSteps.length > 0) {
      const activeLeads = await database
        .select()
        .from(schema.lead)
        .where(
          and(
            eq(schema.lead.optedOut, false),
            notInArray(schema.lead.stage, ["completed", "opted_out"]),
          )
        );

      for (const lead of activeLeads) {
        const logs = await database
          .select()
          .from(schema.emailLog)
          .where(eq(schema.emailLog.leadId, lead.id));

        // Find all sent campaign steps and the last one's timestamp
        const sentCampaignSteps: Record<number, Date> = {};
        for (const log of logs) {
          const m = log.stage?.match(/^campaign_(\d+)$/);
          if (m) {
            const num = parseInt(m[1]);
            const sentAt = log.sentAt instanceof Date ? log.sentAt : new Date(log.sentAt as any);
            sentCampaignSteps[num] = sentAt;
          }
        }

        // Find the next step to send
        const nextStep = campaignSteps.find(s => !(s.stepNumber in sentCampaignSteps));
        if (!nextStep) continue;

        // Determine reference time: lead creation for step 1, last sent for subsequent
        let referenceTime: Date;
        if (Object.keys(sentCampaignSteps).length === 0) {
          referenceTime = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt as any);
        } else {
          const lastNum = Math.max(...Object.keys(sentCampaignSteps).map(Number));
          referenceTime = sentCampaignSteps[lastNum];
        }

        const delayMs = nextStep.delayDays * 24 * 60 * 60 * 1000;
        const sendAfter = new Date(referenceTime.getTime() + delayMs);
        if (now < sendAfter) continue;

        try {
          const bodyHtml = nextStep.bodyHtml
            .replace(/\{\{name\}\}/g, lead.name)
            .replace(/\{\{business\}\}/g, lead.business ?? "your business");
          const subject = nextStep.subject
            .replace(/\{\{name\}\}/g, lead.name)
            .replace(/\{\{business\}\}/g, lead.business ?? "your business");
          const html = emailWrapper(bodyHtml);
          // Mark before send to prevent race conditions
          await database.insert(schema.emailLog).values({
            id: crypto.randomUUID(),
            leadId: lead.id,
            stage: `campaign_${nextStep.stepNumber}`,
            subject,
            sentBy: "auto",
            status: "sent",
          });
          await sendEmail({ to: lead.email, subject, html });
          console.log(`[campaign] Email ${nextStep.stepNumber} sent to ${lead.email}`);
        } catch (e: any) {
          console.error(`[campaign] Email ${nextStep.stepNumber} failed for ${lead.email}:`, e.message);
        }
      }
    }

  } catch (e: any) {
    console.error("[automation] Tick error:", e.message);
  } finally {
    g.__automationTickInProgress = false;
  }
}
