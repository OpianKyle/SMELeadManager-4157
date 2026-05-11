import { useState } from "react";
import { Layout } from "../components/layout";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────
interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  business?: string;
  _rowIndex: number;
  _valid: boolean;
  _errors: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────
function sheetUrlToCsvUrl(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const id = m[1];
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cols.push(cell.trim()); cell = "";
      } else {
        cell += ch;
      }
    }
    cols.push(cell.trim());
    rows.push(cols);
  }
  return rows;
}

function detectColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const l = h.toLowerCase().trim();
    if (!map.name && l.includes("name") && !l.includes("business") && !l.includes("company")) map.name = i;
    if (!map.phone && (l.includes("phone") || l.includes("mobile") || l.includes("whatsapp") || l.includes("cell"))) map.phone = i;
    if (!map.email && (l.includes("email") || l.includes("mail"))) map.email = i;
    if (!map.business && (l.includes("business") || l.includes("company") || l.includes("organisation") || l.includes("organization"))) map.business = i;
  });
  return map;
}

function normalisePhone(p: string): string {
  const clean = p.replace(/[\s\-()]/g, "");
  if (!clean) return "";
  if (!clean.startsWith("+")) return "+" + clean;
  return clean;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function parseLeads(rows: string[][]): { leads: ParsedLead[]; colMap: Record<string, number>; missingCols: string[] } {
  if (rows.length < 2) return { leads: [], colMap: {}, missingCols: ["name", "phone", "email"] };
  const headers = rows[0];
  const colMap = detectColumns(headers);
  const missingCols: string[] = [];
  if (colMap.name === undefined) missingCols.push("name");
  if (colMap.phone === undefined) missingCols.push("phone");
  if (colMap.email === undefined) missingCols.push("email");

  const leads: ParsedLead[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(c => !c)) continue; // skip blank rows
    const errors: string[] = [];
    const name = colMap.name !== undefined ? row[colMap.name] ?? "" : "";
    const rawPhone = colMap.phone !== undefined ? row[colMap.phone] ?? "" : "";
    const email = colMap.email !== undefined ? row[colMap.email] ?? "" : "";
    const business = colMap.business !== undefined ? row[colMap.business] ?? "" : "";
    const phone = normalisePhone(rawPhone);

    if (!name.trim()) errors.push("Name missing");
    if (!phone) errors.push("Phone missing");
    if (!email.trim()) errors.push("Email missing");
    else if (!isValidEmail(email)) errors.push("Invalid email");

    leads.push({
      name: name.trim(),
      phone,
      email: email.trim().toLowerCase(),
      business: business.trim() || undefined,
      _rowIndex: i + 1,
      _valid: errors.length === 0,
      _errors: errors,
    });
  }
  return { leads, colMap, missingCols };
}

// ── Component ────────────────────────────────────────────────────────
export default function Import() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [colMap, setColMap] = useState<Record<string, number>>({});
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [parsed, setParsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);

  const validLeads = leads.filter(l => l._valid);
  const invalidLeads = leads.filter(l => !l._valid);

  const handleFetch = async () => {
    setFetchError("");
    setLeads([]);
    setParsed(false);
    setImportResult(null);
    const csvUrl = sheetUrlToCsvUrl(sheetUrl.trim());
    if (!csvUrl) {
      setFetchError("Invalid Google Sheets URL. Make sure it contains /spreadsheets/d/<id>.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/sheets/fetch?url=${encodeURIComponent(csvUrl)}`);
      if (!res.ok) {
        const d = await res.json() as any;
        setFetchError(d.error ?? `Server error ${res.status}. Make sure the sheet is shared as "Anyone with the link can view".`);
        setLoading(false);
        return;
      }
      const csv = await res.text();
      const rows = parseCSV(csv);
      const result = parseLeads(rows);
      setColMap(result.colMap);
      setMissingCols(result.missingCols);
      setLeads(result.leads);
      setParsed(true);
    } catch (e: any) {
      setFetchError("Network error: " + e.message);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (validLeads.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < validLeads.length; i++) {
      const { name, phone, email, business } = validLeads[i];
      try {
        const res = await api.post("/leads", { name, phone, email, business, stage: "initial_contact" });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
      setImportProgress(i + 1);
      if (i < validLeads.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    setImportResult({ success, failed });
    setImporting(false);
  };

  const handleReset = () => {
    setSheetUrl("");
    setLeads([]);
    setParsed(false);
    setFetchError("");
    setImportResult(null);
    setImportProgress(0);
    setShowInvalid(false);
  };

  return (
    <Layout>
      <div style={{ maxWidth: 860 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>Import Leads from Google Sheets</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#5e708d" }}>
            Paste a public Google Sheets link to bulk-import leads. The sheet must be shared as <strong>"Anyone with the link can view"</strong>.
          </p>
        </div>

        {/* Instructions card */}
        <div style={{
          background: "#fff", border: "1px solid #dce4ed", borderRadius: 8,
          padding: "18px 22px", marginBottom: 24,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#192943", marginBottom: 10 }}>Required columns (header names are flexible):</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Name", hint: 'column header containing "name"', req: true },
              { label: "Phone", hint: 'phone / mobile / whatsapp / cell', req: true },
              { label: "Email", hint: 'email / mail', req: true },
              { label: "Business", hint: 'business / company / organisation', req: false },
            ].map(col => (
              <div key={col.label} style={{
                background: col.req ? "#eef9f3" : "#f4f6f9",
                border: `1px solid ${col.req ? "#b2dfc5" : "#dce4ed"}`,
                borderRadius: 6, padding: "8px 14px",
              }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: col.req ? "#118849" : "#5e708d" }}>{col.label}</span>
                {col.req && <span style={{ fontSize: 10, fontWeight: 700, color: "#118849", marginLeft: 5, background: "#c9f0da", borderRadius: 4, padding: "1px 5px" }}>REQUIRED</span>}
                <div style={{ fontSize: 11, color: "#8a9ab0", marginTop: 2 }}>{col.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* URL input */}
        {!parsed && (
          <div style={{ background: "#fff", border: "1px solid #dce4ed", borderRadius: 8, padding: "22px 24px", marginBottom: 24 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#192943", marginBottom: 8 }}>
              Google Sheets URL
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && handleFetch()}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{
                  flex: 1, padding: "10px 14px", border: "1px solid #dce4ed", borderRadius: 6,
                  fontSize: 14, color: "#192943", fontFamily: "'Open Sans', Arial, sans-serif",
                  outline: "none",
                }}
              />
              <button
                onClick={handleFetch}
                disabled={loading || !sheetUrl.trim()}
                style={{
                  padding: "10px 24px", background: loading ? "#8a9ab0" : "#118849",
                  border: "none", borderRadius: 6, color: "#fff", fontWeight: 700,
                  fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "'Open Sans', Arial, sans-serif", whiteSpace: "nowrap",
                }}
              >
                {loading ? "Fetching..." : "Fetch & Preview"}
              </button>
            </div>
            {fetchError && (
              <div style={{ marginTop: 10, background: "#fff5f5", border: "1px solid #fcc", borderRadius: 6, padding: "10px 14px", color: "#c0392b", fontSize: 13 }}>
                {fetchError}
              </div>
            )}
          </div>
        )}

        {/* Preview & import */}
        {parsed && !importResult && (
          <>
            {/* Summary bar */}
            <div style={{
              background: "#fff", border: "1px solid #dce4ed", borderRadius: 8,
              padding: "16px 22px", marginBottom: 18,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#118849" }}>{validLeads.length}</div>
                  <div style={{ fontSize: 12, color: "#5e708d" }}>Ready to import</div>
                </div>
                {invalidLeads.length > 0 && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#e74c3c" }}>{invalidLeads.length}</div>
                    <div style={{ fontSize: 12, color: "#5e708d" }}>Will be skipped</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#192943" }}>{leads.length}</div>
                  <div style={{ fontSize: 12, color: "#5e708d" }}>Total rows</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleReset} style={{
                  padding: "9px 18px", background: "transparent", border: "1px solid #dce4ed",
                  borderRadius: 6, color: "#5e708d", fontSize: 13, cursor: "pointer",
                  fontFamily: "'Open Sans', Arial, sans-serif",
                }}>Start Over</button>
                <button
                  onClick={handleImport}
                  disabled={importing || validLeads.length === 0}
                  style={{
                    padding: "9px 22px", background: validLeads.length === 0 ? "#8a9ab0" : "#118849",
                    border: "none", borderRadius: 6, color: "#fff", fontWeight: 700,
                    fontSize: 14, cursor: validLeads.length === 0 ? "not-allowed" : "pointer",
                    fontFamily: "'Open Sans', Arial, sans-serif",
                  }}
                >
                  {importing ? `Importing... ${importProgress}/${validLeads.length}` : `Import ${validLeads.length} Lead${validLeads.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {importing && (
              <div style={{ background: "#fff", border: "1px solid #dce4ed", borderRadius: 8, padding: "14px 22px", marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#5e708d" }}>
                  <span>Importing leads...</span>
                  <span>{importProgress} / {validLeads.length}</span>
                </div>
                <div style={{ background: "#eef2f6", borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: "#118849", borderRadius: 4,
                    width: `${(importProgress / validLeads.length) * 100}%`,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            )}

            {/* Missing col warnings */}
            {missingCols.length > 0 && (
              <div style={{ background: "#fff9e6", border: "1px solid #f5c842", borderRadius: 8, padding: "12px 18px", marginBottom: 18, fontSize: 13, color: "#7a6000" }}>
                <strong>Warning:</strong> Could not detect column{missingCols.length > 1 ? "s" : ""}: <strong>{missingCols.join(", ")}</strong>. All rows will be marked invalid.
              </div>
            )}

            {/* Valid leads table */}
            {validLeads.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #dce4ed", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#192943" }}>Valid Leads</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, background: "#eef9f3", color: "#118849",
                    border: "1px solid #b2dfc5", borderRadius: 10, padding: "2px 10px",
                  }}>{validLeads.length} ready</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f4f6f9" }}>
                        {["#", "Name", "Phone", "Email", "Business"].map(h => (
                          <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 600, color: "#5e708d", fontSize: 12, borderBottom: "1px solid #eef2f6" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validLeads.slice(0, 50).map((l, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f2f5" }}>
                          <td style={{ padding: "9px 16px", color: "#8a9ab0", fontSize: 12 }}>{l._rowIndex}</td>
                          <td style={{ padding: "9px 16px", color: "#192943", fontWeight: 500 }}>{l.name}</td>
                          <td style={{ padding: "9px 16px", color: "#192943" }}>{l.phone}</td>
                          <td style={{ padding: "9px 16px", color: "#192943" }}>{l.email}</td>
                          <td style={{ padding: "9px 16px", color: "#5e708d" }}>{l.business || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validLeads.length > 50 && (
                    <div style={{ padding: "10px 16px", color: "#8a9ab0", fontSize: 12, borderTop: "1px solid #f0f2f5" }}>
                      + {validLeads.length - 50} more rows (all will be imported)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invalid leads */}
            {invalidLeads.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #dce4ed", borderRadius: 8, marginBottom: 18, overflow: "hidden" }}>
                <div
                  style={{ padding: "14px 20px", borderBottom: showInvalid ? "1px solid #eef2f6" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => setShowInvalid(v => !v)}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#192943" }}>Invalid / Skipped Rows</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#fff5f5", color: "#e74c3c", border: "1px solid #fcc", borderRadius: 10, padding: "2px 10px" }}>
                      {invalidLeads.length} skipped
                    </span>
                    <span style={{ fontSize: 13, color: "#8a9ab0" }}>{showInvalid ? "▲" : "▼"}</span>
                  </div>
                </div>
                {showInvalid && (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#fff9f9" }}>
                          {["Row #", "Name", "Phone", "Email", "Issues"].map(h => (
                            <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 600, color: "#5e708d", fontSize: 12, borderBottom: "1px solid #f5e8e8" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invalidLeads.map((l, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #faf0f0" }}>
                            <td style={{ padding: "9px 16px", color: "#8a9ab0", fontSize: 12 }}>{l._rowIndex}</td>
                            <td style={{ padding: "9px 16px", color: "#192943" }}>{l.name || "—"}</td>
                            <td style={{ padding: "9px 16px", color: "#192943" }}>{l.phone || "—"}</td>
                            <td style={{ padding: "9px 16px", color: "#192943" }}>{l.email || "—"}</td>
                            <td style={{ padding: "9px 16px" }}>
                              {l._errors.map((e, j) => (
                                <span key={j} style={{
                                  display: "inline-block", marginRight: 6, padding: "2px 8px",
                                  background: "#fff5f5", border: "1px solid #fcc", borderRadius: 4,
                                  color: "#c0392b", fontSize: 11, fontWeight: 500,
                                }}>{e}</span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Import result */}
        {importResult && (
          <div style={{ background: "#fff", border: "1px solid #dce4ed", borderRadius: 8, padding: "28px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{importResult.failed === 0 ? "✅" : "⚠️"}</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#192943" }}>
              Import Complete
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 15, color: "#5e708d" }}>
              <span style={{ color: "#118849", fontWeight: 700 }}>{importResult.success} lead{importResult.success !== 1 ? "s" : ""} imported</span>
              {importResult.failed > 0 && <span style={{ color: "#e74c3c" }}> · {importResult.failed} failed</span>}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={handleReset} style={{
                padding: "10px 22px", background: "transparent", border: "1px solid #dce4ed",
                borderRadius: 6, color: "#5e708d", fontSize: 14, cursor: "pointer",
                fontFamily: "'Open Sans', Arial, sans-serif",
              }}>Import Another Sheet</button>
              <a href="/leads" style={{
                display: "inline-block", padding: "10px 22px", background: "#118849",
                borderRadius: 6, color: "#fff", fontWeight: 700, fontSize: 14,
                textDecoration: "none",
              }}>View Leads →</a>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
