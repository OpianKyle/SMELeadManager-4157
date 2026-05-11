import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";
import { EmailEditor } from "@/components/email-editor";

const EMAIL_STAGES = [
  { id: "stage1",    stage: "Stage 1",  label: "Initial Contact",      icon: "📩", color: "#0f326b",
    desc: "Warm intro as Masi. Introduces SME Builder and invites the lead to learn more." },
  { id: "stage2",    stage: "Stage 2",  label: "Product Introduction", icon: "📋", color: "#192943",
    desc: "Full 9-module product overview. Drives lead to book a demo." },
  { id: "stage3",    stage: "Stage 3",  label: "Demo Scheduling",      icon: "📅", color: "#5e708d",
    desc: "Presents 3 available time slots for a 20-minute Google Meet demo." },
  { id: "stage4_1",  stage: "Stage 4",  label: "Follow-up #1",         icon: "🔔", color: "#d97706",
    desc: "Soft follow-up after 24h of no response." },
  { id: "stage4_2",  stage: "Stage 4",  label: "Follow-up #2",         icon: "⚡", color: "#d97706",
    desc: "Urgency: free trial window closing." },
  { id: "stage4_3",  stage: "Stage 4",  label: "Follow-up #3",         icon: "🤝", color: "#d97706",
    desc: "Final email — offer human agent handoff." },
  { id: "stage5",    stage: "Stage 5",  label: "Booking Confirmation", icon: "✅", color: "#118849",
    desc: "Demo confirmed with date, Meet link and host name." },
  { id: "reminder24",stage: "Reminder", label: "24h Demo Reminder",    icon: "⏰", color: "#0f326b",
    desc: "Automatic reminder sent 24 hours before the demo." },
  { id: "reminder1", stage: "Reminder", label: "1h Demo Reminder",     icon: "🔔", color: "#0f326b",
    desc: "Final reminder sent 1 hour before. Reduces no-shows." },
];

type SavedTpl = { id: string; subject: string; bodyHtml: string };

export default function EmailAutomation() {
  const [leads, setLeads]   = useState<any[]>([]);
  const [logs, setLogs]     = useState<any[]>([]);
  const [saved, setSaved]   = useState<Record<string, SavedTpl>>({});
  const [selectedLead, setSelectedLead] = useState("");
  const [sending, setSending]   = useState<string | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [toast, setToast]       = useState("");
  const [user, setUser]         = useState<any>(null);
  const [tab, setTab]           = useState<"templates"|"log">("templates");

  // Edit state — one card open at a time
  const [editId, setEditId]         = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody]       = useState("");
  const [savingId, setSavingId]       = useState<string | null>(null);

  useEffect(() => { reload(); }, []);

  const reload = () => {
    api.get("/leads").then(r => r.json()).then(d => setLeads(d.leads ?? []));
    api.get("/email/logs").then(r => r.json()).then(d => setLogs(d.logs ?? []));
    api.get("/email/templates").then(r => r.json()).then(d => {
      const map: Record<string, SavedTpl> = {};
      for (const t of (d.templates ?? [])) map[t.id] = t;
      setSaved(map);
    });
    api.get("/me").then(r => r.json()).then(d => setUser(d.user));
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const sendEmail = async (stageId: string) => {
    if (!selectedLead) { showToast("⚠️ Select a lead first"); return; }
    setSending(stageId);
    const res = await api.post("/email/send", { leadId: selectedLead, stage: stageId });
    const data = await res.json() as any;
    setSending(null);
    if (data.error) showToast("❌ " + data.error);
    else { showToast("✅ Email sent!"); api.get("/email/logs").then(r => r.json()).then(d => setLogs(d.logs ?? [])); }
  };

  const startEdit = (stageId: string) => {
    const tpl = saved[stageId];
    setEditSubject(tpl?.subject ?? "");
    setEditId(stageId);
    setPreview(null);
    if (tpl) {
      setEditBody(tpl.bodyHtml);
    } else {
      // Extract the inner body content from the default email HTML
      fetch(`/api/email/preview/${stageId}`)
        .then(r => r.text())
        .then(html => {
          // Pull out just the content inside the body td (between <!-- Body --> and <!-- Divider -->)
          const match = html.match(/<!-- Body -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Divider -->/);
          setEditBody(match ? match[1].trim() : html);
        });
    }
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (stageId: string) => {
    setSavingId(stageId);
    await api.put(`/email/templates/${stageId}`, { subject: editSubject, bodyHtml: editBody });
    setSavingId(null);
    setEditId(null);
    showToast("✅ Email saved");
    api.get("/email/templates").then(r => r.json()).then(d => {
      const map: Record<string, SavedTpl> = {};
      for (const t of (d.templates ?? [])) map[t.id] = t;
      setSaved(map);
    });
  };

  const canEdit = user && ["super_admin", "admin"].includes(user.role);
  const canSend = user && ["super_admin", "admin", "agent"].includes(user.role);

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

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Email Automation</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>
            9 email stages · WhatsApp CTA on every email · +27 81 038 3955
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["templates","log"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 18px", borderRadius: 4, border: "1px solid #dce4ed",
              background: tab === t ? "#192943" : "#fff",
              color: tab === t ? "#fff" : "#5e708d",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "'Open Sans',Arial,sans-serif",
            }}>
              {t === "templates" ? "📧 Templates" : "📋 Send Log"}
            </button>
          ))}
        </div>
      </div>

      {tab === "templates" && (
        <>
          {/* Lead selector */}
          {canSend && (
            <div style={{ background: "#0f326b", borderRadius: 4, padding: "20px 24px", marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>
                Select Lead to Send Email
              </div>
              <select
                value={selectedLead}
                onChange={e => setSelectedLead(e.target.value)}
                style={{ padding: "10px 14px", border: "none", borderRadius: 3, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif", color: "#192943", minWidth: 320, background: "#fff" }}
              >
                <option value="">— Choose a lead —</option>
                {leads.filter(l => !l.optedOut).map(l => (
                  <option key={l.id} value={l.id}>{l.name}{l.business ? ` (${l.business})` : ""} — {l.email}</option>
                ))}
              </select>
              {selectedLead && <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>✓ Lead selected</span>}
            </div>
          )}

          {/* Email cards grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
            {EMAIL_STAGES.map(t => {
              const isEditing = editId === t.id;
              const isSending = sending === t.id;
              const hasCustom = !!saved[t.id];

              return (
                <div key={t.id} style={{
                  background: "#fff", borderRadius: 6, overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  border: isEditing ? "2px solid #118849" : "2px solid transparent",
                  display: "flex", flexDirection: "column",
                }}>
                  {/* Card header */}
                  <div style={{ background: t.color, padding: "14px 18px" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 3 }}>{t.stage}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{t.icon} {t.label}</div>
                    {hasCustom && <div style={{ marginTop: 4, fontSize: 10, background: "rgba(255,255,255,0.2)", display: "inline-block", borderRadius: 3, padding: "1px 7px", color: "#fff" }}>✏️ Edited</div>}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "14px 18px", flex: 1 }}>
                    <p style={{ fontSize: 13, color: "#192943", lineHeight: 1.5, margin: "0 0 14px" }}>{t.desc}</p>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        onClick={() => { setPreview(preview === t.id ? null : t.id); setEditId(null); }}
                        style={{
                          flex: 1, minWidth: 70, padding: "7px 8px", background: "#eef2f6", border: "1px solid #d1d9e0",
                          borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          fontFamily: "'Open Sans',Arial,sans-serif", color: "#192943",
                        }}
                      >
                        {preview === t.id ? "Hide" : "Preview"}
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => isEditing ? cancelEdit() : startEdit(t.id)}
                          style={{
                            flex: 1, minWidth: 70, padding: "7px 8px",
                            background: isEditing ? "#fff5f5" : "#fff",
                            border: `1px solid ${isEditing ? "#fcc" : "#d1d9e0"}`,
                            borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            fontFamily: "'Open Sans',Arial,sans-serif",
                            color: isEditing ? "#c0392b" : "#192943",
                          }}
                        >
                          {isEditing ? "Cancel" : "✏️ Edit"}
                        </button>
                      )}

                      {canSend && (
                        <button
                          onClick={() => sendEmail(t.id)}
                          disabled={isSending || !selectedLead}
                          style={{
                            flex: 1, minWidth: 70, padding: "7px 8px",
                            background: selectedLead ? "#118849" : "#d1d9e0",
                            border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700,
                            cursor: selectedLead ? "pointer" : "not-allowed", color: "#fff",
                            fontFamily: "'Open Sans',Arial,sans-serif",
                            opacity: isSending ? 0.7 : 1,
                          }}
                        >
                          {isSending ? "Sending..." : "Send"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preview iframe */}
                  {preview === t.id && !isEditing && (
                    <div style={{ borderTop: "1px solid #eef2f6" }}>
                      <iframe
                        src={`/api/email/preview/${t.id}`}
                        style={{ width: "100%", height: 480, border: "none", display: "block" }}
                        title={`Preview ${t.label}`}
                      />
                    </div>
                  )}

                  {/* Edit panel */}
                  {isEditing && (
                    <div style={{ borderTop: "2px solid #118849", padding: 16 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#192943", marginBottom: 4 }}>Subject Line</label>
                      <input
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        style={{
                          width: "100%", padding: "8px 10px", border: "1px solid #dce4ed",
                          borderRadius: 4, fontSize: 13, marginBottom: 12, boxSizing: "border-box",
                          fontFamily: "'Open Sans',Arial,sans-serif",
                        }}
                      />
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#192943", marginBottom: 6 }}>Email Body</label>
                      <EmailEditor value={editBody} onChange={setEditBody} />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => saveEdit(t.id)}
                          disabled={savingId === t.id}
                          style={{
                            padding: "9px 20px", background: "#118849", border: "none", borderRadius: 4,
                            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                            fontFamily: "'Open Sans',Arial,sans-serif",
                          }}
                        >
                          {savingId === t.id ? "Saving..." : "💾 Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: "9px 16px", background: "transparent", border: "1px solid #dce4ed",
                            borderRadius: 4, color: "#5e708d", fontSize: 13, cursor: "pointer",
                            fontFamily: "'Open Sans',Arial,sans-serif",
                          }}
                        >Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Send Log */}
      {tab === "log" && (
        <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ background: "#192943", padding: "14px 20px" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>Email Send Log</h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#eef2f6" }}>
                {["Subject", "Stage", "Lead ID", "Sent By", "Date", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#5e708d", letterSpacing: "1px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 50).map((l, i) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #eef2f6", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#192943", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subject}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#5e708d" }}>{l.stage}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#5e708d", fontFamily: "monospace" }}>{l.leadId.slice(0, 8)}…</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#5e708d" }}>{l.sentBy === "auto" ? "🤖 Auto" : "👤 Manual"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#5e708d" }}>{(l.sentAt instanceof Date ? l.sentAt : new Date(typeof l.sentAt === "number" ? l.sentAt * 1000 : l.sentAt)).toLocaleDateString("en-ZA")}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: l.status === "sent" ? "#118849" : "#dc2626", color: "#fff" }}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "32px", textAlign: "center", fontSize: 14, color: "#5e708d" }}>No emails sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
