import { useState } from "react";
import { authClient } from "@/lib/auth";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Invalid credentials");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (e: any) {
      setError(e?.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#eef2f6",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Open Sans', Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Header */}
        <div style={{ background: "#0f326b", padding: "32px", borderRadius: "4px 4px 0 0", textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, background: "#118849", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 auto 16px",
          }}>M</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>
            Masakhe <span style={{ color: "#118849" }}>Group</span>
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)", letterSpacing: "1px", textTransform: "uppercase" }}>
            Email Automation Portal
          </p>
        </div>

        {/* Form */}
        <div style={{ background: "#fff", padding: "32px", borderRadius: "0 0 4px 4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                style={{
                  width: "100%", padding: "11px 14px", fontSize: 14,
                  border: "1px solid #d1d9e0", borderRadius: 3,
                  fontFamily: "'Open Sans', Arial, sans-serif",
                  outline: "none", boxSizing: "border-box",
                  color: "#192943",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                style={{
                  width: "100%", padding: "11px 14px", fontSize: 14,
                  border: "1px solid #d1d9e0", borderRadius: 3,
                  fontFamily: "'Open Sans', Arial, sans-serif",
                  outline: "none", boxSizing: "border-box",
                  color: "#192943",
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 3, fontSize: 13, color: "#dc2626", marginBottom: 16,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px", background: "#118849", color: "#fff",
              border: "none", borderRadius: 3, fontSize: 15, fontWeight: 700,
              fontFamily: "'Open Sans', Arial, sans-serif", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, letterSpacing: 0.3,
            }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: "16px", background: "#f8fafb", borderRadius: 3, border: "1px solid #eef2f6" }}>
            <p style={{ fontSize: 12, color: "#5e708d", margin: 0, lineHeight: 1.5 }}>
              <strong>Access is by invitation only.</strong> Contact your system administrator to create your account or reset your password.
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#5e708d", marginTop: 20 }}>
          © 2026 Masakhe Group (Pty) Ltd · hello@masakhegroup.co.za
        </p>
      </div>
    </div>
  );
}
