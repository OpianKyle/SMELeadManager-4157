import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  initial_contact: { label: "Initial Contact", color: "#0f326b" },
  product_intro:   { label: "Product Intro",   color: "#192943" },
  demo_scheduling: { label: "Demo Scheduling", color: "#5e708d" },
  follow_up:       { label: "Follow-up",       color: "#f59e0b" },
  booked:          { label: "Booked",          color: "#118849" },
  completed:       { label: "Completed",       color: "#059669" },
};

const PORTAL_BASE = "https://masakheportal.co.za/signup";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs]   = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [user, setUser]   = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/stats").then(r => r.json()).then(d => setStats(d.stats));
    api.get("/email/logs").then(r => r.json()).then(d => setLogs((d.logs ?? []).slice(0, 5)));
    api.get("/leads").then(r => r.json()).then(d => setLeads((d.leads ?? []).slice(0, 5)));
    api.get("/me").then(r => r.json()).then(d => setUser(d.user));
  }, []);

  const signupLink = user ? `${PORTAL_BASE}?ref=${user.id}` : null;

  function copyLink() {
    if (!signupLink) return;
    navigator.clipboard.writeText(signupLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Layout>
      <style>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .pipeline-bars {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        @media (max-width: 900px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .bottom-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .pipeline-card {
            overflow-x: auto;
          }
        }
        @media (max-width: 380px) {
          .kpi-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {/* KPI Row */}
      <div className="kpi-grid">
        {[
          { label: "Total Leads", value: stats?.totalLeads ?? "—", color: "#0f326b", sub: "in pipeline" },
          { label: "Demos Booked", value: stats?.booked ?? "—", color: "#118849", sub: "confirmed" },
          { label: "In Progress", value: stats?.inProgress ?? "—", color: "#192943", sub: "active leads" },
          { label: "Emails Sent", value: stats?.emailsSent ?? "—", color: "#5e708d", sub: "total dispatched" },
        ].map(k => (
          <div key={k.label} style={{
            background: "#fff", borderRadius: 4, padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#192943", marginTop: 6 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: "#5e708d", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="pipeline-card" style={{ background: "#fff", borderRadius: 4, padding: "24px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#192943" }}>Pipeline by Stage</h2>
        <div className="pipeline-bars">
          {Object.entries(stats?.byStage ?? {}).map(([stage, count]: any) => {
            const meta = STAGE_LABELS[stage];
            const max = Math.max(...Object.values(stats?.byStage ?? { x: 1 }) as number[], 1);
            const pct = Math.max(20, (count / max) * 100);
            return (
              <div key={stage} style={{ flex: "0 0 auto", minWidth: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: meta?.color ?? "#192943" }}>{count}</span>
                <div style={{
                  width: "100%", height: pct, background: meta?.color ?? "#192943",
                  borderRadius: "3px 3px 0 0", minHeight: 20, transition: "height 0.3s",
                }} />
                <span style={{
                  fontSize: 10, color: "#5e708d", textAlign: "center",
                  letterSpacing: "0.5px", textTransform: "uppercase", lineHeight: 1.3,
                }}>{meta?.label ?? stage}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signup Link Card */}
      {signupLink && (
        <div style={{ background:"#fff", borderRadius:4, padding:"16px 20px", marginBottom:24,
          boxShadow:"0 1px 4px rgba(0,0,0,0.07)", borderLeft:"4px solid #118849" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#192943", marginBottom:4 }}>Your Portal Signup Link</div>
              <div style={{ fontSize:12, color:"#5e708d", wordBreak:"break-all" }}>{signupLink}</div>
            </div>
            <button onClick={copyLink} style={{
              padding:"8px 18px", background: copied ? "#118849" : "#0f326b", color:"#fff",
              border:"none", borderRadius:3, fontSize:12, fontWeight:700, cursor:"pointer",
              fontFamily:"'Open Sans',Arial,sans-serif", flexShrink:0, transition:"background 0.2s",
            }}>
              {copied ? "Copied ✓" : "Copy Link"}
            </button>
          </div>
          <div style={{ fontSize:11, color:"#9eafc2", marginTop:8 }}>
            Share this link on masakheportal.co.za — signups will automatically appear in your leads.
          </div>
        </div>
      )}

      <div className="bottom-grid">
        {/* Recent leads */}
        <div style={{ background: "#fff", borderRadius: 4, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#192943" }}>Recent Leads</h2>
            <a href="/leads" style={{ fontSize: 12, color: "#118849", textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          {leads.length === 0 && <p style={{ fontSize: 13, color: "#5e708d", margin: 0 }}>No leads yet.</p>}
          {leads.map(l => {
            const meta = STAGE_LABELS[l.stage];
            return (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eef2f6", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#192943", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                  <div style={{ fontSize: 12, color: "#5e708d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.business ?? l.email}</div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: meta?.color ?? "#eef2f6", color: "#fff", whiteSpace: "nowrap", flexShrink: 0,
                }}>{meta?.label ?? l.stage}</span>
              </div>
            );
          })}
        </div>

        {/* Recent emails */}
        <div style={{ background: "#fff", borderRadius: 4, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#192943" }}>Recent Emails</h2>
            <a href="/email-automation" style={{ fontSize: 12, color: "#118849", textDecoration: "none", fontWeight: 600 }}>Manage →</a>
          </div>
          {logs.length === 0 && <p style={{ fontSize: 13, color: "#5e708d", margin: 0 }}>No emails sent yet.</p>}
          {logs.map(l => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eef2f6", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#192943", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.subject}</div>
                <div style={{ fontSize: 11, color: "#5e708d" }}>{l.stage} · {(l.sentAt instanceof Date ? l.sentAt : new Date(typeof l.sentAt === "number" ? l.sentAt * 1000 : l.sentAt)).toLocaleDateString("en-ZA")}</div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: l.status === "sent" ? "#118849" : "#dc2626", color: "#fff", flexShrink: 0,
              }}>{l.status}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
