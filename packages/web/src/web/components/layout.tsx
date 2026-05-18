import { Link, useLocation } from "wouter";
import { authClient } from "@/lib/auth";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const NAV = [
  { path: "/dashboard", label: "Dashboard", icon: "⊞" },
  { path: "/leads", label: "Leads", icon: "👥" },
  { path: "/import", label: "Import Leads", icon: "📊" },
  { path: "/workflow", label: "Workflow", icon: "⚡" },
  { path: "/email-automation", label: "Email Automation", icon: "📧" },
  { path: "/users", label: "User Management", icon: "🔐", roles: ["super_admin", "admin"] },
];

const USER_CACHE_KEY = "masakhe_current_user";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [user, setUser] = useState<any>(() => {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.get("/me").then(r => r.json()).then(d => {
      setUser(d.user);
      try {
        if (d.user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(d.user));
        else localStorage.removeItem(USER_CACHE_KEY);
      } catch {}
    });
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/";
  };

  const visibleNav = NAV.filter(n => {
    if (!n.roles) return true;
    if (!user) return false;
    return n.roles.includes(user.role);
  });

  const ROLE_COLORS: Record<string, string> = {
    super_admin: "#118849",
    admin: "#0f326b",
    agent: "#5e708d",
    viewer: "#999",
  };

  return (
    <>
      {/* Responsive styles */}
      <style>{`
        .layout-sidebar {
          width: 240px;
          background: #192943;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
          transition: transform 0.25s ease;
        }
        .layout-main {
          margin-left: 240px;
          flex: 1;
          background: #eef2f6;
          min-height: 100vh;
        }
        .layout-content {
          padding: 28px 32px;
        }
        .sidebar-overlay {
          display: none;
        }
        .hamburger-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .layout-sidebar {
            transform: translateX(-100%);
          }
          .layout-sidebar.open {
            transform: translateX(0);
          }
          .layout-main {
            margin-left: 0;
          }
          .layout-content {
            padding: 16px;
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99;
          }
          .hamburger-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: #fff;
            width: 36px;
            height: 36px;
            border-radius: 4px;
          }
          .hamburger-btn:hover {
            background: rgba(255,255,255,0.1);
          }
          .topbar-title {
            font-size: 15px !important;
          }
          .topbar-date {
            display: none;
          }
        }
        @media (max-width: 480px) {
          .layout-content {
            padding: 12px;
          }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Open Sans', Arial, sans-serif" }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`layout-sidebar${sidebarOpen ? " open" : ""}`}>
          {/* Logo */}
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, background: "#118849", borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 18, color: "#fff"
              }}>M</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.2 }}>Masakhe</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Email Automation</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            {visibleNav.map(item => {
              const active = location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 20px", fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                  background: active ? "rgba(17,136,73,0.15)" : "transparent",
                  borderLeft: active ? "3px solid #118849" : "3px solid transparent",
                  textDecoration: "none", transition: "all 0.15s",
                  cursor: "pointer",
                }}>
                  <span style={{ fontSize: 16, minWidth: 20 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          {user && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: 10,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
                  background: ROLE_COLORS[user.role] ?? "#5e708d", color: "#fff"
                }}>{user.role?.replace("_", " ")}</span>
              </div>
              <button onClick={handleSignOut} style={{
                width: "100%", padding: "8px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 3,
                color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer",
                fontFamily: "'Open Sans', Arial, sans-serif",
              }}>Sign Out</button>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="layout-main">
          {/* Top bar */}
          <div style={{
            background: "#0f326b", padding: "0 20px", height: 56,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            position: "sticky", top: 0, zIndex: 50,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Hamburger - only visible on mobile via CSS */}
              <button
                className="hamburger-btn"
                onClick={() => setSidebarOpen(v => !v)}
                aria-label="Toggle menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <h1 className="topbar-title" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#fff", letterSpacing: 0.3 }}>
                {NAV.find(n => location.startsWith(n.path))?.label ?? "Masakhe"}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span className="topbar-date" style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {new Date().toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="layout-content">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
