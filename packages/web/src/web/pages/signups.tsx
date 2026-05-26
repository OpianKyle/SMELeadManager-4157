import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const STAGES: Record<string, { label: string; color: string }> = {
  initial_contact: { label: "Initial Contact", color: "#0f326b" },
  product_intro:   { label: "Product Intro",   color: "#192943" },
  demo_scheduling: { label: "Demo Scheduling", color: "#5e708d" },
  follow_up:       { label: "Follow-up",       color: "#f59e0b" },
  booked:          { label: "Booked",          color: "#118849" },
  completed:       { label: "Completed",       color: "#059669" },
  opted_out:       { label: "Opted Out",       color: "#dc2626" },
};

function fmtDate(ts: any) {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Signups() {
  const [leads, setLeads]   = useState<any[]>([]);
  const [users, setUsers]   = useState<any[]>([]);
  const [me, setMe]         = useState<any>(null);
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/me").then(r => r.json()),
      api.get("/leads").then(r => r.json()),
    ]).then(([meData, leadsData]) => {
      setMe(meData.user);
      setLeads(leadsData.leads ?? []);
      if (["super_admin", "admin"].includes(meData.user?.role)) {
        api.get("/users").then(r => r.json()).then(d => setUsers(d.users ?? []));
      }
      setLoading(false);
    });
  }, []);

  const isSuperAdmin = me?.role === "super_admin";
  const isAdmin      = me?.role === "admin";
  const isAgent      = me?.role === "agent";

  // Apply filters
  const filtered = leads.filter(l => {
    if (filterAgent !== "all" && l.createdBy !== filterAgent) return false;
    if (filterStage !== "all" && l.stage !== filterStage) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.name?.toLowerCase().includes(q) &&
        !l.email?.toLowerCase().includes(q) &&
        !l.business?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Summary stats (on full unfiltered list)
  const thisMonth = startOfMonth();
  const totalLeads     = leads.length;
  const completed      = leads.filter(l => l.stage === "completed").length;
  const booked         = leads.filter(l => l.stage === "booked").length;
  const thisMonthCount = leads.filter(l => new Date(l.createdAt) >= thisMonth).length;
  const conversionRate = totalLeads > 0 ? ((completed / totalLeads) * 100).toFixed(1) : "0.0";

  // Per-agent breakdown (admins and super_admin)
  const agentMap = new Map<string, { name: string; total: number; completed: number; booked: number }>();
  if (!isAgent) {
    for (const l of leads) {
      if (!l.createdBy) continue;
      const entry = agentMap.get(l.createdBy) ?? {
        name: l.createdByName ?? l.createdBy,
        total: 0, completed: 0, booked: 0,
      };
      entry.total++;
      if (l.stage === "completed") entry.completed++;
      if (l.stage === "booked") entry.booked++;
      agentMap.set(l.createdBy, entry);
    }
    // Fill in proper names from users list
    for (const u of users) {
      if (agentMap.has(u.id)) {
        agentMap.get(u.id)!.name = u.name;
      }
    }
  }

  const agentRows = Array.from(agentMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total);

  const agentFilterOptions = [
    { value: "all", label: "All" },
    ...agentRows.map(a => ({ value: a.id, label: a.name })),
  ];

  return (
    <Layout>
      <style>{`
        .sig-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .sig-card { background: #fff; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
        @media (max-width: 900px) { .sig-kpi { grid-template-columns: repeat(2,1fr); } .sig-grid { grid-template-columns: 1fr; } }
        @media (max-width: 480px) { .sig-kpi { grid-template-columns: 1fr 1fr; gap: 10px; } }
      `}</style>

      {/* KPI cards */}
      <div className="sig-kpi">
        {[
          { label: "Total Leads",      value: totalLeads,      color: "#0f326b", sub: "in system" },
          { label: "Completed",        value: completed,        color: "#059669", sub: "signed up" },
          { label: "Demos Booked",     value: booked,           color: "#118849", sub: "confirmed" },
          { label: "This Month",       value: thisMonthCount,   color: "#5e708d", sub: "new leads" },
        ].map(k => (
          <div key={k.label} style={{
            background: "#fff", borderRadius: 4, padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{loading ? "—" : k.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#192943", marginTop: 6 }}>{k.label}</div>
            <div style={{ fontSize: 11, color: "#5e708d", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Per-agent breakdown — only for admin/super_admin */}
      {!isAgent && agentRows.length > 0 && (
        <div className="sig-card" style={{ marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#192943" }}>
              {isSuperAdmin ? "Breakdown by Distributor / Agent" : "Breakdown by Agent"}
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f7f9fc" }}>
                  {["Name", "Total Leads", "Completed", "Demos Booked", "Conversion"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#5e708d", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentRows.map((a, i) => (
                  <tr key={a.id} style={{ borderTop: i > 0 ? "1px solid #eef2f6" : undefined }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#192943" }}>
                      <button
                        onClick={() => setFilterAgent(filterAgent === a.id ? "all" : a.id)}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontWeight: 600, color: filterAgent === a.id ? "#118849" : "#192943",
                          fontSize: 13, fontFamily: "'Open Sans',Arial,sans-serif",
                          textDecoration: filterAgent === a.id ? "underline" : "none",
                        }}
                      >{a.name}</button>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#192943" }}>{a.total}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                          background: "#059669",
                        }} />
                        {a.completed}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                          background: "#118849",
                        }} />
                        {a.booked}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 80, height: 6, background: "#eef2f6", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", background: "#059669", borderRadius: 3,
                            width: `${a.total > 0 ? (a.completed / a.total) * 100 : 0}%`,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#5e708d", minWidth: 36 }}>
                          {a.total > 0 ? ((a.completed / a.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters + table */}
      <div className="sig-card">
        {/* Filter bar */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #eef2f6", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search name, email or business…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 180, padding: "8px 12px", border: "1px solid #d1d9e6",
              borderRadius: 3, fontSize: 13, fontFamily: "'Open Sans',Arial,sans-serif",
              color: "#192943", outline: "none",
            }}
          />
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #d1d9e6", borderRadius: 3, fontSize: 13, color: "#192943", background: "#fff", fontFamily: "'Open Sans',Arial,sans-serif" }}
          >
            <option value="all">All Stages</option>
            {Object.entries(STAGES).map(([v, s]) => (
              <option key={v} value={v}>{s.label}</option>
            ))}
          </select>
          {!isAgent && agentRows.length > 0 && (
            <select
              value={filterAgent}
              onChange={e => setFilterAgent(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #d1d9e6", borderRadius: 3, fontSize: 13, color: "#192943", background: "#fff", fontFamily: "'Open Sans',Arial,sans-serif" }}
            >
              {agentFilterOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {(filterAgent !== "all" || filterStage !== "all" || search) && (
            <button
              onClick={() => { setFilterAgent("all"); setFilterStage("all"); setSearch(""); }}
              style={{ padding: "8px 14px", background: "#eef2f6", border: "none", borderRadius: 3, fontSize: 12, color: "#5e708d", cursor: "pointer", fontFamily: "'Open Sans',Arial,sans-serif", fontWeight: 600 }}
            >Clear</button>
          )}
          <span style={{ fontSize: 12, color: "#9eafc2", marginLeft: "auto" }}>{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5e708d", fontSize: 14 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5e708d", fontSize: 14 }}>No leads match your filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f7f9fc" }}>
                  {[
                    "Name",
                    "Business",
                    "Email",
                    "Stage",
                    "Date Added",
                    ...(!isAgent ? ["Referred By"] : []),
                  ].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#5e708d", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => {
                  const stage = STAGES[l.stage];
                  return (
                    <tr key={l.id} style={{ borderTop: i > 0 ? "1px solid #eef2f6" : undefined, transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f7f9fc")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#192943", whiteSpace: "nowrap" }}>{l.name}</td>
                      <td style={{ padding: "12px 16px", color: "#5e708d", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.business ?? "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#5e708d", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 10,
                          fontSize: 11, fontWeight: 700, background: stage?.color ?? "#eef2f6", color: "#fff",
                          whiteSpace: "nowrap",
                        }}>{stage?.label ?? l.stage}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#5e708d", whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                      {!isAgent && (
                        <td style={{ padding: "12px 16px", color: "#192943", whiteSpace: "nowrap" }}>
                          {l.createdByName ?? "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer summary */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #eef2f6", display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "Completed", value: filtered.filter(l => l.stage === "completed").length, color: "#059669" },
              { label: "Booked",    value: filtered.filter(l => l.stage === "booked").length,    color: "#118849" },
              { label: "In Progress", value: filtered.filter(l => !["completed","opted_out"].includes(l.stage)).length, color: "#0f326b" },
              { label: "Opted Out", value: filtered.filter(l => l.stage === "opted_out").length, color: "#dc2626" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "#5e708d" }}>{s.label}: <strong style={{ color: "#192943" }}>{s.value}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
