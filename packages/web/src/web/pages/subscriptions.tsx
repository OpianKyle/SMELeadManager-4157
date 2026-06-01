import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

function fmtDate(ts: any) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDaysLeft(ts: any) {
  if (!ts) return null;
  const diff = new Date(ts).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  ACTIVE:  { bg: "#f0fdf4", color: "#15803d", border: "#86efac", label: "Active" },
  TRIAL:   { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Trial" },
  EXPIRED: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Expired" },
  CANCELLED: { bg: "#f9fafb", color: "#6b7280", border: "#d1d5db", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.EXPIRED;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

export default function Subscriptions() {
  const [subs, setSubs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [generatedAt, setGeneratedAt]   = useState<string | null>(null);

  useEffect(() => {
    api.get("/subscriptions")
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setSubs(d.subscriptions ?? []);
        setGeneratedAt(d.generatedAt ?? null);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const active  = subs.filter(s => s.status === "ACTIVE");
  const trial   = subs.filter(s => s.status === "TRIAL");

  const filtered = subs.filter(s => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.user?.fullName?.toLowerCase().includes(q) ||
        s.user?.email?.toLowerCase().includes(q) ||
        s.user?.businessName?.toLowerCase().includes(q) ||
        s.plan?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Layout>
      <div style={{ padding: "28px 32px", fontFamily: "'Open Sans', Arial, sans-serif", maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#192943", margin: "0 0 4px" }}>
            Subscriptions
          </h1>
          <p style={{ fontSize: 13, color: "#5e708d", margin: 0 }}>
            Active and trial subscribers from Masakhe Portal
            {generatedAt && (
              <span style={{ marginLeft: 8, color: "#9eafc2" }}>
                · Updated {new Date(generatedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Subscribers", value: subs.length, color: "#192943", bg: "#f0f3f7" },
            { label: "Active",            value: active.length, color: "#15803d", bg: "#f0fdf4" },
            { label: "Trial",             value: trial.length,  color: "#1d4ed8", bg: "#eff6ff" },
          ].map(c => (
            <div key={c.label} style={{
              background: c.bg, borderRadius: 8, padding: "20px 24px",
              border: `1px solid ${c.bg === "#f0f3f7" ? "#d1d9e0" : c.bg === "#f0fdf4" ? "#86efac" : "#bfdbfe"}`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{loading ? "…" : c.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5e708d", marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <input
            placeholder="Search name, email, business…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "9px 14px", border: "1px solid #d1d9e0", borderRadius: 4,
              fontSize: 13, fontFamily: "'Open Sans', Arial, sans-serif",
              color: "#192943", width: 280, boxSizing: "border-box",
            }}
          />
          {["all", "ACTIVE", "TRIAL"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "9px 18px", borderRadius: 4, fontSize: 12, fontWeight: 700,
                border: "1px solid",
                borderColor: filterStatus === s ? "#0f326b" : "#d1d9e0",
                background: filterStatus === s ? "#0f326b" : "#fff",
                color: filterStatus === s ? "#fff" : "#5e708d",
                cursor: "pointer", fontFamily: "'Open Sans', Arial, sans-serif",
              }}
            >
              {s === "all" ? "All" : s === "ACTIVE" ? "Active" : "Trial"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "14px 16px", background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 4, fontSize: 13, color: "#dc2626", marginBottom: 20,
          }}>
            Failed to load subscriptions: {error}
          </div>
        )}

        {/* Table */}
        {!error && (
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e8edf3", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#192943" }}>
                  {["Subscriber", "Plan", "Status", "Trial Ends", "Subscribed", "Price"].map(h => (
                    <th key={h} style={{
                      padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
                      color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", fontSize: 14, color: "#5e708d" }}>
                      Loading subscriptions…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", fontSize: 14, color: "#5e708d" }}>
                      No subscriptions found.
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => {
                  const daysLeft = s.status === "TRIAL" ? fmtDaysLeft(s.trialEndAt) : null;
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #e8edf3" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#192943", fontSize: 13 }}>{s.user?.fullName ?? "—"}</div>
                        <div style={{ fontSize: 12, color: "#5e708d" }}>{s.user?.email}</div>
                        {s.user?.businessName && s.user.businessName !== s.user.fullName && (
                          <div style={{ fontSize: 11, color: "#9eafc2" }}>{s.user.businessName}</div>
                        )}
                        {s.user?.phone && (
                          <div style={{ fontSize: 11, color: "#9eafc2" }}>{s.user.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#192943" }}>{s.plan?.name ?? "—"}</div>
                        <div style={{ fontSize: 11, color: "#9eafc2" }}>{s.plan?.code}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <StatusBadge status={s.status} />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {s.status === "TRIAL" ? (
                          <div>
                            <div style={{ fontSize: 13, color: "#192943" }}>{fmtDate(s.trialEndAt)}</div>
                            {daysLeft !== null && (
                              <div style={{
                                fontSize: 11, fontWeight: 700,
                                color: daysLeft <= 3 ? "#dc2626" : daysLeft <= 7 ? "#d97706" : "#5e708d",
                              }}>
                                {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                              </div>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: "#192943" }}>
                        {fmtDate(s.subscribedAt)}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#118849" }}>
                        {s.plan?.priceFormatted ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ fontSize: 12, color: "#9eafc2", marginTop: 10 }}>
            Showing {filtered.length} of {subs.length} subscription{subs.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </Layout>
  );
}
