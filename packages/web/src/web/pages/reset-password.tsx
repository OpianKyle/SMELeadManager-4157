import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authClient } from "@/lib/auth";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) {
        setError(res.error.message ?? "Failed to reset password");
      } else {
        setDone(true);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to reset password");
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

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        color: "#5e708d", display: "flex", alignItems: "center",
      }}
    >
      {show ? (
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
  );

  return (
    <div style={{
      minHeight: "100vh", background: "#eef2f6",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Open Sans', Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
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

        <div style={{ background: "#fff", padding: "32px", borderRadius: "0 0 4px 4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, background: "#f0fdf4", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: 26,
              }}>✅</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#192943", margin: "0 0 10px" }}>
                Password updated!
              </h2>
              <p style={{ fontSize: 13, color: "#5e708d", margin: "0 0 24px", lineHeight: 1.6 }}>
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                type="button"
                onClick={() => setLocation("/sign-in")}
                style={{
                  width: "100%", padding: "13px", background: "#118849", color: "#fff",
                  border: "none", borderRadius: 3, fontSize: 15, fontWeight: 700,
                  fontFamily: "'Open Sans', Arial, sans-serif", cursor: "pointer", letterSpacing: 0.3,
                }}
              >
                Sign In →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#192943", margin: "0 0 8px" }}>
                Set a new password
              </h2>
              <p style={{ fontSize: 13, color: "#5e708d", margin: "0 0 24px", lineHeight: 1.6 }}>
                Choose a strong password of at least 8 characters.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  {eyeButton(showPassword, () => setShowPassword(v => !v))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#192943", marginBottom: 6 }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    required placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  {eyeButton(showConfirm, () => setShowConfirm(v => !v))}
                </div>
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
                {loading ? "Updating..." : "Update Password →"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#5e708d", marginTop: 20 }}>
          © 2026 Masakhe Group (Pty) Ltd · hello@masakhegroup.co.za
        </p>
      </div>
    </div>
  );
}
