import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const STAGES = [
  { value: "initial_contact", label: "Initial Contact", color: "#0f326b" },
  { value: "product_intro",   label: "Product Intro",   color: "#192943" },
  { value: "demo_scheduling", label: "Demo Scheduling", color: "#5e708d" },
  { value: "follow_up",       label: "Follow-up",       color: "#f59e0b" },
  { value: "booked",          label: "Booked",          color: "#118849" },
  { value: "completed",       label: "Completed",       color: "#059669" },
  { value: "opted_out",       label: "Opted Out",       color: "#dc2626" },
];

const EMAIL_STAGES = [
  { value: "stage1",     label: "Stage 1: Initial Contact" },
  { value: "stage2",     label: "Stage 2: Product Introduction" },
  { value: "stage3",     label: "Stage 3: Demo Scheduling" },
  { value: "stage4_1",   label: "Follow-up #1 (24h)" },
  { value: "stage4_2",   label: "Follow-up #2 (48h)" },
  { value: "stage4_3",   label: "Follow-up #3 (72h)" },
  { value: "stage5",     label: "Stage 5: Booking Confirmation" },
  { value: "reminder24", label: "Reminder: 24h before demo" },
  { value: "reminder1",  label: "Reminder: 1h before demo" },
];

function fmtDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtShort(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA");
}

// ── vCard helpers ────────────────────────────────────────────────────
function generateVCard(lead: any): string {
  const nameParts = lead.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${lead.name}`,
    `N:${lastName};${firstName};;;`,
    lead.business ? `ORG:${lead.business}` : null,
    lead.email   ? `EMAIL;TYPE=WORK:${lead.email}` : null,
    lead.phone   ? `TEL;TYPE=CELL:${lead.phone}` : null,
    lead.notes   ? `NOTE:${String(lead.notes).replace(/\n/g, "\\n")}` : null,
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
  return lines;
}

function downloadVCard(lead: any) {
  const blob = new Blob([generateVCard(lead)], { type: "text/vcard;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${lead.name.replace(/[^a-zA-Z0-9]/g, "_")}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAllVCards(leads: any[]) {
  const combined = leads.map(generateVCard).join("\r\n");
  const blob = new Blob([combined], { type: "text/vcard;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "all_leads.vcf";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Lead Drawer ──────────────────────────────────────────────────────
function LeadDrawer({
  lead, user, onClose, onUpdate, onDelete,
}: {
  lead: any; user: any; onClose: () => void;
  onUpdate: (id: string, patch: any) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes]         = useState<any[]>([]);
  const [newNote, setNewNote]     = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody]   = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [stage, setStage]         = useState(lead.stage);
  const [sending, setSending]     = useState<string | null>(null);
  const [toast, setToast]         = useState("");
  const notesEndRef               = useRef<HTMLDivElement>(null);
  const [waLogs, setWaLogs]       = useState<any[]>([]);
  const [waModal, setWaModal]     = useState(false);
  const [waMsg, setWaMsg]         = useState("");
  const [waSending, setWaSending] = useState(false);

  const canEdit      = user && ["super_admin", "admin", "agent"].includes(user.role);
  const canDelete    = user && ["super_admin", "admin"].includes(user.role);
  const canWhatsApp  = user && ["super_admin", "admin"].includes(user.role);

  useEffect(() => {
    loadNotes();
    loadWaLogs();
  }, [lead.id]);

  const loadNotes = () =>
    api.get(`/leads/${lead.id}/notes`)
      .then(r => r.json())
      .then(d => setNotes(d.notes ?? []));

  const loadWaLogs = () =>
    api.get(`/leads/${lead.id}/whatsapp`)
      .then(r => r.json())
      .then(d => setWaLogs(d.logs ?? []));

  const sendWhatsApp = async () => {
    if (!waMsg.trim()) return;
    if (!user?.whatsappNumber) { showToast("⚠️ Set your WhatsApp number in Users first"); return; }
    const toRaw = (lead.phone ?? "").replace(/\D/g, "");
    if (!toRaw) { showToast("⚠️ This lead has no phone number"); return; }
    setWaSending(true);
    const fromRaw = user.whatsappNumber.replace(/\D/g, "");
    const url = `https://wa.me/${toRaw}?text=${encodeURIComponent(waMsg)}`;
    window.open(url, "_blank");
    await api.post("/whatsapp/log", {
      leadId: lead.id,
      toNumber: lead.phone,
      fromNumber: user.whatsappNumber,
      message: waMsg,
    });
    setWaSending(false);
    setWaModal(false);
    setWaMsg("");
    await loadWaLogs();
    showToast("✅ WhatsApp opened & logged");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    await api.post(`/leads/${lead.id}/notes`, { body: newNote.trim() });
    setNewNote("");
    await loadNotes();
    setSavingNote(false);
    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const saveEdit = async (noteId: string) => {
    if (!editBody.trim()) return;
    await api.put(`/leads/${lead.id}/notes/${noteId}`, { body: editBody.trim() });
    setEditingId(null);
    loadNotes();
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    await api.delete(`/leads/${lead.id}/notes/${noteId}`);
    loadNotes();
  };

  const changeStage = async (val: string) => {
    setStage(val);
    await api.put(`/leads/${lead.id}`, { stage: val });
    onUpdate(lead.id, { stage: val });
    showToast("Stage updated");
  };

  const sendEmail = async (emailStage: string) => {
    setSending(emailStage);
    const res = await api.post("/email/send", { leadId: lead.id, stage: emailStage });
    const data = await res.json();
    setSending(null);
    if (data.error) showToast("❌ " + data.error);
    else showToast("✅ Email sent!");
  };

  const meta = STAGES.find(s => s.value === stage);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,50,107,0.45)",
          zIndex: 300, backdropFilter: "blur(2px)",
        }}
      />

      {/* Responsive drawer styles */}
      <style>{`
        .lead-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 560px;
          background: #fff;
          z-index: 400;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 32px rgba(0,0,0,0.18);
          font-family: 'Open Sans', Arial, sans-serif;
        }
        @media (max-width: 600px) {
          .lead-drawer {
            width: 100vw;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
        }
      `}</style>

      {/* Drawer */}
      <div className="lead-drawer">
        {/* Header */}
        <div style={{
          background: "#192943", padding: "20px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{lead.name}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
              {lead.business ?? ""}{lead.business && lead.email ? " · " : ""}{lead.email}
            </div>
            {lead.phone && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                📞 {lead.phone}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={() => downloadVCard(lead)}
              title="Download vCard (.vcf)"
              style={{
                background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                borderRadius: 4, padding: "0 12px", height: 32, fontSize: 12,
                fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >📇 vCard</button>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
              borderRadius: 4, width: 32, height: 32, fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {toast && (
            <div style={{
              background: "#192943", color: "#fff", padding: "10px 16px",
              borderRadius: 4, fontSize: 13, fontWeight: 600, marginBottom: 16,
            }}>{toast}</div>
          )}

          {/* Stage + pipeline */}
          <Section title="CRM Stage">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {STAGES.map(s => (
                <button
                  key={s.value}
                  onClick={() => canEdit && changeStage(s.value)}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    border: "2px solid",
                    borderColor: stage === s.value ? s.color : "transparent",
                    background: stage === s.value ? s.color : "#f0f3f7",
                    color: stage === s.value ? "#fff" : "#5e708d",
                    cursor: canEdit ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                >{s.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#5e708d" }}>
              Currently: <strong style={{ color: meta?.color }}>{meta?.label}</strong>
              {" · "} Follow-ups: <strong>{lead.followUpCount}</strong>
              {" · "} Last email: <strong>{fmtShort(lead.lastEmailAt)}</strong>
            </div>
          </Section>

          {/* Send email */}
          {canEdit && (
            <Section title="Send Email">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EMAIL_STAGES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => sendEmail(s.value)}
                    disabled={!!sending || lead.optedOut}
                    style={{
                      padding: "6px 12px", fontSize: 12, fontWeight: 600,
                      background: sending === s.value ? "#d1fae5" : "#f0f3f7",
                      border: "1px solid #d1d9e0", borderRadius: 4,
                      color: "#192943", cursor: "pointer",
                      opacity: lead.optedOut ? 0.5 : 1,
                    }}
                  >
                    {sending === s.value ? "Sending…" : s.label}
                  </button>
                ))}
              </div>
              {lead.optedOut && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                  ⚠ This lead has opted out
                </div>
              )}
            </Section>
          )}

          {/* Lead details */}
          <Section title="Lead Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
              <Detail label="Source" value={lead.source ?? "manual"} />
              <Detail label="Added" value={fmtDate(lead.createdAt)} />
              <Detail label="Demo Date" value={lead.demoDate ?? "—"} />
              <Detail label="Demo Link" value={lead.demoLink ? (
                <a href={lead.demoLink} target="_blank" rel="noreferrer" style={{ color: "#0f326b" }}>Open link</a>
              ) : "—"} />
            </div>
          </Section>

          {/* Timestamped Notes */}
          <Section title={`Notes (${notes.length})`}>
            {/* Notes feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {notes.length === 0 && (
                <div style={{ fontSize: 13, color: "#9eafc2", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
                  No notes yet. Add the first one below.
                </div>
              )}
              {notes.map(n => {
                const isOwn = n.authorId === user?.id;
                const isAdminUser = ["super_admin", "admin"].includes(user?.role ?? "");
                const canAct = isOwn || isAdminUser;
                const wasEdited = n.updatedAt && n.updatedAt !== n.createdAt;
                return (
                  <div key={n.id} style={{
                    background: "#f7f9fc", border: "1px solid #e8edf3", borderRadius: 6,
                    padding: "12px 14px",
                  }}>
                    {/* Note meta */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: 8, gap: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", background: "#192943",
                          color: "#fff", fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {(n.authorName ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#192943" }}>
                            {n.authorName ?? "Unknown"}
                          </div>
                          <div style={{ fontSize: 11, color: "#9eafc2" }}>
                            {fmtDate(n.createdAt)}
                            {wasEdited && <span style={{ marginLeft: 6, fontStyle: "italic" }}>(edited)</span>}
                          </div>
                        </div>
                      </div>
                      {canAct && editingId !== n.id && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => { setEditingId(n.id); setEditBody(n.body); }}
                            style={btnStyle("#eef2f6", "#192943")}>Edit</button>
                          <button onClick={() => deleteNote(n.id)}
                            style={btnStyle("#fef2f2", "#dc2626")}>Delete</button>
                        </div>
                      )}
                    </div>

                    {/* Body or edit field */}
                    {editingId === n.id ? (
                      <div>
                        <textarea
                          value={editBody}
                          onChange={e => setEditBody(e.target.value)}
                          rows={3}
                          autoFocus
                          style={textareaStyle}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button onClick={() => saveEdit(n.id)} style={btnStyle("#118849", "#fff", true)}>Save</button>
                          <button onClick={() => setEditingId(null)} style={btnStyle("#eef2f6", "#192943")}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#192943", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                        {n.body}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={notesEndRef} />
            </div>

            {/* Add note */}
            {canEdit && (
              <div style={{ borderTop: "1px solid #e8edf3", paddingTop: 14 }}>
                <textarea
                  placeholder="Add a note…"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
                  rows={3}
                  style={textareaStyle}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#9eafc2" }}>Ctrl+Enter to save</span>
                  <button
                    onClick={addNote}
                    disabled={savingNote || !newNote.trim()}
                    style={{
                      padding: "8px 18px", background: "#118849", color: "#fff", border: "none",
                      borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      opacity: !newNote.trim() ? 0.5 : 1,
                    }}
                  >{savingNote ? "Saving…" : "Add Note"}</button>
                </div>
              </div>
            )}
          </Section>

          {/* WhatsApp */}
          <Section title={`WhatsApp${waLogs.length ? ` (${waLogs.length})` : ""}`}>
            {canWhatsApp && (
              <button
                onClick={() => setWaModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", background: "#25D366", color: "#fff",
                  border: "none", borderRadius: 4, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", marginBottom: waLogs.length ? 14 : 0,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send WhatsApp
              </button>
            )}
            {waLogs.length === 0 && (
              <p style={{ fontSize: 13, color: "#9eafc2", margin: 0 }}>No messages sent yet.</p>
            )}
            {waLogs.map(log => (
              <div key={log.id} style={{
                padding: "10px 12px", background: "#f0fdf4", borderRadius: 6,
                border: "1px solid #bbf7d0", marginBottom: 8,
              }}>
                <div style={{ fontSize: 13, color: "#192943", marginBottom: 4 }}>{log.message}</div>
                <div style={{ fontSize: 11, color: "#5e708d", display: "flex", gap: 12 }}>
                  <span>From: {log.fromNumber}</span>
                  <span>To: {log.toNumber}</span>
                  <span>{log.sentByName}</span>
                  <span>{log.sentAt ? (() => {
                    const d = typeof log.sentAt === "number" ? new Date(log.sentAt * 1000) : new Date(log.sentAt);
                    return isNaN(d.getTime()) ? "" : d.toLocaleString("en-ZA", { dateStyle: "short", timeStyle: "short" });
                  })() : ""}</span>
                </div>
              </div>
            ))}
          </Section>

          {/* Danger zone */}
          {canDelete && (
            <Section title="Danger Zone">
              <button
                onClick={() => { if (confirm(`Delete ${lead.name}?`)) { onDelete(lead.id); onClose(); } }}
                style={{
                  padding: "8px 16px", background: "#fef2f2", border: "1px solid #fecaca",
                  color: "#dc2626", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >Delete Lead</button>
            </Section>
          )}
        </div>
      </div>

      {/* WhatsApp compose modal */}
      {waModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,50,107,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
        }}>
          <div style={{
            background: "#fff", borderRadius: 6, width: 480, maxWidth: "94vw",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ background: "#25D366", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Send WhatsApp</span>
              </div>
              <button onClick={() => setWaModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "24px" }}>
              {/* Info row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div style={{ background: "#f5f8ff", padding: "10px 14px", borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: "#5e708d", fontWeight: 600, marginBottom: 3 }}>FROM (Your WA)</div>
                  <div style={{ fontSize: 13, color: "#192943", fontWeight: 600 }}>
                    {user?.whatsappNumber
                      ? <span style={{ color: "#15803d" }}>{user.whatsappNumber}</span>
                      : <span style={{ color: "#dc2626" }}>⚠ Not set — go to Users</span>
                    }
                  </div>
                </div>
                <div style={{ background: "#f5f8ff", padding: "10px 14px", borderRadius: 4 }}>
                  <div style={{ fontSize: 11, color: "#5e708d", fontWeight: 600, marginBottom: 3 }}>TO (Lead Phone)</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {lead.phone
                      ? <span style={{ color: "#192943" }}>{lead.phone}</span>
                      : <span style={{ color: "#dc2626" }}>⚠ No phone on lead</span>
                    }
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 6 }}>Message</label>
                <textarea
                  value={waMsg}
                  onChange={e => setWaMsg(e.target.value)}
                  rows={5}
                  placeholder={`Hi ${lead.name}, ...`}
                  style={{
                    width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0",
                    borderRadius: 4, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif",
                    color: "#192943", boxSizing: "border-box", resize: "vertical",
                  }}
                />
              </div>

              <p style={{ fontSize: 12, color: "#9eafc2", margin: "0 0 18px" }}>
                This opens WhatsApp Web/app with your message pre-filled. The send will be logged automatically.
              </p>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={sendWhatsApp}
                  disabled={waSending || !waMsg.trim() || !user?.whatsappNumber || !lead.phone}
                  style={{
                    flex: 1, padding: "12px", background: "#25D366", color: "#fff",
                    border: "none", borderRadius: 4, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Open Sans',Arial,sans-serif",
                    cursor: (!waMsg.trim() || !user?.whatsappNumber || !lead.phone) ? "not-allowed" : "pointer",
                    opacity: (!waMsg.trim() || !user?.whatsappNumber || !lead.phone) ? 0.5 : 1,
                  }}
                >
                  {waSending ? "Opening…" : "Open in WhatsApp & Log"}
                </button>
                <button onClick={() => setWaModal(false)} style={{
                  padding: "12px 20px", background: "#eef2f6", color: "#192943",
                  border: "none", borderRadius: 4, fontSize: 14, fontWeight: 600,
                  fontFamily: "'Open Sans',Arial,sans-serif", cursor: "pointer",
                }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Small helpers ────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#5e708d", textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 10, paddingBottom: 6,
        borderBottom: "1px solid #e8edf3",
      }}>{title}</div>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9eafc2", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#192943", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0", borderRadius: 4,
  fontSize: 13, fontFamily: "'Open Sans', Arial, sans-serif", color: "#192943",
  boxSizing: "border-box", resize: "vertical", lineHeight: 1.5,
  background: "#fff",
};

function btnStyle(bg: string, color: string, solid = false): React.CSSProperties {
  return {
    padding: "4px 10px", background: bg, color, border: solid ? "none" : `1px solid ${bg === "#eef2f6" ? "#d1d9e0" : bg}`,
    borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Open Sans', Arial, sans-serif",
  };
}

// ── Main Page ────────────────────────────────────────────────────────
export default function Leads() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [user, setUser]         = useState<any>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [sending, setSending]   = useState<string | null>(null);
  const [toast, setToast]       = useState("");
  const [search, setSearch]     = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm]         = useState({ name: "", email: "", phone: "", business: "", source: "manual", notes: "" });
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState("");

  const checkGoogleStatus = () =>
    api.get("/google/status").then(r => r.json()).then(d => {
      setGoogleConnected(d.connected);
      setGoogleConfigured(d.configured);
    }).catch(() => {});

  useEffect(() => {
    load();
    api.get("/me").then(r => r.json()).then(d => setUser(d.user));
    checkGoogleStatus();

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "google-auth-success") {
        checkGoogleStatus();
        showToast("Google Contacts connected!");
      } else if (e.data?.type === "google-auth-error") {
        showToast("Google connection failed. Please try again.");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const load = () =>
    api.get("/leads").then(r => r.json()).then(d => setLeads(d.leads ?? []));

  const connectGoogle = async () => {
    const res = await api.get("/google/auth-url").then(r => r.json());
    if (res.error) { showToast("Google not configured yet."); return; }
    const popup = window.open(res.url, "google-auth", "width=500,height=600,left=200,top=100");
    if (!popup) showToast("Please allow popups for this site.");
  };

  const disconnectGoogle = async () => {
    await api.delete("/google/disconnect");
    setGoogleConnected(false);
    showToast("Google Contacts disconnected.");
  };

  const syncToGoogle = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg("");
    try {
      const leadIds = filtered.map((l: any) => l.id);
      const res = await api.post("/google/sync", { leadIds }).then(r => r.json());
      if (res.error === "not_connected") {
        showToast("Connect Google Contacts first.");
      } else {
        setSyncMsg(`✓ ${res.created} synced${res.failed ? `, ${res.failed} failed` : ""}`);
        setTimeout(() => setSyncMsg(""), 5000);
      }
    } catch {
      showToast("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/leads", { ...form });
    setShowAdd(false);
    setForm({ name: "", email: "", phone: "", business: "", source: "manual", notes: "" });
    load();
    showToast("Lead added successfully");
  };

  const sendEmail = async (leadId: string, stage: string) => {
    setSending(leadId + stage);
    const res = await api.post("/email/send", { leadId, stage });
    const data = await res.json();
    setSending(null);
    if (data.error) showToast("❌ " + data.error);
    else { showToast("✅ Email sent!"); load(); }
  };

  const deleteLead = async (id: string) => {
    await api.delete(`/leads/${id}`);
    load();
    showToast("Lead deleted");
  };

  const handleUpdate = (id: string, patch: any) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    if (selected?.id === id) setSelected((p: any) => ({ ...p, ...patch }));
  };

  const canEdit = user && ["super_admin", "admin", "agent"].includes(user.role);
  const canDelete = user && ["super_admin", "admin"].includes(user.role);
  const showCreatedBy = user && ["super_admin", "admin"].includes(user.role);

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.business ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q);
    const matchStage = stageFilter === "all" || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <Layout>
      <style>{`
        .leads-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .leads-filters {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .leads-search {
          flex: 1;
          min-width: 140px;
          max-width: 300px;
        }
        /* Desktop table */
        .leads-table-wrap {
          background: #fff;
          border-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        .leads-table {
          width: max-content;
          min-width: 100%;
          border-collapse: collapse;
        }
        .leads-table th,
        .leads-table td {
          white-space: nowrap;
        }
        .leads-cards {
          display: none;
        }
        /* Tablet + Mobile cards */
        @media (max-width: 1024px) {
          .leads-table-wrap {
            display: none;
          }
          .leads-cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .lead-card {
            background: #fff;
            border-radius: 6px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.07);
            padding: 14px 16px;
            cursor: pointer;
            border-left: 4px solid #5e708d;
            transition: box-shadow 0.15s;
          }
          .lead-card:active {
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          }
          .lead-card-selected {
            border-left-color: #118849;
            background: #f0fdf4;
          }
          .lead-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 8px;
          }
          .lead-card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            font-size: 12px;
            color: #5e708d;
          }
          .lead-card-actions {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eef2f6;
          }
          .leads-filters {
            gap: 8px;
          }
          .leads-search {
            max-width: 100%;
            min-width: 0;
          }
          .leads-header h1 {
            font-size: 18px !important;
          }
        }
      `}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 72, right: 16, zIndex: 9999,
          background: "#192943", color: "#fff", padding: "12px 20px",
          borderRadius: 4, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          maxWidth: "calc(100vw - 32px)",
        }}>{toast}</div>
      )}

      <div className="leads-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Lead Pipeline</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>{leads.length} total leads · tap a row to open CRM</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {syncMsg && (
            <span style={{ fontSize: 13, color: "#118849", fontWeight: 600 }}>{syncMsg}</span>
          )}
          {googleConfigured && (
            googleConnected ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={syncToGoogle}
                  disabled={syncing}
                  title={`Sync ${filtered.length} visible leads to Google Contacts`}
                  style={{
                    background: "#4285f4", color: "#fff", border: "none", borderRadius: 3,
                    padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: syncing ? "wait" : "pointer",
                    fontFamily: "'Open Sans', Arial, sans-serif", whiteSpace: "nowrap", opacity: syncing ? 0.7 : 1,
                  }}
                >{syncing ? "Syncing…" : `🔄 Sync to Google (${filtered.length})`}</button>
                <button
                  onClick={disconnectGoogle}
                  title="Disconnect Google Contacts"
                  style={{
                    background: "#fff", color: "#5e708d", border: "1px solid #d1d9e0", borderRadius: 3,
                    padding: "10px 10px", fontSize: 13, cursor: "pointer",
                    fontFamily: "'Open Sans', Arial, sans-serif",
                  }}
                >✕ Google</button>
              </div>
            ) : (
              <button
                onClick={connectGoogle}
                style={{
                  background: "#fff", color: "#192943", border: "1px solid #d1d9e0", borderRadius: 3,
                  padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Open Sans', Arial, sans-serif", whiteSpace: "nowrap",
                }}
              >🔗 Connect Google Contacts</button>
            )
          )}
          <button
            onClick={() => downloadAllVCards(filtered)}
            title="Download all visible leads as vCards"
            style={{
              background: "#5e708d", color: "#fff", border: "none", borderRadius: 3,
              padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Open Sans', Arial, sans-serif", whiteSpace: "nowrap",
            }}
          >📇 Download All</button>
          {canEdit && (
            <button onClick={() => setShowAdd(true)} style={{
              background: "#118849", color: "#fff", border: "none", borderRadius: 3,
              padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Open Sans', Arial, sans-serif", whiteSpace: "nowrap",
            }}>+ Add Lead</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="leads-filters">
        <input
          className="leads-search"
          placeholder="Search leads…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            padding: "9px 14px", border: "1px solid #d1d9e0", borderRadius: 3,
            fontSize: 14, fontFamily: "'Open Sans', Arial, sans-serif",
            color: "#192943", width: "100%",
          }}
        />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{
          padding: "9px 14px", border: "1px solid #d1d9e0", borderRadius: 3,
          fontSize: 14, fontFamily: "'Open Sans', Arial, sans-serif", color: "#192943",
        }}>
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="leads-table-wrap">
        <table className="leads-table">
          <thead>
            <tr style={{ background: "#192943" }}>
              {["Name", "Business", "Email", "Phone", "Stage", "Follow-ups", "Last Email", ...(showCreatedBy ? ["Created By"] : []), "Actions"].map(h => (
                <th key={h} style={{
                  padding: "9px 10px", textAlign: "left", fontSize: 10,
                  fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => {
              const meta = STAGES.find(s => s.value === l.stage);
              const isSelected = selected?.id === l.id;
              return (
                <tr
                  key={l.id}
                  onClick={() => setSelected(l)}
                  style={{
                    borderBottom: "1px solid #eef2f6",
                    background: isSelected ? "#eef6ff" : i % 2 === 0 ? "#fff" : "#fafbfc",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f5f8ff"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "#fff" : "#fafbfc"; }}
                >
                  <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "#192943" }}>{l.name}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#5e708d" }}>{l.business ?? "—"}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#5e708d" }}>{l.email}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#5e708d" }}>{l.phone ?? "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: meta?.color ?? "#eef2f6", color: "#fff",
                    }}>{meta?.label ?? l.stage}</span>
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#192943", textAlign: "center" }}>
                    {l.followUpCount}
                    {l.followUpCount >= 3 && l.stage === "follow_up" && (
                      <span style={{
                        marginLeft: 4, padding: "1px 6px", borderRadius: 8, fontSize: 10,
                        fontWeight: 700, background: "#dc2626", color: "#fff", verticalAlign: "middle",
                      }}>Needs Human</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12, color: "#5e708d" }}>{fmtShort(l.lastEmailAt)}</td>
                  {showCreatedBy && (
                    <td style={{ padding: "8px 10px", fontSize: 12, color: "#5e708d" }}>
                      {l.createdByName ?? <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                  )}
                  <td style={{ padding: "8px 10px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {canEdit && (
                        <select
                          onChange={e => { if (e.target.value) sendEmail(l.id, e.target.value); e.target.value = ""; }}
                          disabled={!!sending || l.optedOut}
                          style={{
                            padding: "5px 8px", fontSize: 12, border: "1px solid #d1d9e0",
                            borderRadius: 3, fontFamily: "'Open Sans',Arial,sans-serif",
                            color: "#192943", cursor: "pointer", maxWidth: 160,
                          }}
                        >
                          <option value="">Send Email…</option>
                          {EMAIL_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      )}
                      <button
                        onClick={() => downloadVCard(l)}
                        title="Download vCard"
                        style={{
                          padding: "5px 8px", fontSize: 12, border: "1px solid #d1d9e0",
                          borderRadius: 3, background: "#f0f3f7", color: "#192943",
                          cursor: "pointer", whiteSpace: "nowrap",
                        }}
                      >📇</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={showCreatedBy ? 9 : 8} style={{ padding: "32px", textAlign: "center", fontSize: 14, color: "#5e708d" }}>
                No leads found. Add your first lead to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="leads-cards">
        {filtered.map(l => {
          const meta = STAGES.find(s => s.value === l.stage);
          const isSelected = selected?.id === l.id;
          return (
            <div
              key={l.id}
              className={`lead-card${isSelected ? " lead-card-selected" : ""}`}
              style={{ borderLeftColor: meta?.color ?? "#5e708d" }}
              onClick={() => setSelected(l)}
            >
              <div className="lead-card-top">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#192943", marginBottom: 2 }}>{l.name}</div>
                  {l.business && <div style={{ fontSize: 12, color: "#5e708d", marginBottom: 2 }}>{l.business}</div>}
                  <div style={{ fontSize: 12, color: "#5e708d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.email}</div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: meta?.color ?? "#eef2f6", color: "#fff", whiteSpace: "nowrap", flexShrink: 0,
                }}>{meta?.label ?? l.stage}</span>
              </div>
              <div className="lead-card-meta">
                {l.phone && <span>📞 {l.phone}</span>}
                <span>Follow-ups: {l.followUpCount}</span>
                {l.followUpCount >= 3 && l.stage === "follow_up" && (
                  <span style={{
                    padding: "2px 7px", borderRadius: 8, fontSize: 10,
                    fontWeight: 700, background: "#dc2626", color: "#fff",
                  }}>Needs Human</span>
                )}
                {l.lastEmailAt && <span>Last email: {fmtShort(l.lastEmailAt)}</span>}
              </div>
              <div className="lead-card-actions" onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                {canEdit && (
                  <select
                    onChange={e => { if (e.target.value) sendEmail(l.id, e.target.value); e.target.value = ""; }}
                    disabled={!!sending || l.optedOut}
                    style={{
                      flex: 1, padding: "7px 10px", fontSize: 13, border: "1px solid #d1d9e0",
                      borderRadius: 3, fontFamily: "'Open Sans',Arial,sans-serif",
                      color: "#192943", cursor: "pointer",
                    }}
                  >
                    <option value="">Send Email…</option>
                    {EMAIL_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                )}
                <button
                  onClick={() => downloadVCard(l)}
                  title="Download vCard"
                  style={{
                    padding: "7px 12px", fontSize: 13, border: "1px solid #d1d9e0",
                    borderRadius: 3, background: "#f0f3f7", color: "#192943", cursor: "pointer",
                  }}
                >📇</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", fontSize: 14, color: "#5e708d", background: "#fff", borderRadius: 4 }}>
            No leads found. Add your first lead to get started.
          </div>
        )}
      </div>

      {/* CRM Drawer */}
      {selected && (
        <LeadDrawer
          lead={selected}
          user={user}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={deleteLead}
        />
      )}

      {/* Add lead modal */}
      {showAdd && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,50,107,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }}>
          <div style={{ background: "#fff", borderRadius: 4, padding: "32px", width: 500, maxWidth: "90vw", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: "#192943" }}>Add New Lead</h2>
            <form onSubmit={addLead}>
              {[
                { label: "Full Name *", key: "name", type: "text", placeholder: "Thabo Nkosi" },
                { label: "Email Address *", key: "email", type: "email", placeholder: "thabo@example.co.za" },
                { label: "Phone", key: "phone", type: "tel", placeholder: "+27 82 000 0000" },
                { label: "Business Name", key: "business", type: "text", placeholder: "TechBuild Solutions" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 5 }}>{f.label}</label>
                  <input
                    type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    required={f.label.includes("*")}
                    style={{
                      width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0",
                      borderRadius: 3, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif",
                      color: "#192943", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 5 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Any relevant notes..."
                  style={{
                    width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0",
                    borderRadius: 3, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif",
                    color: "#192943", boxSizing: "border-box", resize: "vertical",
                  }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="submit" style={{
                  flex: 1, padding: "12px", background: "#118849", color: "#fff",
                  border: "none", borderRadius: 3, fontSize: 14, fontWeight: 700,
                  fontFamily: "'Open Sans',Arial,sans-serif", cursor: "pointer",
                }}>Add Lead</button>
                <button type="button" onClick={() => setShowAdd(false)} style={{
                  padding: "12px 20px", background: "#eef2f6", color: "#192943",
                  border: "none", borderRadius: 3, fontSize: 14, fontWeight: 600,
                  fontFamily: "'Open Sans',Arial,sans-serif", cursor: "pointer",
                }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
