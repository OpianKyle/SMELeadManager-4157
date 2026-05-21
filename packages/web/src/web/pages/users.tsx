import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { api } from "@/lib/api";

const ROLES = [
  { value: "super_admin", label: "Super Admin", color: "#118849", desc: "Full access + user management" },
  { value: "admin",       label: "Distributor", color: "#0f326b", desc: "All features except user management" },
  { value: "agent",       label: "Agent",       color: "#5e708d", desc: "Leads, workflow, send emails" },
  { value: "viewer",      label: "Viewer",      color: "#999",    desc: "Read-only access" },
];

export default function Users() {
  const [users, setUsers]     = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [toast, setToast]     = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm]       = useState({
    name: "", email: "", password: "", role: "viewer", phone: "", department: "", whatsappNumber: "",
  });

  useEffect(() => {
    load();
    api.get("/me").then(r => r.json()).then(d => setCurrentUser(d.user));
  }, []);

  const load = () => {
    setFetching(true);
    api.get("/users").then(r => r.json()).then(d => {
      setUsers(d.users ?? []);
      setFetching(false);
    });
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await api.post("/users", form);
    const data = await res.json();
    setLoading(false);
    if (data.error) { showToast("❌ " + data.error); return; }
    showToast("✅ User created successfully");
    setShowAdd(false);
    setForm({ name: "", email: "", password: "", role: "viewer", phone: "", department: "", whatsappNumber: "" });
    load();
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { id, ...rest } = editUser;
    const res = await api.put(`/users/${id}`, rest);
    const data = await res.json();
    setLoading(false);
    if (data.error) { showToast("❌ " + data.error); return; }
    showToast("✅ User updated");
    setEditUser(null);
    load();
  };

  const toggleActive = async (u: any) => {
    await api.put(`/users/${u.id}`, { isActive: !u.isActive });
    showToast(u.isActive ? "User deactivated" : "User activated");
    load();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Permanently delete this user?")) return;
    const res = await api.delete(`/users/${id}`);
    const data = await res.json();
    if (data.error) { showToast("❌ " + data.error); return; }
    showToast("✅ User deleted");
    load();
  };

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";

  const FIELD = (label: string, key: string, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={(form as any)[key] ?? ""} placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        required={["name","email","password"].includes(key)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0",
          borderRadius: 3, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif",
          color: "#192943", boxSizing: "border-box",
        }}
      />
    </div>
  );

  const EDIT_FIELD = (label: string, key: string, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={editUser?.[key] ?? ""} placeholder={placeholder}
        onChange={e => setEditUser((p: any) => ({ ...p, [key]: e.target.value }))}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0",
          borderRadius: 3, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif",
          color: "#192943", boxSizing: "border-box",
        }}
      />
    </div>
  );

  return (
    <Layout>
      <style>{`
        .users-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .roles-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .users-table-wrap {
          background: #fff;
          border-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
        .users-table-wrap table th,
        .users-table-wrap table td {
          white-space: nowrap;
        }
        .users-cards {
          display: none;
          flex-direction: column;
          gap: 10px;
        }
        .user-card {
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          padding: 16px;
          border-left: 4px solid #5e708d;
        }
        .user-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .user-card-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 12px;
          font-size: 12px;
          color: #5e708d;
          margin-bottom: 12px;
        }
        .user-card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 10px;
          border-top: 1px solid #eef2f6;
        }
        @media (max-width: 900px) {
          .roles-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 1024px) {
          .users-table-wrap {
            display: none;
          }
          .users-cards {
            display: flex;
          }
          .roles-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 16px;
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

      {/* Header */}
      <div className="users-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#192943" }}>User Management</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5e708d" }}>
            Permission-based user profiles and access control
          </p>
        </div>
        {(isSuperAdmin || isAdmin) && (
          <button onClick={() => {
            setForm(p => ({ ...p, role: isAdmin ? "agent" : p.role }));
            setShowAdd(true);
          }} style={{
            background: "#118849", color: "#fff", border: "none", borderRadius: 3,
            padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Open Sans',Arial,sans-serif", whiteSpace: "nowrap",
          }}>{isAdmin ? "+ Create Agent" : "+ Create User"}</button>
        )}
      </div>

      {/* Role legend */}
      <div className="roles-grid">
        {ROLES.map(r => (
          <div key={r.value} style={{
            background: "#fff", borderRadius: 4, padding: "16px 18px",
            borderTop: `3px solid ${r.color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: r.color, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px",
              }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#192943" }}>
                {users.filter(u => u.role === r.value).length}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#5e708d", lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="users-table-wrap">
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#192943" }}>
              {["Name", "Email", "Role", "Department", "Phone", "WhatsApp", "Status", "Created", "Actions"].map(h => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left", fontSize: 11,
                  fontWeight: 700, color: "rgba(255,255,255,0.7)",
                  letterSpacing: "1px", textTransform: "uppercase",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const roleMeta = ROLES.find(r => r.value === u.role);
              const isMe = u.id === currentUser?.id;
              return (
                <tr key={u.id} style={{
                  borderBottom: "1px solid #eef2f6",
                  background: isMe ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafbfc",
                }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 16,
                        background: roleMeta?.color ?? "#eef2f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#192943" }}>
                          {u.name} {isMe && <span style={{ fontSize: 10, color: "#118849", fontWeight: 700 }}>(You)</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#5e708d" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: roleMeta?.color ?? "#eef2f6", color: "#fff",
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>{roleMeta?.label ?? u.role?.replace("_", " ")}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#5e708d" }}>{u.department ?? "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#5e708d" }}>{u.phone ?? "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    {u.whatsappNumber
                      ? <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#15803d" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          {u.whatsappNumber}
                        </span>
                      : <span style={{ color: "#999" }}>—</span>
                    }
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: u.isActive ? "#dcfce7" : "#fee2e2",
                      color: u.isActive ? "#15803d" : "#dc2626",
                    }}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#5e708d" }}>
                    {u.createdAt ? (() => {
                      const d = typeof u.createdAt === "number" ? new Date(u.createdAt * 1000) : new Date(u.createdAt);
                      return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-ZA");
                    })() : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(isSuperAdmin || currentUser?.role === "admin") && (
                        <button onClick={() => setEditUser({ ...u })} style={{
                          padding: "5px 10px", background: "#eef2f6", border: "1px solid #d1d9e0",
                          color: "#192943", borderRadius: 3, fontSize: 12, cursor: "pointer",
                          fontFamily: "'Open Sans',Arial,sans-serif",
                        }}>Edit</button>
                      )}
                      {isSuperAdmin && !isMe && (
                        <>
                          <button onClick={() => toggleActive(u)} style={{
                            padding: "5px 10px",
                            background: u.isActive ? "#fffbeb" : "#f0fdf4",
                            border: `1px solid ${u.isActive ? "#fcd34d" : "#86efac"}`,
                            color: u.isActive ? "#d97706" : "#15803d",
                            borderRadius: 3, fontSize: 12, cursor: "pointer",
                            fontFamily: "'Open Sans',Arial,sans-serif",
                          }}>{u.isActive ? "Deactivate" : "Activate"}</button>
                          <button onClick={() => deleteUser(u.id)} style={{
                            padding: "5px 10px", background: "#fef2f2", border: "1px solid #fecaca",
                            color: "#dc2626", borderRadius: 3, fontSize: 12, cursor: "pointer",
                            fontFamily: "'Open Sans',Arial,sans-serif",
                          }}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {fetching && users.length === 0 && (
              <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", fontSize: 14, color: "#5e708d" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, border: "2px solid #d1d9e0",
                    borderTopColor: "#192943", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Loading users…
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </td></tr>
            )}
            {!fetching && users.length === 0 && (
              <tr><td colSpan={9} style={{ padding: "32px", textAlign: "center", fontSize: 14, color: "#5e708d" }}>
                No users yet. Create the first user to get started.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Cards */}
      <div className="users-cards">
        {fetching && users.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", fontSize: 14, color: "#5e708d", background: "#fff", borderRadius: 6 }}>
            Loading users…
          </div>
        )}
        {!fetching && users.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", fontSize: 14, color: "#5e708d", background: "#fff", borderRadius: 6 }}>
            No users yet. Create the first user to get started.
          </div>
        )}
        {users.map(u => {
          const roleMeta = ROLES.find(r => r.value === u.role);
          const isMe = u.id === currentUser?.id;
          const createdDate = u.createdAt
            ? (() => { const d = typeof u.createdAt === "number" ? new Date(u.createdAt * 1000) : new Date(u.createdAt); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-ZA"); })()
            : "—";
          return (
            <div key={u.id} className="user-card" style={{ borderLeftColor: roleMeta?.color ?? "#5e708d" }}>
              <div className="user-card-top">
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: roleMeta?.color ?? "#eef2f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#192943", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {u.name}
                    {isMe && <span style={{ fontSize: 10, color: "#118849", fontWeight: 700 }}>(You)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#5e708d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: roleMeta?.color ?? "#eef2f6", color: "#fff",
                    textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap",
                  }}>{u.role?.replace(/_/g, " ")}</span>
                  <span style={{
                    padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                    background: u.isActive ? "#dcfce7" : "#fee2e2",
                    color: u.isActive ? "#15803d" : "#dc2626", whiteSpace: "nowrap",
                  }}>{u.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>

              <div className="user-card-meta">
                {u.department && <span><strong style={{ color: "#192943" }}>Dept:</strong> {u.department}</span>}
                {u.phone && <span><strong style={{ color: "#192943" }}>Phone:</strong> {u.phone}</span>}
                {u.whatsappNumber && <span><strong style={{ color: "#192943" }}>WhatsApp:</strong> {u.whatsappNumber}</span>}
                <span><strong style={{ color: "#192943" }}>Joined:</strong> {createdDate}</span>
              </div>

              <div className="user-card-actions">
                {(isSuperAdmin || currentUser?.role === "admin") && (
                  <button onClick={() => setEditUser({ ...u })} style={{
                    padding: "7px 14px", background: "#eef2f6", border: "1px solid #d1d9e0",
                    color: "#192943", borderRadius: 3, fontSize: 13, cursor: "pointer",
                    fontFamily: "'Open Sans',Arial,sans-serif",
                  }}>Edit</button>
                )}
                {isSuperAdmin && !isMe && (
                  <>
                    <button onClick={() => toggleActive(u)} style={{
                      padding: "7px 14px",
                      background: u.isActive ? "#fffbeb" : "#f0fdf4",
                      border: `1px solid ${u.isActive ? "#fcd34d" : "#86efac"}`,
                      color: u.isActive ? "#d97706" : "#15803d",
                      borderRadius: 3, fontSize: 13, cursor: "pointer",
                      fontFamily: "'Open Sans',Arial,sans-serif",
                    }}>{u.isActive ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => deleteUser(u.id)} style={{
                      padding: "7px 14px", background: "#fef2f2", border: "1px solid #fecaca",
                      color: "#dc2626", borderRadius: 3, fontSize: 13, cursor: "pointer",
                      fontFamily: "'Open Sans',Arial,sans-serif",
                    }}>Delete</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create user modal */}
      {showAdd && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,50,107,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }}>
          <div style={{
            background: "#fff", borderRadius: 4, width: 520, maxWidth: "92vw",
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ background: "#0f326b", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Create New User</h2>
              <button onClick={() => setShowAdd(false)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.7)",
                fontSize: 20, cursor: "pointer", lineHeight: 1,
              }}>×</button>
            </div>
            <div style={{ padding: "28px" }}>
              <form onSubmit={createUser}>
                {FIELD("Full Name *", "name", "text", "Sipho Dlamini")}
                {FIELD("Email Address *", "email", "email", "sipho@masakhegroup.co.za")}
                {FIELD("Password *", "password", "password", "Min. 8 characters")}
                {FIELD("Phone Number", "phone", "tel", "+27 82 000 0000")}
                {FIELD("WhatsApp Number", "whatsappNumber", "tel", "+27 82 000 0000")}
                {FIELD("Department", "department", "text", "Sales, Support, Management…")}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 8 }}>Role & Permissions *</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(isAdmin ? ROLES.filter(r => r.value === "agent") : ROLES).map(r => (
                      <label key={r.value} style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "12px 14px", border: `2px solid ${form.role === r.value ? r.color : "#eef2f6"}`,
                        borderRadius: 3, cursor: "pointer", background: form.role === r.value ? `${r.color}10` : "#fff",
                        transition: "all 0.15s",
                      }}>
                        <input
                          type="radio" name="role" value={r.value}
                          checked={form.role === r.value}
                          onChange={() => setForm(p => ({ ...p, role: r.value }))}
                          style={{ marginTop: 2 }}
                        />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              padding: "1px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: r.color, color: "#fff", textTransform: "uppercase",
                            }}>{r.label}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#5e708d", marginTop: 3 }}>{r.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={loading} style={{
                    flex: 1, padding: "12px", background: "#118849", color: "#fff",
                    border: "none", borderRadius: 3, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Open Sans',Arial,sans-serif", cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}>
                    {loading ? "Creating..." : "Create User"}
                  </button>
                  <button type="button" onClick={() => setShowAdd(false)} style={{
                    padding: "12px 20px", background: "#eef2f6", color: "#192943",
                    border: "none", borderRadius: 3, fontSize: 14, fontWeight: 600,
                    fontFamily: "'Open Sans',Arial,sans-serif", cursor: "pointer",
                  }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,50,107,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }}>
          <div style={{
            background: "#fff", borderRadius: 4, width: 520, maxWidth: "92vw",
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ background: "#192943", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Edit User — {editUser.name}</h2>
              <button onClick={() => setEditUser(null)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.7)",
                fontSize: 20, cursor: "pointer", lineHeight: 1,
              }}>×</button>
            </div>
            <div style={{ padding: "28px" }}>
              <form onSubmit={updateUser}>
                {EDIT_FIELD("Full Name", "name", "text")}
                {EDIT_FIELD("Phone", "phone", "tel")}
                {EDIT_FIELD("WhatsApp Number", "whatsappNumber", "tel", "+27 82 000 0000")}
                {EDIT_FIELD("Department", "department", "text")}

                {isSuperAdmin && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 8 }}>Role</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ROLES.map(r => (
                        <label key={r.value} style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "10px 14px", border: `2px solid ${editUser.role === r.value ? r.color : "#eef2f6"}`,
                          borderRadius: 3, cursor: "pointer",
                          background: editUser.role === r.value ? `${r.color}10` : "#fff",
                        }}>
                          <input
                            type="radio" name="editRole" value={r.value}
                            checked={editUser.role === r.value}
                            onChange={() => setEditUser((p: any) => ({ ...p, role: r.value }))}
                            style={{ marginTop: 2 }}
                          />
                          <div>
                            <span style={{
                              padding: "1px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: r.color, color: "#fff", textTransform: "uppercase",
                            }}>{r.label}</span>
                            <div style={{ fontSize: 12, color: "#5e708d", marginTop: 3 }}>{r.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isSuperAdmin && editUser.role !== "super_admin" && (() => {
                  const NAV_SECTIONS = [
                    { key: "dashboard",        label: "Dashboard" },
                    { key: "leads",            label: "Leads" },
                    { key: "import",           label: "Import Leads" },
                    { key: "workflow",         label: "Workflow" },
                    { key: "email-automation", label: "Email Automation" },
                    ...(["admin"].includes(editUser.role) ? [{ key: "users", label: "User Management" }] : []),
                  ];
                  const current: string[] = (() => {
                    try { return editUser.permissions ? JSON.parse(editUser.permissions) : NAV_SECTIONS.map(s => s.key); }
                    catch { return NAV_SECTIONS.map(s => s.key); }
                  })();
                  const toggle = (key: string) => {
                    const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
                    setEditUser((p: any) => ({ ...p, permissions: JSON.stringify(next) }));
                  };
                  return (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 4 }}>
                        Visible Sections
                      </label>
                      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#5e708d" }}>
                        Choose which pages this user can access.
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {NAV_SECTIONS.map(s => (
                          <label key={s.key} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "9px 12px", borderRadius: 3, cursor: "pointer",
                            border: `1px solid ${current.includes(s.key) ? "#118849" : "#d1d9e0"}`,
                            background: current.includes(s.key) ? "#f0fdf4" : "#fafbfc",
                            fontSize: 13, color: "#192943",
                          }}>
                            <input
                              type="checkbox"
                              checked={current.includes(s.key)}
                              onChange={() => toggle(s.key)}
                            />
                            {s.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={loading} style={{
                    flex: 1, padding: "12px", background: "#0f326b", color: "#fff",
                    border: "none", borderRadius: 3, fontSize: 14, fontWeight: 700,
                    fontFamily: "'Open Sans',Arial,sans-serif", cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button type="button" onClick={() => setEditUser(null)} style={{
                    padding: "12px 20px", background: "#eef2f6", color: "#192943",
                    border: "none", borderRadius: 3, fontSize: 14, fontWeight: 600,
                    fontFamily: "'Open Sans',Arial,sans-serif", cursor: "pointer",
                  }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
