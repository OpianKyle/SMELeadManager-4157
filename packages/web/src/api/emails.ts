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
  <title>Masakhe Group</title>
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
                    M <span style="font-weight:400;">Masakhe</span> <span style="color:#118849; font-weight:700;">Group</span>
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
        I'm <strong>Masi</strong>, your dedicated Masakhe assistant. We help South African small businesses like <strong>${business || "yours"}</strong> save time, cut costs and run smarter — all from one platform.
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
  const variants = {
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

  const v = variants[followUpNum];

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
