import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

export default function EmailCampaign() {
  const [steps, setSteps] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<{ step: any; tab: "preview" | "edit" } | null>(null);
  const [edits, setEdits] = useState<Record<string, { delayDays: string; subject: string; enabled: boolean; bodyHtml: string }>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    load();
    api.get("/me").then(r => r.json()).then(d => setCurrentUser(d.user));
  }, []);

  const canEdit = currentUser?.role === "super_admin";

  const load = () => {
    setFetching(true);
    api.get("/campaign-steps").then(r => r.json()).then(d => {
      setSteps(d.steps ?? []);
      const init: Record<string, any> = {};
      for (const s of (d.steps ?? [])) {
        init[s.id] = { delayDays: String(s.delayDays), subject: s.subject, enabled: !!s.enabled, bodyHtml: s.bodyHtml ?? "" };
      }
      setEdits(init);
      setFetching(false);
    });
  };

  const save = async (step: any) => {
    const e = edits[step.id];
    if (!e) return;
    setSaving(s => ({ ...s, [step.id]: true }));
    await api.put(`/campaign-steps/${step.id}`, {
      delayDays: parseInt(e.delayDays) || 0,
      subject: e.subject,
      enabled: e.enabled,
      bodyHtml: e.bodyHtml,
    });
    setSteps(prev => prev.map(s => s.id === step.id ? { ...s, bodyHtml: e.bodyHtml, subject: e.subject, delayDays: parseInt(e.delayDays) || 0, enabled: e.enabled } : s));
    setSaving(s => ({ ...s, [step.id]: false }));
    setSaved(s => ({ ...s, [step.id]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [step.id]: false })), 1500);
  };

  const toggleAll = async (enabled: boolean) => {
    for (const step of steps) {
      setEdits(e => ({ ...e, [step.id]: { ...e[step.id], enabled } }));
      await api.put(`/campaign-steps/${step.id}`, { enabled });
    }
  };

  const enabledCount = steps.filter(s => edits[s.id]?.enabled ?? s.enabled).length;

  const cumDays: number[] = [];
  let total = 0;
  for (const s of steps) {
    const e = edits[s.id];
    const delay = parseInt(e?.delayDays ?? String(s.delayDays)) || 0;
    total += delay;
    cumDays.push(total);
  }

  const modalStep = modal?.step;
  const modalEdit = modalStep ? edits[modalStep.id] : null;

  return (
    <Layout>
      <style>{`
        .ec-row { background:#fff; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.07);
          margin-bottom:8px; padding:14px 18px; display:flex; align-items:center; gap:14px; }
        .ec-num { width:28px; height:28px; border-radius:50%; background:#0f326b; color:#fff;
          font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .ec-row.disabled { opacity:0.5; }
        .ec-delay-input { width:60px; padding:5px 8px; border:1px solid #d1d9e0; border-radius:3px;
          font-size:13px; font-family:'Open Sans',Arial,sans-serif; text-align:center; }
        .ec-delay-input:focus { outline:none; border-color:#118849; }
        .ec-subject-input { flex:1; padding:5px 10px; border:1px solid #d1d9e0; border-radius:3px;
          font-size:13px; font-family:'Open Sans',Arial,sans-serif; min-width:0; }
        .ec-subject-input:focus { outline:none; border-color:#118849; }
        .ec-save-btn { padding:5px 14px; background:#118849; color:#fff; border:none; border-radius:3px;
          font-size:12px; font-weight:700; cursor:pointer; font-family:'Open Sans',Arial,sans-serif;
          white-space:nowrap; flex-shrink:0; }
        .ec-save-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .toggle-pill { position:relative; width:36px; height:20px; flex-shrink:0; cursor:pointer; }
        .toggle-pill input { opacity:0; width:0; height:0; position:absolute; }
        .toggle-track { position:absolute; inset:0; border-radius:10px; transition:background 0.15s; background:#d1d9e0; }
        .toggle-pill input:checked + .toggle-track { background:#118849; }
        .toggle-track:before { content:""; position:absolute; width:14px; height:14px; border-radius:50%;
          background:#fff; top:3px; left:3px; transition:transform 0.15s; }
        .toggle-pill input:checked + .toggle-track:before { transform:translateX(16px); }
        .ec-overlay { position:fixed;inset:0;background:rgba(15,50,107,0.8);
          display:flex;align-items:center;justify-content:center;z-index:300; }
        .ec-modal { background:#fff;border-radius:6px;width:90vw;max-width:780px;
          max-height:90vh;display:flex;flex-direction:column;position:relative; }
        .ec-modal-header { padding:16px 20px;border-bottom:1px solid #eef2f6;
          display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
        .ec-modal-tabs { display:flex;gap:0;border-bottom:1px solid #eef2f6;flex-shrink:0; }
        .ec-tab { padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;border:none;
          background:none;font-family:'Open Sans',Arial,sans-serif;color:#5e708d;
          border-bottom:2px solid transparent;margin-bottom:-1px; }
        .ec-tab.active { color:#0f326b;border-bottom-color:#0f326b; }
        .ec-modal-body { flex:1;overflow:auto; }
        .ec-body-textarea { width:100%;height:100%;min-height:360px;padding:16px;
          font-family:'Courier New',monospace;font-size:12px;line-height:1.6;
          border:none;outline:none;resize:none;color:#192943; }
        @media(max-width:700px){
          .ec-row { flex-wrap:wrap; }
          .ec-subject-input { width:100%; }
        }
      `}</style>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#192943" }}>Email Campaign</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#5e708d" }}>
            {enabledCount} of {steps.length} emails enabled · Each email sends automatically after the configured delay
          </p>
        </div>
        {canEdit ? (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => toggleAll(true)} style={{
              padding:"8px 16px", background:"#0f326b", color:"#fff", border:"none",
              borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Open Sans',Arial,sans-serif",
            }}>Enable All</button>
            <button onClick={() => toggleAll(false)} style={{
              padding:"8px 16px", background:"#eef2f6", color:"#5e708d", border:"1px solid #d1d9e0",
              borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Open Sans',Arial,sans-serif",
            }}>Disable All</button>
          </div>
        ) : (
          <span style={{ padding:"6px 14px", background:"#eef2f6", borderRadius:3, fontSize:12, fontWeight:600, color:"#5e708d" }}>View only</span>
        )}
      </div>

      {/* Legend */}
      <div style={{ background:"#fff", borderRadius:4, padding:"12px 18px", marginBottom:16,
        boxShadow:"0 1px 4px rgba(0,0,0,0.07)", display:"flex", gap:24, flexWrap:"wrap", fontSize:13 }}>
        <span style={{ color:"#5e708d" }}>
          <strong style={{ color:"#192943" }}>Delay days</strong> — days to wait after the previous email (or lead creation for Email 1)
        </span>
        <span style={{ color:"#5e708d" }}>
          <strong style={{ color:"#192943" }}>Day column</strong> — estimated day from lead creation when this email sends
        </span>
      </div>

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"6px 18px", fontSize:11,
        fontWeight:700, color:"#9eafc2", letterSpacing:"0.5px", textTransform:"uppercase" }}>
        <div style={{ width:28, flexShrink:0 }}>#</div>
        <div style={{ width:36, flexShrink:0, textAlign:"center" }}>On/Off</div>
        <div style={{ width:60, flexShrink:0, textAlign:"center" }}>Delay</div>
        <div style={{ width:50, flexShrink:0, textAlign:"center" }}>Day</div>
        <div style={{ flex:1 }}>Subject Line</div>
        <div style={{ width:canEdit ? 60 : 70, flexShrink:0 }}>{canEdit ? "Preview" : "Preview"}</div>
        {canEdit && <div style={{ width:60, flexShrink:0 }}>Edit Body</div>}
        {canEdit && <div style={{ width:60, flexShrink:0 }}>Save</div>}
      </div>

      {fetching ? (
        <div style={{ textAlign:"center", padding:40, color:"#5e708d" }}>Loading…</div>
      ) : (
        steps.map((step, i) => {
          const e = edits[step.id] ?? { delayDays: String(step.delayDays), subject: step.subject, enabled: !!step.enabled, bodyHtml: step.bodyHtml ?? "" };
          const isEnabled = e.enabled;
          const isSaving = saving[step.id];
          const isSaved = saved[step.id];
          const dayLabel = cumDays[i] === 0 ? "Same day" : `Day ${cumDays[i]}`;
          const isDirty = e.delayDays !== String(step.delayDays) || e.subject !== step.subject || e.enabled !== !!step.enabled || e.bodyHtml !== (step.bodyHtml ?? "");

          return (
            <div key={step.id} className={`ec-row${!isEnabled ? " disabled" : ""}`}>
              <div className="ec-num">{step.stepNumber}</div>

              {/* Toggle */}
              <label className="toggle-pill" style={{ cursor: canEdit ? "pointer" : "default", opacity: canEdit ? 1 : 0.6 }}>
                <input type="checkbox" checked={isEnabled} disabled={!canEdit}
                  onChange={v => canEdit && setEdits(d => ({ ...d, [step.id]: { ...d[step.id], enabled: v.target.checked } }))} />
                <span className="toggle-track" />
              </label>

              {/* Delay */}
              <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                <input type="number" min={0} max={365} className="ec-delay-input"
                  value={e.delayDays} readOnly={!canEdit}
                  style={{ cursor: canEdit ? undefined : "default", background: canEdit ? undefined : "#f8fafc" }}
                  onChange={v => canEdit && setEdits(d => ({ ...d, [step.id]: { ...d[step.id], delayDays: v.target.value } }))} />
                <span style={{ fontSize:11, color:"#9eafc2" }}>d</span>
              </div>

              {/* Cumulative day */}
              <div style={{ width:50, flexShrink:0, textAlign:"center", fontSize:11, color:"#5e708d", fontWeight:600 }}>
                {dayLabel}
              </div>

              {/* Subject */}
              <input type="text" className="ec-subject-input" value={e.subject} readOnly={!canEdit}
                style={{ cursor: canEdit ? undefined : "default", background: canEdit ? undefined : "#f8fafc" }}
                onChange={v => canEdit && setEdits(d => ({ ...d, [step.id]: { ...d[step.id], subject: v.target.value } }))} />

              {/* Preview */}
              <button onClick={() => setModal({ step, tab: "preview" })} style={{
                width: canEdit ? 60 : 70, padding:"5px 0", background:"#eef2f6", color:"#0f326b", border:"none",
                borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Open Sans',Arial,sans-serif",
              }}>Preview</button>

              {/* Edit Body — super admin only */}
              {canEdit && (
                <button onClick={() => setModal({ step, tab: "edit" })} style={{
                  width:60, padding:"5px 0", background:"#fff3cd", color:"#92660a", border:"1px solid #fde68a",
                  borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Open Sans',Arial,sans-serif",
                }}>Edit</button>
              )}

              {/* Save — super admin only */}
              {canEdit && (
                <button onClick={() => save(step)} disabled={isSaving || !isDirty} className="ec-save-btn" style={{
                  width:60, background: isSaved ? "#118849" : isDirty ? "#118849" : "#d1d9e0",
                  color: isDirty || isSaved ? "#fff" : "#9eafc2",
                }}>
                  {isSaved ? "Saved ✓" : isSaving ? "…" : "Save"}
                </button>
              )}
            </div>
          );
        })
      )}

      {/* Summary timeline */}
      {steps.length > 0 && !fetching && (
        <div style={{ background:"#fff", borderRadius:4, padding:"16px 18px", marginTop:16,
          boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#192943", marginBottom:10 }}>Campaign Timeline Summary</div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            {steps.filter(s => edits[s.id]?.enabled ?? s.enabled).map(s => {
              const idx = steps.indexOf(s);
              return (
                <div key={s.id} style={{ flexShrink:0, textAlign:"center" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"#0f326b",
                    color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center",
                    justifyContent:"center", margin:"0 auto 4px" }}>{s.stepNumber}</div>
                  <div style={{ fontSize:10, color:"#5e708d", whiteSpace:"nowrap" }}>
                    {cumDays[idx] === 0 ? "Day 0" : `Day ${cumDays[idx]}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:12, color:"#9eafc2", marginTop:8 }}>
            Full sequence spans {cumDays[steps.length - 1]} days · {enabledCount} active emails
          </div>
        </div>
      )}

      {/* Preview / Edit modal */}
      {modal && modalEdit && (
        <div className="ec-overlay" onClick={() => setModal(null)}>
          <div className="ec-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="ec-modal-header">
              <div>
                <div style={{ fontSize:11, color:"#9eafc2", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
                  Email {modalStep.stepNumber}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:"#192943" }}>
                  {modalEdit.subject || modalStep.subject}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {canEdit && (
                  <button onClick={() => save(modalStep)} style={{
                    padding:"6px 16px", background:"#118849", color:"#fff", border:"none",
                    borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Open Sans',Arial,sans-serif",
                  }}>Save Changes</button>
                )}
                <button onClick={() => setModal(null)} style={{
                  background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#5e708d", lineHeight:1,
                }}>×</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="ec-modal-tabs">
              <button className={`ec-tab${modal.tab === "preview" ? " active" : ""}`}
                onClick={() => setModal(m => m ? { ...m, tab: "preview" } : m)}>
                Preview
              </button>
              {canEdit && (
                <button className={`ec-tab${modal.tab === "edit" ? " active" : ""}`}
                  onClick={() => setModal(m => m ? { ...m, tab: "edit" } : m)}>
                  Edit HTML Body
                </button>
              )}
            </div>

            {/* Tab body */}
            <div className="ec-modal-body">
              {modal.tab === "preview" ? (
                <div style={{ padding:20 }}
                  dangerouslySetInnerHTML={{ __html: modalEdit.bodyHtml || modalStep.bodyHtml }} />
              ) : (
                <textarea
                  className="ec-body-textarea"
                  value={modalEdit.bodyHtml}
                  onChange={v => setEdits(d => ({
                    ...d,
                    [modalStep.id]: { ...d[modalStep.id], bodyHtml: v.target.value },
                  }))}
                  spellCheck={false}
                  placeholder="Enter HTML body…"
                />
              )}
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}
