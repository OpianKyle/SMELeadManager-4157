import React, { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

type LogEntry = {
  id: string;
  leadId: string;
  stage: string;
  subject: string;
  sentAt: string | number;
  sentBy: string | null;
  status: "sent" | "failed" | "scheduled";
  error: string | null;
  leadName: string | null;
  leadEmail: string | null;
  leadBusiness: string | null;
};

const PAGE_SIZE = 50;

function fmtDate(v: string | number) {
  const d = v instanceof Date ? v : new Date(typeof v === "number" ? v * 1000 : v);
  return d.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function stageLabel(stage: string) {
  const map: Record<string, string> = {
    stage1: "Stage 1", stage2: "Stage 2", stage3: "Stage 3",
    stage4_1: "Follow-up #1", stage4_2: "Follow-up #2", stage4_3: "Follow-up #3",
    stage5: "Booking Confirm", reminder24: "24h Reminder", reminder1: "1h Reminder",
  };
  if (stage in map) return map[stage];
  const m = stage.match(/^campaign_(\d+)$/);
  if (m) return `Campaign Step ${m[1]}`;
  return stage;
}

export default function EmailLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");
  const [page, setPage] = useState(1);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<any>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/email/logs").then(r => r.json()),
      api.get("/me").then(r => r.json()),
    ]).then(([d, me]) => {
      setLogs(d.logs ?? []);
      setUser(me.user);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (l.leadName ?? "").toLowerCase().includes(q) ||
        (l.leadEmail ?? "").toLowerCase().includes(q) ||
        (l.subject ?? "").toLowerCase().includes(q) ||
        (l.leadBusiness ?? "").toLowerCase().includes(q)
      );
    });
  }, [logs, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSent = logs.filter(l => l.status === "sent").length;
  const totalFailed = logs.filter(l => l.status === "failed").length;

  const canManage = user && ["super_admin", "admin"].includes(user.role);

  const resendFailed = async () => {
    if (!confirm("Resend the first campaign email to all leads that only have failed emails and never received a successful one. Continue?")) return;
    setResending(true);
    try {
      const res = await api.post("/email/resend-failed", {});
      const data = await res.json() as any;
      if (data.queued === 0) showToast("✅ No failed leads to resend — all caught up!");
      else showToast(`✅ Queued ${data.queued} lead${data.queued === 1 ? "" : "s"} for resend. Emails sending in the background.`);
      setTimeout(load, 3000);
    } catch {
      showToast("❌ Request failed — please try again");
    } finally {
      setResending(false);
    }
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Email Log</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>
            Full history of every email sent by the system
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={load} style={{
            padding: "8px 16px", borderRadius: 4, border: "1px solid #dce4ed",
            background: "#fff", color: "#192943", fontWeight: 600, fontSize: 13,
            cursor: "pointer", fontFamily: "'Open Sans',Arial,sans-serif",
          }}>↻ Refresh</button>
          {canManage && totalFailed > 0 && (
            <button onClick={resendFailed} disabled={resending} style={{
              padding: "8px 16px", borderRadius: 4, border: "none",
              background: resending ? "#5e708d" : "#dc2626",
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: resending ? "not-allowed" : "pointer",
              fontFamily: "'Open Sans',Arial,sans-serif",
            }}>
              {resending ? "⏳ Sending..." : `🔄 Resend Failed (${totalFailed})`}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Emails", value: logs.length, color: "#192943" },
          { label: "Sent Successfully", value: totalSent, color: "#118849" },
          { label: "Failed", value: totalFailed, color: totalFailed > 0 ? "#dc2626" : "#5e708d" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 4, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5e708d", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{loading ? "—" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name, email, subject or business…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: 1, minWidth: 220, padding: "9px 14px", border: "1px solid #dce4ed",
            borderRadius: 4, fontSize: 13, fontFamily: "'Open Sans',Arial,sans-serif",
            color: "#192943", outline: "none",
          }}
        />
        {(["all", "sent", "failed"] as const).map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} style={{
            padding: "9px 16px", borderRadius: 4, fontSize: 13, fontWeight: 600,
            border: "1px solid #dce4ed", cursor: "pointer",
            fontFamily: "'Open Sans',Arial,sans-serif",
            background: statusFilter === s ? "#192943" : "#fff",
            color: statusFilter === s ? "#fff" : "#5e708d",
          }}>
            {s === "all" ? "All" : s === "sent" ? "✅ Sent" : "❌ Failed"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#0f326b" }}>
                {["Recipient", "Email Address", "Subject", "Stage", "Sent By", "Date & Time", "Status"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", fontSize: 14, color: "#5e708d" }}>Loading…</td></tr>
              )}
              {!loading && pageData.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", fontSize: 14, color: "#5e708d" }}>No emails match your filters.</td></tr>
              )}
              {!loading && pageData.map((l, i) => (
                <React.Fragment key={l.id}>
                  <tr
                    style={{ borderBottom: "1px solid #eef2f6", background: i % 2 === 0 ? "#fff" : "#fafbfc", cursor: l.error ? "pointer" : "default" }}
                    onClick={() => l.error && setExpandedError(expandedError === l.id ? null : l.id)}
                    title={l.error ? "Click to see error details" : undefined}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#192943" }}>{l.leadName ?? "—"}</div>
                      {l.leadBusiness && <div style={{ fontSize: 11, color: "#5e708d", marginTop: 1 }}>{l.leadBusiness}</div>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "#192943", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.leadEmail ?? <span style={{ color: "#aaa", fontSize: 12 }}>unknown</span>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "#192943", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.subject}>
                      {l.subject}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 3,
                        background: "#eef2f6", color: "#192943", whiteSpace: "nowrap",
                      }}>{stageLabel(l.stage)}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#5e708d", whiteSpace: "nowrap" }}>
                      {l.sentBy === "auto" ? "🤖 Auto" : "👤 Manual"}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#5e708d", whiteSpace: "nowrap" }}>
                      {fmtDate(l.sentAt)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: l.status === "sent" ? "#118849" : l.status === "failed" ? "#dc2626" : "#d97706",
                          color: "#fff", whiteSpace: "nowrap",
                        }}>{l.status}</span>
                        {l.error && <span style={{ fontSize: 12, color: "#dc2626" }} title="Has error details">⚠️</span>}
                      </div>
                    </td>
                  </tr>
                  {expandedError === l.id && l.error && (
                    <tr style={{ background: "#fff5f5" }}>
                      <td colSpan={7} style={{ padding: "10px 14px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Error Details</div>
                        <code style={{ fontSize: 12, color: "#7f1d1d", background: "#fee2e2", padding: "8px 12px", borderRadius: 4, display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{l.error}</code>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #eef2f6" }}>
            <div style={{ fontSize: 13, color: "#5e708d" }}>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                padding: "6px 14px", borderRadius: 4, border: "1px solid #dce4ed",
                background: "#fff", color: "#192943", fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer",
                opacity: page === 1 ? 0.5 : 1, fontFamily: "'Open Sans',Arial,sans-serif",
              }}>← Prev</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    padding: "6px 12px", borderRadius: 4, fontSize: 13,
                    border: "1px solid #dce4ed", cursor: "pointer",
                    background: page === p ? "#192943" : "#fff",
                    color: page === p ? "#fff" : "#192943",
                    fontFamily: "'Open Sans',Arial,sans-serif", fontWeight: page === p ? 700 : 400,
                  }}>{p}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
                padding: "6px 14px", borderRadius: 4, border: "1px solid #dce4ed",
                background: "#fff", color: "#192943", fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer",
                opacity: page === totalPages ? 0.5 : 1, fontFamily: "'Open Sans',Arial,sans-serif",
              }}>Next →</button>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid #eef2f6", fontSize: 12, color: "#9ca3af", textAlign: "right" }}>
            {filtered.length} result{filtered.length === 1 ? "" : "s"}{search || statusFilter !== "all" ? " (filtered)" : ""}
          </div>
        )}
      </div>
    </Layout>
  );
}
