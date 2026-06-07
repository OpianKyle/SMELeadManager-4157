// Branded HTML email templates for Masakhe Email Automation
// WhatsApp CTA +27 81 038 3955 on every email

const WA_NUMBER = "27810383955";
const WA_LINK = `https://wa.me/${WA_NUMBER}`;

const baseStyle = `
  font-family: 'Open Sans', Arial, sans-serif;
  margin: 0; padding: 0; background: #eef2f6;
`;

const REGISTER_URL = "https://masakhegroup.co.za";

export function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Masakhe Lead Manager</title>
</head>
<body style="${baseStyle}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; padding: 32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:4px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f326b; padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-family:'Open Sans',Arial,sans-serif; font-size:22px; font-weight:900; color:#ffffff; letter-spacing:-0.5px;">
                    M <span style="font-weight:400;">Masakhe</span> <span style="color:#118849; font-weight:700;">Lead Manager</span>
                  </span>
                </td>
                <td align="right">
                  <span style="font-family:'Open Sans',Arial,sans-serif; font-size:11px; color:rgba(255,255,255,0.6); letter-spacing:1px; text-transform:uppercase;">
                    Empowering SA Businesses Digitally
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 32px;">
            <hr style="border:none; border-top:1px solid #eef2f6; margin:0;">
          </td>
        </tr>

        <!-- WhatsApp CTA — Main CTA -->
        <tr>
          <td style="padding:24px 32px; background:#f8fafb;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:12px;">
                  <p style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; margin:0;">
                    Prefer to chat directly? Reach us on WhatsApp — we respond fast.
                  </p>
                </td>
              </tr>
              <tr>
                <td>
                  <a href="${WA_LINK}" target="_blank" style="
                    display:inline-block;
                    background:#118849;
                    color:#ffffff;
                    font-family:'Open Sans',Arial,sans-serif;
                    font-size:14px;
                    font-weight:700;
                    text-decoration:none;
                    padding:12px 24px;
                    border-radius:3px;
                    letter-spacing:0.3px;
                  ">
                    <span style="margin-right:8px;">💬</span>Respond via WhatsApp
                  </a>
                  <span style="font-family:'Open Sans',Arial,sans-serif; font-size:12px; color:#5e708d; margin-left:12px;">+27 81 038 3955</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#192943; padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="font-family:'Open Sans',Arial,sans-serif; font-size:12px; color:rgba(255,255,255,0.5); margin:0 0 4px 0;">
                    © 2026 Masakhe Group (Pty) Ltd. All rights reserved.
                  </p>
                  <p style="font-family:'Open Sans',Arial,sans-serif; font-size:12px; color:rgba(255,255,255,0.4); margin:0 0 8px 0;">
                    260 Uys Krige Drive, Loevenstein, South Africa · hello@masakhegroup.co.za · +27 (0)810383955
                  </p>
                  <a href="${REGISTER_URL}" style="font-family:'Open Sans',Arial,sans-serif; font-size:12px; color:rgba(255,255,255,0.5); text-decoration:underline;">
                    Register Free Trial →
                  </a>
                </td>
                <td align="right" valign="top">
                  <a href="[UNSUBSCRIBE_LINK]" style="font-family:'Open Sans',Arial,sans-serif; font-size:11px; color:rgba(255,255,255,0.4); text-decoration:underline;">
                    Unsubscribe
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── 1. Connection Attempt #1 — no answer, no voicemail ───────────────
export function attempt1Email(name: string) {
  return {
    subject: `We tried reaching you – Masakhe Group`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">We Tried to Reach You</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        This is the Masakhe Team. We just tried calling you to follow up on your enquiry and help get you started.
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        No need to call back right now. You can simply reply to this email with the best number and time to reach you, or reach us on WhatsApp below — we're happy to help.
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#5e708d; margin:0;">
        Best regards,<br><strong>Masakhe Team</strong>
      </p>
    `),
  };
}

// ── 2. Connection Attempt #2 — still no answer (24h later) ───────────
export function attempt2Email(name: string) {
  return {
    subject: `Still trying to reach you – Masakhe Group`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">We Called Again — Let's Make This Easy</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        We tried calling again today. Since we haven't connected yet, we want to make this as easy as possible for you.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:16px 20px; margin:0 0 20px 0;">
        <tr>
          <td style="padding:6px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">→</span>
            Reply with <strong>"Call me [Day] at [Time]"</strong> and we'll adjust to your schedule.
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">→</span>
            Or simply reach out on WhatsApp below — we respond fast.
          </td>
        </tr>
      </table>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#5e708d; margin:0;">
        We'll try once more tomorrow. If we miss you again, we'll follow up by email.
      </p>
    `),
  };
}

// ── 3. Final Attempt / Hold — soft break-up (48h later) ──────────────
export function finalAttemptEmail(name: string) {
  return {
    subject: `One last try – Masakhe Group`,
    html: emailWrapper(`
      <div style="background:#192943; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">Our Final Attempt — We Don't Want to Bother You</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        We've tried calling a few times without reaching you. We don't want to keep bothering you, so we're closing your active follow-up for now.
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; font-weight:700; color:#192943; margin:0 0 8px 0;">If you still need help:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:16px 20px; margin:0 0 20px 0;">
        <tr>
          <td style="padding:6px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">·</span>
            Reply <strong>"Yes"</strong> and we'll call you within 1 business day at a time you specify.
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">·</span>
            Or reach us on WhatsApp below at any time.
          </td>
        </tr>
      </table>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#5e708d; margin:0;">
        If we don't hear from you, we'll assume your needs have been resolved. No hard feelings — wishing you the best.
      </p>
    `),
  };
}

// ── 4. Callback Confirmation ──────────────────────────────────────────
export function callbackConfirmEmail(name: string, callbackDate: string, callbackTime: string, phone: string) {
  return {
    subject: `Confirming your callback – ${callbackDate}`,
    html: emailWrapper(`
      <div style="background:#118849; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">✅ Callback Confirmed</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        Great speaking with you briefly! As requested, we have scheduled a callback for:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <tr><td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
          <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">📅 Date</span>
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">${callbackDate}</strong>
        </td></tr>
        <tr><td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
          <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">⏰ Time</span>
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">${callbackTime}</strong>
        </td></tr>
        <tr><td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
          <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">📞 Caller</span>
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">Masakhe Team</strong>
        </td></tr>
        <tr><td style="padding:8px 0;">
          <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">📱 We'll call you at</span>
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">${phone || "the number you provided"}</strong>
        </td></tr>
      </table>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#5e708d; margin:0;">
        No need to prepare anything. If that time no longer works, just reply to this email and we'll arrange a new time.
      </p>
    `),
  };
}

// ── 5. Onboarding Call Reminder ───────────────────────────────────────
export function onboardingReminderEmail(name: string, callDate: string, callTime: string, phone: string, hoursAhead: 24 | 1) {
  const timeLabel = hoursAhead === 24 ? "tomorrow" : "in 1 hour";
  return {
    subject: `Reminder – Your onboarding call ${timeLabel} at ${callTime}`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">⏰ Your Onboarding Call is ${hoursAhead === 24 ? "Tomorrow" : "Starting in 1 Hour"}</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        This is a quick reminder about your onboarding call:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <tr><td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">🗓 When: ${callDate} at ${callTime}</strong>
        </td></tr>
        <tr><td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">📍 Where: Phone call — we'll call you at ${phone || "the number you provided"}</strong>
        </td></tr>
        <tr><td style="padding:8px 0;">
          <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">⏱ Duration: ~15–20 minutes</strong>
        </td></tr>
      </table>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; font-weight:700; color:#192943; margin:0 0 8px 0;">What we'll cover:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        ${["Quick account setup / welcome walkthrough", "Answer any questions you have", "Next steps after this call"].map(item => `
        <tr><td style="padding:5px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
          <span style="color:#118849; font-weight:700; margin-right:8px;">✓</span>${item}
        </td></tr>`).join("")}
      </table>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; margin:0;">
        Can't make it? Just reply <strong>"reschedule"</strong> and we'll arrange a new time.
      </p>
    `),
  };
}

// ── 6. Missed Appointment ─────────────────────────────────────────────
export function missedAppointmentEmail(name: string, scheduledTime: string) {
  return {
    subject: `We missed you — let's find a new time`,
    html: emailWrapper(`
      <div style="background:#f59e0b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">We Missed You — No Worries</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        We were ready to call you at <strong>${scheduledTime}</strong> for your onboarding, but we weren't able to connect. No worries — things come up.
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        Simply reply to this email with a new day and time that works for you, or reach out on WhatsApp below and we'll get you sorted.
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; margin:0;">
        If you've already completed what you needed or changed your mind, just reply <strong>"all set"</strong>. Otherwise, we'll hold your spot for one week before closing your file.
      </p>
    `),
  };
}

// ── 7. Client Onboarding Complete ─────────────────────────────────────
export function onboardingCompleteEmail(name: string) {
  return {
    subject: `Welcome aboard — here's what's next`,
    html: emailWrapper(`
      <div style="background:#118849; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">🎉 Welcome to Masakhe — Onboarding Complete!</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        Great speaking with you today! This email confirms your onboarding is complete.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:16px 20px; margin:0 0 24px 0;">
        <tr><td style="padding:4px 0; font-family:'Open Sans',Arial,sans-serif; font-size:13px; font-weight:700; color:#5e708d; text-transform:uppercase; letter-spacing:0.5px;">✅ What's been set up</td></tr>
        ${["Your account is active and ready to use", "Your dedicated support contact has been assigned", "Next steps have been confirmed"].map(item => `
        <tr><td style="padding:5px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
          <span style="color:#118849; font-weight:700; margin-right:8px;">·</span>${item}
        </td></tr>`).join("")}
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4; border:1px solid #86efac; border-radius:3px; padding:16px 20px; margin:0 0 24px 0;">
        <tr><td style="padding:4px 0; font-family:'Open Sans',Arial,sans-serif; font-size:13px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.5px;">📄 Resources for you</td></tr>
        <tr><td style="padding:8px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
          Support: <strong>hello@masakhegroup.co.za</strong>
        </td></tr>
        <tr><td style="padding:4px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
          WhatsApp: <strong>+27 81 038 3955</strong>
        </td></tr>
        <tr><td style="padding:4px 0; font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">
          Portal: <a href="https://www.masakheportal.co.za" style="color:#118849; font-weight:700;">www.masakheportal.co.za</a>
        </td></tr>
      </table>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#5e708d; margin:0;">
        If anything isn't clear, just reply to this email — we're personally here to help for the next 48 hours. Welcome again!
      </p>
    `),
  };
}

// ── Stage 1: Initial Contact ─────────────────────────────────────────
export function stage1Email(name: string, business: string) {
  return {
    subject: `👋 Hi ${name} — Let's Help ${business || "Your Business"} Grow`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">Welcome to Masakhe SME BUILDER</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        We help South African small businesses like <strong>${business || "yours"}</strong> save time, cut costs and run smarter — all from one platform.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:20px; margin:20px 0;">
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">✓</span>
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">9 powerful business modules in one dashboard</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">✓</span>
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">Save x10 time on admin tasks</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">✓</span>
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">Built specifically for South African SMEs</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#118849; font-weight:700; margin-right:8px;">✓</span>
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">7-day free trial — no credit card required</span>
          </td>
        </tr>
      </table>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0;">
        Would you like to see exactly how we can help <strong>${business || "your business"}</strong> grow? Reply to this email or reach us on WhatsApp below.
      </p>
    `),
  };
}

// ── Stage 2: Product Introduction ────────────────────────────────────
export function stage2Email(name: string, business: string) {
  const modules = [
    { icon: "🌐", name: "Website Builder", desc: "Drag-and-drop, no coding needed" },
    { icon: "📱", name: "Social Media Hub", desc: "Design and schedule posts" },
    { icon: "💼", name: "Biz Connect", desc: "LinkedIn growth from one place" },
    { icon: "💰", name: "Income & Expenses", desc: "Real-time cash flow tracking" },
    { icon: "📄", name: "Quotes & Invoices", desc: "Professional billing in seconds" },
    { icon: "👥", name: "Payroll & HR", desc: "Staff records & payroll managed" },
    { icon: "🤝", name: "Clients CRM", desc: "Full client pipeline tracking" },
    { icon: "📣", name: "Campaign Builder", desc: "Launch marketing campaigns" },
    { icon: "🔗", name: "Partner Program", desc: "Earn residual income by referring" },
  ];

  return {
    subject: `${name}, here's everything the Masakhe Platform does for your business`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">One Platform. Everything Your Business Needs.</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        The <strong>Masakhe SME BUILDER</strong> replaces multiple expensive tools with one affordable monthly platform. Here's what's included:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${modules.map(m => `
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #eef2f6;">
            <span style="font-size:18px; margin-right:10px;">${m.icon}</span>
            <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">${m.name}</strong>
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; margin-left:8px;">— ${m.desc}</span>
          </td>
        </tr>`).join("")}
      </table>

      <div style="background:#118849; border-radius:3px; padding:20px 24px; margin-bottom:0; text-align:center;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; margin:0 0 4px 0;">All 9 modules. One affordable monthly fee.</p>
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:rgba(255,255,255,0.8); margin:0;">Free 7-day trial · No credit card required</p>
      </div>
    `),
  };
}

// ── Stage 3: Demo Scheduling ─────────────────────────────────────────
export function stage3Email(name: string, slots: string[]) {
  return {
    subject: `${name}, choose your preferred demo time`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">📅 Book Your Free 20-Min Demo</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>, great news — let's get your demo scheduled.
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        Please select one of the available time slots below and simply reply with your preferred option:
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        ${slots.map((slot, i) => `
        <tr>
          <td style="padding:12px 16px; background:#eef2f6; border-left:4px solid #118849; border-radius:0 3px 3px 0;">
            <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#0f326b;">Option ${i + 1}:</strong>
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943; margin-left:8px;">${slot}</span>
          </td>
        </tr>
        <tr><td style="height:6px;"></td></tr>`).join("")}
      </table>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#5e708d; margin:0;">
        📍 Format: Google Meet (link sent upon confirmation) &nbsp;·&nbsp; 🕐 Duration: 20 minutes &nbsp;·&nbsp; 👤 With: Masakhe Team
      </p>
    `),
  };
}

// ── Stage 4: Follow-up (1/2/3) ───────────────────────────────────────
export function stage4Email(name: string, followUpNum: 1 | 2 | 3) {
  const variants: Record<number, { subject: string; headline: string; body: string }> = {
    1: {
      subject: `Hi ${name} — just checking in 👋`,
      headline: "Still Interested in Growing Your Business?",
      body: `I wanted to follow up on my previous email about the <strong>Masakhe SME BUILDER</strong>. I know things get busy, but I don't want you to miss out on how much simpler running your business can be.`,
    },
    2: {
      subject: `${name}, your free trial window is closing`,
      headline: "Save x10 Time & x10 Cost — Starting Today",
      body: `South African businesses using the Masakhe SME BUILDER save hours every week on admin tasks. With your <strong>free 7-day trial</strong> available, there's nothing to lose. Let's get you set up before you miss the window.`,
    },
    3: {
      subject: `Final follow-up, ${name} — let's connect`,
      headline: "Last Chance to Connect — A Human is Ready to Help",
      body: `This is my final follow-up. If you'd prefer to speak directly to a human consultant rather than receive emails, just reply <strong>AGENT</strong> and we'll connect you with someone right away.`,
    },
  };

  const v = variants[Number(followUpNum)];
  if (!v) throw new Error(`Invalid followUpNum: ${followUpNum}`);

  return {
    subject: v.subject,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">${v.headline}</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0;">
        ${v.body}
      </p>
    `),
  };
}

// ── Stage 5: Booking Confirmation ─────────────────────────────────────
export function stage5Email(name: string, demoDate: string, meetLink: string, agentName?: string) {
  return {
    subject: `✅ Demo Confirmed, ${name} — See you on ${demoDate}`,
    html: emailWrapper(`
      <div style="background:#118849; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">✅ Your Demo is Confirmed!</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 20px 0;">
        Your free Masakhe SME BUILDER demo is booked. We're looking forward to showing you everything the platform can do for your business.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">📅 Date & Time</span>
            <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">${demoDate}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">🔗 Google Meet Link</span>
            <a href="${meetLink}" style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#118849; font-weight:700;">${meetLink}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0; border-bottom:1px solid #dde3ea;">
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">🕐 Duration</span>
            <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">20 minutes</strong>
          </td>
        </tr>
        ${agentName ? `
        <tr>
          <td style="padding:8px 0;">
            <span style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#5e708d; display:block; margin-bottom:2px;">👤 Your Host</span>
            <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943;">${agentName}, Masakhe Team</strong>
          </td>
        </tr>` : ""}
      </table>

      <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:3px; padding:14px 18px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:13px; color:#856404; margin:0;">
          <strong>⏰ Reminders:</strong> You'll receive an automatic reminder 24 hours and 1 hour before your demo.
        </p>
      </div>

      <a href="${meetLink}" style="
        display:inline-block;
        background:#0f326b;
        color:#ffffff;
        font-family:'Open Sans',Arial,sans-serif;
        font-size:14px;
        font-weight:700;
        text-decoration:none;
        padding:13px 28px;
        border-radius:3px;
      ">Join Google Meet →</a>
    `),
  };
}

// ── Demo Reminder (24h or 1h before) ─────────────────────────────────
export function demoReminderEmail(name: string, demoDate: string, meetLink: string, hoursAhead: 24 | 1) {
  return {
    subject: `⏰ Reminder: Your Masakhe demo is ${hoursAhead === 24 ? "tomorrow" : "in 1 hour"}, ${name}`,
    html: emailWrapper(`
      <div style="background:#0f326b; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <p style="font-family:'Open Sans',Arial,sans-serif; font-size:18px; font-weight:700; color:#ffffff; margin:0;">⏰ Your Demo is ${hoursAhead === 24 ? "Tomorrow" : "Starting in 1 Hour"}</p>
      </div>

      <p style="font-family:'Open Sans',Arial,sans-serif; font-size:15px; color:#192943; line-height:1.7; margin:0 0 16px 0;">
        Hi <strong>${name}</strong>, just a quick reminder about your upcoming Masakhe demo.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6; border-radius:3px; padding:20px 24px; margin-bottom:24px;">
        <tr>
          <td style="padding:6px 0;">
            <strong style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#192943;">📅 ${demoDate}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <a href="${meetLink}" style="font-family:'Open Sans',Arial,sans-serif; font-size:14px; color:#118849; font-weight:700;">🔗 ${meetLink}</a>
          </td>
        </tr>
      </table>

      <a href="${meetLink}" style="
        display:inline-block;
        background:#118849;
        color:#ffffff;
        font-family:'Open Sans',Arial,sans-serif;
        font-size:14px;
        font-weight:700;
        text-decoration:none;
        padding:13px 28px;
        border-radius:3px;
      ">Join Your Demo →</a>
    `),
  };
}

// ── Campaign Email Helper ─────────────────────────────────────────────
function campaignBody(headline: string, paragraphs: string[], ctaText = "Start Your Free Trial →"): string {
  return `
    <div style="background:#0f326b;border-radius:3px;padding:20px 24px;margin-bottom:24px;">
      <p style="font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;margin:0;">${headline}</p>
    </div>
    ${paragraphs.map(p => `<p style="font-family:'Open Sans',Arial,sans-serif;font-size:15px;color:#192943;line-height:1.7;margin:0 0 14px 0;">${p}</p>`).join("")}
    <div style="text-align:center;margin:28px 0 0;">
      <a href="https://www.masakheportal.co.za/register" style="display:inline-block;background:#118849;color:#ffffff;font-family:'Open Sans',Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:3px;">${ctaText}</a>
    </div>
    <p style="font-family:'Open Sans',Arial,sans-serif;font-size:13px;color:#9eafc2;text-align:center;margin:16px 0 0;">
      👉 <a href="https://www.masakheportal.co.za/register" style="color:#118849;">www.masakheportal.co.za/register</a>
    </p>
  `;
}

export const CAMPAIGN_EMAILS: Array<{ stepNumber: number; subject: string; bodyHtml: string; delayDays: number }> = [
  {
    stepNumber: 1, delayDays: 0,
    subject: "One platform. Everything your SMME needs.",
    bodyHtml: campaignBody(
      "The All-in-One Business Platform for South African SMMEs",
      [
        "Running a small business means juggling a dozen tools. <strong>Masakhe</strong> brings them all together — website, invoices, payroll, CRM, social media, and finances. No more jumping between tabs.",
        "Claim your <strong>14-day free trial</strong> and see the difference.",
      ]
    ),
  },
  {
    stepNumber: 2, delayDays: 2,
    subject: "Your website, live in minutes (no developer needed)",
    bodyHtml: campaignBody(
      "AI Website Builder — Drag, Drop, Go Live",
      [
        "With Masakhe's AI website builder you get a free <strong>drag-and-drop website builder</strong>. Edit with the WYSIWYG editor and post live! Professional, fast, and mobile-friendly — perfect for South African SMMEs.",
        "Build yours <strong>free for 14 days</strong>.",
      ]
    ),
  },
  {
    stepNumber: 3, delayDays: 2,
    subject: "Stop chasing payments. Start sending professional invoices.",
    bodyHtml: campaignBody(
      "Invoicing That Gets You Paid Faster",
      [
        "Choose from multiple templates, add your logo, and send <strong>quotes and invoices in minutes</strong> from your dashboard. Track what's paid and what's overdue — all in one place.",
        "Try it <strong>free for two weeks</strong>.",
      ]
    ),
  },
  {
    stepNumber: 4, delayDays: 2,
    subject: "Payroll headaches? Not anymore.",
    bodyHtml: campaignBody(
      "Payroll Made Simple",
      [
        "Generate payslips, <strong>auto-calculate deductions</strong>, and manage employee records without spreadsheets. Masakhe handles the numbers so you can focus on your team.",
        "Test payroll with your <strong>free trial</strong>.",
      ]
    ),
  },
  {
    stepNumber: 5, delayDays: 2,
    subject: "Never lose a lead again.",
    bodyHtml: campaignBody(
      "Client Management (CRM) Built-In",
      [
        "Keep all client conversations, documents, and history in one place. Masakhe's CRM helps you <strong>nurture relationships and close deals faster</strong> — custom built for you at no extra cost.",
        "Experience the CRM <strong>free for 14 days</strong>.",
      ]
    ),
  },
  {
    stepNumber: 6, delayDays: 2,
    subject: "Plan a week of posts in minutes.",
    bodyHtml: campaignBody(
      "Social Media Scheduling — Done in Minutes",
      [
        "Create, download and post to <strong>all your social channels</strong> from Masakhe in minutes. No more last-minute rushes or forgotten posts — just consistent engagement.",
        "Start scheduling <strong>free today</strong>.",
      ]
    ),
  },
  {
    stepNumber: 7, delayDays: 2,
    subject: "Know exactly where every rand goes.",
    bodyHtml: campaignBody(
      "Financial Transaction Tracking",
      [
        "Link your transactions, track expenses, and see your <strong>cash flow at a glance</strong>. Masakhe gives you the financial clarity every SMME needs to grow.",
        "See it in action with a <strong>free trial</strong>.",
      ]
    ),
  },
  {
    stepNumber: 8, delayDays: 2,
    subject: "Reclaim your time. Let Masakhe do the busy work.",
    bodyHtml: campaignBody(
      "Save Hours Every Week",
      [
        "Imagine not switching between six different apps. Masakhe <strong>automates invoicing, payroll, social media, and more</strong> — so you can focus on serving customers.",
        "Try the time-saver <strong>free for 14 days</strong>.",
      ]
    ),
  },
  {
    stepNumber: 9, delayDays: 2,
    subject: "Stop paying for 5 separate tools.",
    bodyHtml: campaignBody(
      "Cut Costs — One Platform Instead of Many",
      [
        "Website builder + invoicing + payroll + CRM + social scheduler = thousands of rands. <strong>Masakhe combines them all from R899/month</strong> after trial.",
        "First <strong>14 days are on us</strong>.",
      ]
    ),
  },
  {
    stepNumber: 10, delayDays: 2,
    subject: "Small business, big brand impression.",
    bodyHtml: campaignBody(
      "Look Professional, Win More Business",
      [
        "A sleek website, branded invoices, and organised client management make you look like a market leader. Masakhe gives you that <strong>polished image without the high cost</strong>.",
        "Build your professional presence <strong>free</strong>.",
      ]
    ),
  },
  {
    stepNumber: 11, delayDays: 2,
    subject: "Designed for South African SMMEs – easy for everyone.",
    bodyHtml: campaignBody(
      "No Tech Skills? No Problem.",
      [
        "Drag, drop, click, done. Masakhe's interface is <strong>intuitive, with guided steps for every feature</strong>. You don't need an IT degree to run your business like a pro.",
        "Prove it to yourself — <strong>free trial</strong>.",
      ]
    ),
  },
  {
    stepNumber: 12, delayDays: 2,
    subject: "A free trial that's actually free.",
    bodyHtml: campaignBody(
      "Zero Risk, Zero Credit Card",
      [
        "<strong>No credit card required. No hidden fees.</strong> Just 14 full days of access to everything Masakhe offers. If you love it, upgrade later. If not, walk away.",
        "Start your <strong>risk-free trial today</strong>.",
      ]
    ),
  },
  {
    stepNumber: 13, delayDays: 2,
    subject: "Your 14-day roadmap to a smoother business.",
    bodyHtml: campaignBody(
      "The First 14 Days: What to Try",
      [
        "<strong>Day 1:</strong> Build your AI website. <strong>Day 3:</strong> Send an invoice. <strong>Day 5:</strong> Schedule social posts. <strong>Day 7:</strong> Run payroll. By day 14, you'll wonder how you managed without Masakhe.",
        "Get the full roadmap — <strong>start free</strong>.",
      ]
    ),
  },
  {
    stepNumber: 14, delayDays: 2,
    subject: "Stop juggling. Start managing.",
    bodyHtml: campaignBody(
      "From Chaos to Control",
      [
        "When your clients, finances, and team are all in one place, running your business becomes <strong>calm and clear</strong>. Masakhe brings order to the chaos.",
        "Experience control <strong>free for 14 days</strong>.",
      ]
    ),
  },
  {
    stepNumber: 15, delayDays: 2,
    subject: "Your business is ready to scale. Is your software?",
    bodyHtml: campaignBody(
      "Grow Without Growing Pains",
      [
        "Masakhe grows with you. Add more clients, more employees, more social accounts — the platform handles it all. <strong>No need to switch tools when you level up.</strong>",
        "Test the scalability <strong>free</strong>.",
      ]
    ),
  },
  {
    stepNumber: 16, delayDays: 2,
    subject: "Local taxes. Local rules. Local support.",
    bodyHtml: campaignBody(
      "Built for South African SMMEs",
      [
        "Masakhe understands <strong>SARS payroll requirements</strong>, local invoice regulations, and the way you do business. Not a generic international tool — <strong>made for you</strong>.",
        "Try the local advantage <strong>free</strong>.",
      ]
    ),
  },
  {
    stepNumber: 17, delayDays: 2,
    subject: "Sleep better knowing your business data is protected.",
    bodyHtml: campaignBody(
      "Your Data, Safe and Secure",
      [
        "We take security seriously. Your client info, payroll records, and financial data are <strong>encrypted and backed up</strong>. So you can focus on growing, not worrying.",
        "See our security features <strong>free</strong>.",
      ]
    ),
  },
  {
    stepNumber: 18, delayDays: 2,
    subject: "The dashboard that does it all.",
    bodyHtml: campaignBody(
      "One Login. Full Control.",
      [
        "Log in once. From one dashboard, manage your website, send invoices, run payroll, talk to clients, schedule posts, and track money. <strong>That's the Masakhe power.</strong>",
        "Experience total control <strong>free</strong>.",
      ]
    ),
  },
  {
    stepNumber: 19, delayDays: 2,
    subject: "Join hundreds of South African businesses already saving time.",
    bodyHtml: campaignBody(
      "Real SMMEs, Real Results",
      [
        "<em>&ldquo;Masakhe cut my admin by 70%.&rdquo;</em> &nbsp; <em>&ldquo;I built my site in 10 minutes.&rdquo;</em> &nbsp; <em>&ldquo;Finally, one tool for everything.&rdquo;</em>",
        "Don't just take our word for it. <strong>Join them — start your free trial.</strong>",
      ]
    ),
  },
  {
    stepNumber: 20, delayDays: 2,
    subject: "Don't let another week slip away.",
    bodyHtml: campaignBody(
      "Last Chance: Your Free Trial Awaits",
      [
        "Every day you wait is another day of juggling spreadsheets, missed social posts, and late invoices. <strong>Your 14-day free trial is ready — claim it now.</strong>",
      ],
      "Start Your Free Trial Now →"
    ),
  },
];
