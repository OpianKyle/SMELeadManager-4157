import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  lead_created:       { label: "Lead Created",        color: "#118849" },
  lead_updated:       { label: "Lead Updated",        color: "#0f326b" },
  lead_stage_changed: { label: "Stage Changed",       color: "#7c3aed" },
  lead_deleted:       { label: "Lead Deleted",        color: "#dc2626" },
  lead_opted_out:     { label: "Opted Out",           color: "#d97706" },
  lead_opted_in:      { label: "Opted In",            color: "#059669" },
  email_sent:         { label: "Email Sent",          color: "#0369a1" },
  user_created:       { label: "User Created",        color: "#118849" },
  user_updated:       { label: "User Updated",        color: "#0f326b" },
  user_deleted:       { label: "User Deleted",        color: "#dc2626" },
  workflow_updated:   { label: "Workflow Updated",    color: "#d97706" },
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#118849",
  admin: "#0f326b",
  agent: "#5e708d",
  viewer: "#999",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Team Leader",
  agent: "Agent",
  viewer: "Viewer",
};

function fmtTime(ts: any) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts * 1000 : ts);
  return d.toLocaleString("en-ZA", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseDetails(details: string | null): string {
  if (!details) return "";
  try {
    const obj = JSON.parse(details);
    return Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => {
        const key = k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
        return `${key}: ${v}`;
      })
      .join(" · ");
  } catch {
    return details;
  }
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    api.get("/activity-logs").then(r => r.json()).then(d => {
      setLogs(d.logs ?? []);
      setFetching(false);
    });
  }, []);

  const uniqueUsers = Array.from(new Map(logs.map(l => [l.userId, l.userName])).entries())
    .filter(([id]) => id)
    .map(([id, name]) => ({ id, name }));

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterUser && l.userId !== filterUser) return false;
    if (search) {
      const q = search.toLowerCase();
      const details = l.details?.toLowerCase() ?? "";
      if (!l.userName?.toLowerCase().includes(q) && !details.includes(q) && !l.action?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <Layout>
      <style>{`
        .alog-wrap { background:#fff; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.07); overflow:auto; -webkit-overflow-scrolling:touch; }
        .alog-table { width:max-content; min-width:100%; border-collapse:collapse; }
        .alog-table th, .alog-table td { white-space:nowrap; }
        .alog-table th { padding:9px 14px; text-align:left; font-size:10px; font-weight:700;
          color:rgba(255,255,255,0.7); letter-spacing:0.8px; text-transform:uppercase; background:#192943; }
        .alog-table td { padding:9px 14px; font-size:12px; border-bottom:1px solid #eef2f6; }
        .alog-table tr:last-child td { border-bottom:none; }
        .alog-table tr:hover td { background:#f5f8ff; }
        @media (max-width:1024px) {
          .alog-cards { display:flex; flex-direction:column; gap:10px; }
          .alog-wrap { display:none; }
        }
        @media (min-width:1025px) {
          .alog-cards { display:none; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Activity Log</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>{logs.length} total entries · tracking all team actions</p>
        </div>
        <button
          onClick={() => { setFetching(true); api.get("/activity-logs").then(r => r.json()).then(d => { setLogs(d.logs ?? []); setFetching(false); }); }}
          style={{ padding: "9px 18px", background: "#0f326b", color: "#fff", border: "none", borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Open Sans',Arial,sans-serif" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by user or details…"
          style={{ flex: 1, minWidth: 200, padding: "9px 12px", border: "1px solid #d1d9e0", borderRadius: 3, fontSize: 13, fontFamily: "'Open Sans',Arial,sans-serif", color: "#192943" }}
        />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ padding: "9px 10px", border: "1px solid #d1d9e0", borderRadius: 3, fontSize: 13, fontFamily: "'Open Sans',Arial,sans-serif", color: "#192943", background: "#fff" }}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>)}
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ padding: "9px 10px", border: "1px solid #d1d9e0", borderRadius: 3, fontSize: 13, fontFamily: "'Open Sans',Arial,sans-serif", color: "#192943", background: "#fff" }}>
          <option value="">All Users</option>
          {uniqueUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {fetching ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#5e708d", fontSize: 14 }}>Loading logs…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 4, padding: "40px", textAlign: "center", color: "#5e708d", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          No activity recorded yet. Actions by agents and team leaders will appear here.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="alog-wrap">
            <table className="alog-table">
              <thead>
                <tr>
                  {["Time", "User", "Role", "Action", "Entity", "Details"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const meta = ACTION_LABELS[log.action];
                  return (
                    <tr key={log.id}>
                      <td style={{ color: "#5e708d" }}>{fmtTime(log.createdAt)}</td>
                      <td style={{ fontWeight: 600, color: "#192943" }}>{log.userName ?? "—"}</td>
                      <td>
                        {log.userRole && (
                          <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: ROLE_COLORS[log.userRole] ?? "#999", color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {ROLE_LABELS[log.userRole] ?? log.userRole}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: meta?.color ?? "#eef2f6", color: meta ? "#fff" : "#192943" }}>
                          {meta?.label ?? log.action}
                        </span>
                      </td>
                      <td style={{ color: "#5e708d", textTransform: "capitalize" }}>{log.entity ?? "—"}</td>
                      <td style={{ color: "#5e708d", maxWidth: 400 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 400 }}>
                          {parseDetails(log.details)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="alog-cards">
            {filtered.map(log => {
              const meta = ACTION_LABELS[log.action];
              return (
                <div key={log.id} style={{ background: "#fff", borderRadius: 4, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: meta?.color ?? "#eef2f6", color: meta ? "#fff" : "#192943" }}>
                      {meta?.label ?? log.action}
                    </span>
                    <span style={{ fontSize: 11, color: "#5e708d" }}>{fmtTime(log.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 2 }}>
                    {log.userName ?? "Unknown"}
                    {log.userRole && (
                      <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: ROLE_COLORS[log.userRole] ?? "#999", color: "#fff", textTransform: "uppercase" }}>
                        {ROLE_LABELS[log.userRole] ?? log.userRole}
                      </span>
                    )}
                  </div>
                  {log.details && <div style={{ fontSize: 12, color: "#5e708d", marginTop: 4 }}>{parseDetails(log.details)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
