import { useState } from "react";
import { api } from "@/lib/api";

export default function Setup() {
  const [name, setName] = useState("Super Admin");
  const [email, setEmail] = useState("admin@masakhegroup.co.za");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setMessage("Passwords do not match"); setStatus("error"); return; }
    if (password.length < 8) { setMessage("Password must be at least 8 characters"); setStatus("error"); return; }
    setStatus("loading");
    const res = await api.post("/setup", { name, email, password });
    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
      setStatus("error");
    } else {
      setStatus("done");
      setMessage("Super admin account created successfully!");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#eef2f6",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Open Sans', Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* Header */}
        <div style={{ background: "#0f326b", padding: "28px 32px", borderRadius: "4px 4px 0 0", textAlign: "center" }}>
          <div style={{
            width: 44, height: 44, background: "#118849", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 auto 14px",
          }}>M</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" }}>
            Masakhe <span style={{ color: "#118849" }}>Group</span>
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            Initial Setup — Create Super Admin
          </p>
        </div>

        {/* Form */}
        <div style={{ background: "#fff", padding: "28px 32px", borderRadius: "0 0 4px 4px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>

          {status === "done" ? (
            <div>
              <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#192943" }}>Setup Complete!</h2>
                <p style={{ fontSize: 14, color: "#5e708d", margin: "0 0 20px" }}>
                  Your super admin account has been created. You can now sign in.
                </p>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 3, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#192943", marginBottom: 4 }}><strong>Email:</strong> {email}</div>
                <div style={{ fontSize: 13, color: "#192943" }}><strong>Password:</strong> as set above</div>
              </div>
              <a href="/sign-in" style={{
                display: "block", textAlign: "center", padding: "13px",
                background: "#118849", color: "#fff", borderRadius: 3,
                fontSize: 14, fontWeight: 700, textDecoration: "none",
              }}>Go to Sign In →</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 3, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
                  <strong>⚠️ First-time setup only.</strong> This page is disabled once any user exists.
                </p>
              </div>

              {[
                { label: "Full Name", value: name, set: setName, type: "text" },
                { label: "Email Address", value: email, set: setEmail, type: "email" },
                { label: "Password", value: password, set: setPassword, type: "password" },
                { label: "Confirm Password", value: confirm, set: setConfirm, type: "password" },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#192943", marginBottom: 5 }}>{f.label}</label>
                  <input
                    type={f.type} value={f.value}
                    onChange={e => f.set(e.target.value)} required
                    style={{
                      width: "100%", padding: "10px 12px", border: "1px solid #d1d9e0",
                      borderRadius: 3, fontSize: 14, fontFamily: "'Open Sans',Arial,sans-serif",
                      color: "#192943", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              {status === "error" && (
                <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 3, fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={status === "loading"} style={{
                width: "100%", padding: "13px", background: "#118849", color: "#fff",
                border: "none", borderRadius: 3, fontSize: 15, fontWeight: 700,
                fontFamily: "'Open Sans',Arial,sans-serif",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
              }}>
                {status === "loading" ? "Creating account..." : "Create Super Admin →"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#5e708d", marginTop: 16 }}>
          © 2026 Masakhe Group (Pty) Ltd
        </p>
      </div>
    </div>
  );
}
