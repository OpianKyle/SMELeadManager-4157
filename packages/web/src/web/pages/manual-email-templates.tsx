import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";
import { EmailEditor } from "@/components/email-editor";

const STAGES = [
  { value: "attempt1",            label: "Connection Attempt #1",              desc: "First outreach to a new lead" },
  { value: "attempt2",            label: "Connection Attempt #2 (24h)",        desc: "Follow-up if no reply after 24 hours" },
  { value: "final_attempt",       label: "Final Attempt / Hold (48h)",         desc: "Last try before moving to hold" },
  { value: "callback_confirm",    label: "Callback Confirmation",              desc: "Confirms a scheduled callback with the lead" },
  { value: "reminder24",          label: "Onboarding Reminder: 24h before",   desc: "Sent 24 hours before the demo / onboarding" },
  { value: "reminder1",           label: "Onboarding Reminder: 1h before",    desc: "Sent 1 hour before the demo / onboarding" },
  { value: "missed_appt",         label: "Missed Appointment",                 desc: "Sent when a lead misses their scheduled slot" },
  { value: "onboarding_complete", label: "Onboarding Complete",                desc: "Confirmation once onboarding is done" },
];

export default function ManualEmailTemplates() {
  const [templates, setTemplates] = useState<Record<string, { subject: string; bodyHtml: string }>>({});
  const [edits, setEdits]         = useState<Record<string, { subject: string; bodyHtml: string }>>({});
  const [fetching, setFetching]   = useState(true);
  const [saving, setSaving]       = useState<Record<string, boolean>>({});
  const [saved, setSaved]         = useState<Record<string, boolean>>({});
  const [modal, setModal]         = useState<{ stageValue: string; tab: "preview" | "edit" } | null>(null);
  const [htmlMode, setHtmlMode]   = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    load();
    api.get("/me").then(r => r.json()).then(d => setCurrentUser(d.user));
  }, []);

  const canEdit = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const load = () => {
    setFetching(true);
    api.get("/email/templates").then(r => r.json()).then(d => {
      const tplMap: Record<string, { subject: string; bodyHtml: string }> = {};
      for (const t of (d.templates ?? [])) {
        tplMap[t.stageId] = { subject: t.subject, bodyHtml: t.bodyHtml };
      }
      setTemplates(tplMap);
      const init: Record<string, { subject: string; bodyHtml: string }> = {};
      for (const s of STAGES) {
        init[s.value] = tplMap[s.value] ?? { subject: "", bodyHtml: "" };
      }
      setEdits(init);
      setFetching(false);
    });
  };

  const patch = (stageValue: string, field: "subject" | "bodyHtml", val: string) => {
    setEdits(prev => ({ ...prev, [stageValue]: { ...prev[stageValue], [field]: val } }));
  };

  const save = async (stageValue: string) => {
    const e = edits[stageValue];
    if (!e) return;
    setSaving(s => ({ ...s, [stageValue]: true }));
    await api.put(`/email/templates/${stageValue}`, { subject: e.subject, bodyHtml: e.bodyHtml });
    setTemplates(prev => ({ ...prev, [stageValue]: { subject: e.subject, bodyHtml: e.bodyHtml } }));
    setSaving(s => ({ ...s, [stageValue]: false }));
    setSaved(s => ({ ...s, [stageValue]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [stageValue]: false })), 1500);
  };

  const modalStage = modal ? STAGES.find(s => s.value === modal.stageValue) : null;
  const modalEdit  = modal ? edits[modal.stageValue] : null;

  return (
    <Layout>
      <style>{`
        .mt-row { background:#fff; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.07);
          margin-bottom:10px; padding:16px 20px; }
        .mt-subject-input { width:100%; padding:7px 10px; border:1px solid #d1d9e0; border-radius:3px;
          font-size:13px; font-family:'Open Sans',Arial,sans-serif; }
        .mt-subject-input:focus { outline:none; border-color:#118849; }
        .mt-save-btn { padding:6px 16px; background:#118849; color:#fff; border:none; border-radius:3px;
          font-size:12px; font-weight:700; cursor:pointer; font-family:'Open Sans',Arial,sans-serif; white-space:nowrap; }
        .mt-save-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .mt-ghost-btn { padding:6px 14px; background:#f0f3f7; color:#192943; border:1px solid #d1d9e0;
          border-radius:3px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Open Sans',Arial,sans-serif; white-space:nowrap; }
        .mt-overlay { position:fixed;inset:0;background:rgba(15,50,107,0.8);
          display:flex;align-items:center;justify-content:center;z-index:300; }
        .mt-modal { background:#fff;border-radius:6px;width:90vw;max-width:780px;
          max-height:90vh;display:flex;flex-direction:column;position:relative; }
        .mt-modal-header { padding:16px 20px;border-bottom:1px solid #eef2f6;
          display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
        .mt-modal-tabs { display:flex;border-bottom:1px solid #eef2f6;flex-shrink:0; }
        .mt-tab { padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;border:none;
          background:none;font-family:'Open Sans',Arial,sans-serif;color:#5e708d;
          border-bottom:2px solid transparent;margin-bottom:-1px; }
        .mt-tab.active { color:#0f326b;border-bottom-color:#0f326b; }
        .mt-modal-body { flex:1;overflow:auto; }
        .mt-body-textarea { width:100%;height:100%;min-height:360px;padding:16px;
          font-family:'Courier New',monospace;font-size:12px;line-height:1.6;
          border:none;outline:none;resize:none;color:#192943;box-sizing:border-box; }
        .mt-default-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;
          background:#fff8e1;border:1px solid #fcd34d;border-radius:10px;
          font-size:11px;font-weight:600;color:#92400e; }
        .mt-custom-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;
          background:#f0fdf4;border:1px solid #6ee7b7;border-radius:10px;
          font-size:11px;font-weight:600;color:#065f46; }
      `}</style>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#192943" }}>Manual Email Templates</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#5e708d" }}>
            These are the emails agents send manually from a lead's profile. Edit the subject and body for each one.
          </p>
        </div>
        {!canEdit && (
          <span style={{ padding:"6px 14px", background:"#eef2f6", borderRadius:3, fontSize:12, fontWeight:600, color:"#5e708d" }}>View only</span>
        )}
      </div>

      {/* Placeholder hint */}
      <div style={{ background:"#f0f6ff", border:"1px solid #c7d8f5", borderRadius:4, padding:"10px 16px", marginBottom:20, fontSize:13, color:"#192943" }}>
        <strong>Available placeholders:</strong>&nbsp;
        <code style={{ background:"#dbeafe", padding:"1px 6px", borderRadius:3, fontSize:12 }}>{"{{name}}"}</code> — lead's name &nbsp;·&nbsp;
        <code style={{ background:"#dbeafe", padding:"1px 6px", borderRadius:3, fontSize:12 }}>{"{{business}}"}</code> — lead's business name
      </div>

      {fetching ? (
        <div style={{ textAlign:"center", padding:40, color:"#5e708d" }}>Loading…</div>
      ) : (
        STAGES.map((stage, i) => {
          const e = edits[stage.value] ?? { subject: "", bodyHtml: "" };
          const isCustom  = !!templates[stage.value];
          const isSaving  = saving[stage.value];
          const isSaved   = saved[stage.value];
          const orig      = templates[stage.value];
          const isDirty   = !orig
            ? (e.subject.trim() !== "" || e.bodyHtml.trim() !== "")
            : (e.subject !== orig.subject || e.bodyHtml !== orig.bodyHtml);

          return (
            <div key={stage.value} className="mt-row">
              {/* Row header */}
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:12, flexWrap:"wrap" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#9eafc2", background:"#f4f6f9",
                      padding:"2px 8px", borderRadius:10, letterSpacing:"0.5px" }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontSize:14, fontWeight:700, color:"#192943" }}>{stage.label}</span>
                    {isCustom
                      ? <span className="mt-custom-badge">✓ Custom</span>
                      : <span className="mt-default-badge">⚠ Using default</span>
                    }
                  </div>
                  <div style={{ fontSize:12, color:"#9eafc2", marginTop:3 }}>{stage.desc}</div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
                  <button className="mt-ghost-btn" onClick={() => setModal({ stageValue: stage.value, tab: "preview" })}>
                    Preview
                  </button>
                  {canEdit && (
                    <button className="mt-ghost-btn" onClick={() => setModal({ stageValue: stage.value, tab: "edit" })}>
                      Edit Body
                    </button>
                  )}
                  {canEdit && (
                    <button
                      className="mt-save-btn"
                      disabled={!isDirty || isSaving}
                      onClick={() => save(stage.value)}
                    >
                      {isSaving ? "Saving…" : isSaved ? "✓ Saved" : "Save"}
                    </button>
                  )}
                </div>
              </div>

              {/* Subject line */}
              {canEdit ? (
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#9eafc2", letterSpacing:"0.5px", textTransform:"uppercase", display:"block", marginBottom:4 }}>
                    Subject line
                  </label>
                  <input
                    className="mt-subject-input"
                    value={e.subject}
                    onChange={ev => patch(stage.value, "subject", ev.target.value)}
                    placeholder={isCustom ? "" : "Using hardcoded default — enter a subject to override"}
                  />
                </div>
              ) : (
                <div style={{ fontSize:13, color:"#192943" }}>
                  <span style={{ fontWeight:600, color:"#9eafc2", marginRight:8 }}>Subject:</span>
                  {e.subject || <em style={{ color:"#9eafc2" }}>Using default</em>}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal */}
      {modal && modalStage && modalEdit && (
        <div className="mt-overlay" onClick={() => setModal(null)}>
          <div className="mt-modal" onClick={e => e.stopPropagation()}>
            <div className="mt-modal-header">
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:"#192943" }}>{modalStage.label}</div>
                <div style={{ fontSize:12, color:"#9eafc2", marginTop:2 }}>{modalEdit.subject || "No subject set"}</div>
              </div>
              <button onClick={() => setModal(null)} style={{
                background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9eafc2", lineHeight:1, padding:4,
              }}>✕</button>
            </div>
            <div className="mt-modal-tabs">
              <button className={`mt-tab${modal.tab === "preview" ? " active" : ""}`} onClick={() => setModal(m => m ? { ...m, tab:"preview" } : m)}>Preview</button>
              {canEdit && (
                <button className={`mt-tab${modal.tab === "edit" ? " active" : ""}`} onClick={() => setModal(m => m ? { ...m, tab:"edit" } : m)}>Edit</button>
              )}
            </div>
            <div className="mt-modal-body">
              {modal.tab === "preview" ? (
                modalEdit.bodyHtml ? (
                  <iframe
                    srcDoc={modalEdit.bodyHtml}
                    style={{ width:"100%", minHeight:400, border:"none" }}
                    title="Email preview"
                  />
                ) : (
                  <div style={{ padding:40, textAlign:"center", color:"#9eafc2", fontSize:14 }}>
                    No custom template saved yet — the default hardcoded email will be sent.<br />
                    <span style={{ fontSize:12 }}>Use the Edit tab to create a custom one.</span>
                  </div>
                )
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderBottom:"1px solid #eef2f6", flexShrink:0 }}>
                    <span style={{ fontSize:12, color:"#9eafc2" }}>Editor mode:</span>
                    <button
                      onClick={() => setHtmlMode(false)}
                      style={{ padding:"4px 10px", fontSize:12, fontWeight:600, borderRadius:3, cursor:"pointer",
                        background: !htmlMode ? "#0f326b" : "#f0f3f7", color: !htmlMode ? "#fff" : "#192943",
                        border:"1px solid #d1d9e0", fontFamily:"'Open Sans',Arial,sans-serif" }}
                    >Visual</button>
                    <button
                      onClick={() => setHtmlMode(true)}
                      style={{ padding:"4px 10px", fontSize:12, fontWeight:600, borderRadius:3, cursor:"pointer",
                        background: htmlMode ? "#0f326b" : "#f0f3f7", color: htmlMode ? "#fff" : "#192943",
                        border:"1px solid #d1d9e0", fontFamily:"'Open Sans',Arial,sans-serif" }}
                    >HTML</button>
                  </div>
                  {htmlMode ? (
                    <textarea
                      className="mt-body-textarea"
                      value={modalEdit.bodyHtml}
                      onChange={e => patch(modal.stageValue, "bodyHtml", e.target.value)}
                    />
                  ) : (
                    <div style={{ padding:12 }}>
                      <EmailEditor
                        value={modalEdit.bodyHtml}
                        onChange={html => patch(modal.stageValue, "bodyHtml", html)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            {canEdit && modal.tab === "edit" && (
              <div style={{ padding:"12px 20px", borderTop:"1px solid #eef2f6", display:"flex", justifyContent:"flex-end", gap:8, flexShrink:0 }}>
                <button className="mt-ghost-btn" onClick={() => setModal(m => m ? { ...m, tab:"preview" } : m)}>Preview</button>
                <button
                  className="mt-save-btn"
                  disabled={saving[modal.stageValue]}
                  onClick={async () => { await save(modal.stageValue); setModal(m => m ? { ...m, tab:"preview" } : m); }}
                >
                  {saving[modal.stageValue] ? "Saving…" : "Save & Preview"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
