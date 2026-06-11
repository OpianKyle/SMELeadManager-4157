import { useState } from "react";
import { authClient } from "@/lib/auth";

type View = "sign-in" | "forgot-password" | "forgot-sent";

export default function SignIn() {
  const [view, setView] = useState<View>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send reset email");
      } else {
        setView("forgot-sent");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    border: "1px solid #d1d9e0", borderRadius: 3,
    fontFamily: "'Open Sans', Arial, sans-serif",
    outline: "none", boxSizing: "border-box", color: "#192943",
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

          {/* ── Sign In ── */}
          {view === "sign-in" && (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: "#5e708d", display: "flex", alignItems: "center",
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "right", marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={() => { setView("forgot-password"); setError(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, color: "#118849", fontFamily: "'Open Sans', Arial, sans-serif",
                    textDecoration: "underline", padding: 0,
                  }}
                >
                  Forgot password?
                </button>
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

              <div style={{ marginTop: 24, padding: "16px", background: "#f8fafb", borderRadius: 3, border: "1px solid #eef2f6" }}>
                <p style={{ fontSize: 12, color: "#5e708d", margin: 0, lineHeight: 1.5 }}>
                  <strong>Access is by invitation only.</strong> Contact your system administrator to create your account or reset your password.
                </p>
              </div>
            </form>
          )}

          {/* ── Forgot Password ── */}
          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword}>
              <button
                type="button"
                onClick={() => { setView("sign-in"); setError(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: 12, color: "#5e708d", fontFamily: "'Open Sans', Arial, sans-serif",
                  display: "flex", alignItems: "center", gap: 4, marginBottom: 20,
                }}
              >
                ← Back to sign in
              </button>

              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#192943", margin: "0 0 8px" }}>
                Reset your password
              </h2>
              <p style={{ fontSize: 13, color: "#5e708d", margin: "0 0 24px", lineHeight: 1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca",
                  borderRadius: 3, fontSize: 13, color: "#dc2626", marginBottom: 16,
                }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px", background: "#0f326b", color: "#fff",
                border: "none", borderRadius: 3, fontSize: 15, fontWeight: 700,
                fontFamily: "'Open Sans', Arial, sans-serif", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, letterSpacing: 0.3,
              }}>
                {loading ? "Sending..." : "Send Reset Link →"}
              </button>
            </form>
          )}

          {/* ── Forgot Sent ── */}
          {view === "forgot-sent" && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, background: "#f0fdf4", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: 26,
              }}>✉️</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#192943", margin: "0 0 10px" }}>
                Check your inbox
              </h2>
              <p style={{ fontSize: 13, color: "#5e708d", margin: "0 0 24px", lineHeight: 1.6 }}>
                We've sent a password reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.
              </p>
              <button
                type="button"
                onClick={() => { setView("sign-in"); setError(""); }}
                style={{
                  background: "none", border: "1px solid #d1d9e0", cursor: "pointer",
                  padding: "10px 20px", borderRadius: 3, fontSize: 13, color: "#192943",
                  fontFamily: "'Open Sans', Arial, sans-serif",
                }}
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#5e708d", marginTop: 20 }}>
          © 2026 Masakhe Group (Pty) Ltd · hello@masakhegroup.co.za
        </p>
      </div>
    </div>
  );
}
