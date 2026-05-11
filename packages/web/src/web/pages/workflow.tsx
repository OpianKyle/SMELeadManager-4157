import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const STAGES = [
  {
    num: 1, key: "stage1", label: "Initial Contact", trigger: "New lead added to system",
    icon: "📩", configKey: "stage1Auto",
    checks: ["Sends personalized greeting as Masi", "Introduces Masakhe SME Builder platform", "Highlights 9 business modules", "Asks if lead wants to see demo"],
    successPath: "Lead replies YES → Stage 2", fallbackPath: "No reply in 24h → Follow-up sequence",
    sample: `👋 Hi [Name]! I'm Masi, your Masakhe assistant. We help South African small businesses save time and money with our all-in-one SME Builder platform.\n\nWould you like to hear how we can help [Business] grow? 🚀`,
  },
  {
    num: 2, key: "stage2", label: "Product Introduction", trigger: "Lead shows interest",
    icon: "📋", configKey: "stage2Auto",
    checks: ["Presents all 9 SME Builder modules", "Highlights cost savings (x10 time, x10 cost)", "Mentions 7-day free trial — no card needed", "Asks lead to book a 20-min Google Meet demo"],
    successPath: "Lead agrees → Stage 3", fallbackPath: "No reply in 24h → Follow-up sequence",
    sample: `✅ Website Builder\n✅ Quotes & Invoicing\n✅ Payroll & HR\n✅ Income & Expenses\n✅ CRM (Clients)\n✅ Social Media Hub\n✅ Campaign Builder\n✅ Biz Connect\n✅ Partner Program\n\nAll for one affordable fee. Book a free 20-min demo? 📅`,
  },
  {
    num: 3, key: "stage3", label: "Demo Scheduling", trigger: "Lead agrees to demo",
    icon: "📅", configKey: "stage3Auto",
    checks: ["Offers 3 available time slots", "Lead selects preferred slot", "Booking confirmation sent immediately", "24h and 1h reminders scheduled automatically"],
    successPath: "Demo completed → Stage 5", fallbackPath: "Lead misses demo → Reschedule offered",
    sample: `✅ Demo Booked!\n\n📅 Date: [Selected Time]\n🔗 Google Meet: meet.google.com/...\n👤 With: Masakhe Team\n\nReminders sent 24h & 1h before 🙌`,
  },
  {
    num: 4, key: "stage4", label: "Follow-up Sequence", trigger: "No response after 24 hours",
    icon: "🔄", configKey: "stage4Auto",
    checks: ["Follow-up 1 (24h): Gentle check-in", "Follow-up 2 (48h): Urgency — free trial", "Follow-up 3 (72h): Final message + human option", "3 follow-ups → auto-trigger human handoff"],
    successPath: "Lead responds → Resume from Stage 2", fallbackPath: "3× no response → Stage 5 (Handoff)",
    sample: `[24h] Hi [Name] 👋 Just checking in — did you get a chance to think about Masakhe?\n\n[48h] Ready to save x10 time & cost? Reply YES 👇\n\n[72h] Final follow-up. Reply AGENT to speak to a human.`,
  },
  {
    num: 5, key: "stage5", label: "Booking Confirmation", trigger: "Demo booked or agent assigned",
    icon: "✅", configKey: "stage5Auto",
    checks: ["Sends full booking confirmation with Google Meet link", "Displays date, time, duration & host", "24h + 1h automatic reminders sent", "Lead status updated to Booked"],
    successPath: "Demo completed → Closed", fallbackPath: "No-show → Reschedule offered",
    sample: `✅ Your Demo is Confirmed!\n\n📅 Date: [Demo Date]\n🔗 meet.google.com/xxx-yyy-zzz\n👤 Host: Masakhe Team\n⏱ Duration: 20 minutes\n\nReminders sent automatically 🙌`,
  },
];

export default function Workflow() {
  const [config, setConfig]     = useState<any>(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [previewStage, setPreviewStage] = useState<string | null>(null);
  const [user, setUser]         = useState<any>(null);

  useEffect(() => {
    api.get("/workflow/config").then(r => r.json()).then(d => setConfig(d.config));
    api.get("/me").then(r => r.json()).then(d => setUser(d.user));
  }, []);

  const canEdit = user && ["super_admin", "admin"].includes(user.role);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const saveConfig = async () => {
    setSaving(true);
    await api.put("/workflow/config", config);
    setSaving(false);
    showToast("✅ Workflow settings saved");
  };

  const toggle = (key: string) => {
    if (!canEdit) return;
    setConfig((p: any) => ({ ...p, [key]: !p[key] }));
  };

  const Toggle = ({ val, onChange, disabled }: { val: boolean; onChange: () => void; disabled?: boolean }) => (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: val ? "#118849" : "#d1d9e0",
        position: "relative", cursor: disabled ? "default" : "pointer",
        transition: "background 0.2s", flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: "#fff",
        position: "absolute", top: 3, left: val ? 23 : 3, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );

  return (
    <Layout>
      {toast && (
        <div style={{
          position: "fixed", top: 72, right: 24, zIndex: 9999,
          background: "#192943", color: "#fff", padding: "12px 20px",
          borderRadius: 4, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Automation Workflow</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>
            5-stage email pipeline — initial contact to booked demo
          </p>
        </div>
        {canEdit && (
          <button onClick={saveConfig} disabled={saving || !config} style={{
            background: "#118849", color: "#fff", border: "none", borderRadius: 3,
            padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Open Sans',Arial,sans-serif",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        )}
      </div>

      {/* Global controls */}
      {config && (
        <div style={{ background: "#fff", borderRadius: 4, padding: "20px 24px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              { key: "autoMode", label: "🤖 Full Auto Mode", desc: "All stages run automatically without manual approval" },
              { key: "businessHoursOnly", label: "🕐 Business Hours Only", desc: "Only send 8am–6pm SAST, Mon–Sat" },
            ].map(item => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Toggle val={config[item.key]} onChange={() => toggle(item.key)} disabled={!canEdit} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#192943" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#5e708d" }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
              {[
                { icon: "📧", label: "Email via Runable" },
                { icon: "⚡", label: "Auto Engine" },
                { icon: "🔀", label: "Parallel stages" },
              ].map(b => (
                <div key={b.label} style={{
                  padding: "6px 14px", background: "#eef2f6", borderRadius: 3,
                  fontSize: 12, fontWeight: 600, color: "#192943",
                }}>
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Steps */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, alignItems: "center" }}>
        {STAGES.map((s, i) => (
          <>
            <div key={s.num} style={{
              flex: 1, background: "#fff", borderRadius: 4, padding: "12px 16px",
              border: "2px solid #eef2f6", textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div style={{
                width: 24, height: 24, borderRadius: 12, background: "#192943",
                color: "#fff", fontSize: 12, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center", margin: "0 auto 6px",
              }}>{s.num}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#192943", lineHeight: 1.3 }}>{s.label}</div>
            </div>
            {i < STAGES.length - 1 && (
              <div key={`arr-${i}`} style={{ fontSize: 18, color: "#5e708d" }}>→</div>
            )}
          </>
        ))}
      </div>

      {/* Stage Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {STAGES.map(s => (
          <div key={s.num} style={{ background: "#fff", borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            {/* Stage header */}
            <div style={{ background: "#192943", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>
                    Stage {s.num}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{s.label}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {config && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Auto</span>
                    <Toggle
                      val={config[s.configKey]}
                      onChange={() => toggle(s.configKey)}
                      disabled={!canEdit}
                    />
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 8,
                      background: config[s.configKey] ? "#118849" : "rgba(255,255,255,0.1)",
                      color: "#fff", fontWeight: 600,
                    }}>
                      {config[s.configKey] ? "AUTOMATIC" : "MANUAL"}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setPreviewStage(previewStage === s.key ? null : s.key)}
                  style={{
                    padding: "6px 14px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff", borderRadius: 3, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Open Sans',Arial,sans-serif",
                  }}
                >
                  {previewStage === s.key ? "Hide Preview" : "Preview Email"}
                </button>
              </div>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                {/* Trigger */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5e708d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Trigger</div>
                  <p style={{ margin: 0, fontSize: 13, color: "#192943" }}>{s.trigger}</p>
                </div>

                {/* Checks */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5e708d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Actions</div>
                  {s.checks.map(c => (
                    <div key={c} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 5 }}>
                      <span style={{ color: "#118849", fontWeight: 700, fontSize: 13, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 12, color: "#192943", lineHeight: 1.4 }}>{c}</span>
                    </div>
                  ))}
                </div>

                {/* Routing */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5e708d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Routing Logic</div>
                  <div style={{ marginBottom: 8, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 3 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", letterSpacing: "0.5px", marginBottom: 3 }}>✅ SUCCESS PATH</div>
                    <div style={{ fontSize: 12, color: "#192943" }}>{s.successPath}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 3 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", letterSpacing: "0.5px", marginBottom: 3 }}>⚠️ FALLBACK PATH</div>
                    <div style={{ fontSize: 12, color: "#192943" }}>{s.fallbackPath}</div>
                  </div>
                </div>
              </div>

              {/* Email Preview iframe */}
              {previewStage === s.key && (
                <div style={{ marginTop: 20, borderTop: "1px solid #eef2f6", paddingTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#5e708d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
                    📧 Live Email Preview
                  </div>
                  <iframe
                    src={`/api/email/preview/${s.key === "stage4" ? "stage4_1" : s.key}`}
                    style={{ width: "100%", height: 500, border: "1px solid #eef2f6", borderRadius: 4 }}
                    title={`Preview ${s.label}`}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Timing rules */}
      <div style={{ background: "#fff", borderRadius: 4, padding: "24px", marginTop: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#192943" }}>⏱ Timing & Automation Rules</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {[
            { label: "Initial Response", value: "Instant", desc: "Bot responds within seconds" },
            { label: "Follow-up Interval", value: "24h / 48h / 72h", desc: "3 automated follow-ups" },
            { label: "Demo Reminders", value: "24h + 1h", desc: "Two reminders before each demo" },
            { label: "Handoff Trigger", value: "3× No Response", desc: "Auto-escalates to human agent" },
          ].map(t => (
            <div key={t.label} style={{ padding: "16px", background: "#eef2f6", borderRadius: 3 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f326b", marginBottom: 4 }}>{t.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: "#5e708d" }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
