import { useEffect } from "react";
import { useLocation } from "wouter";
import { authClient } from "@/lib/auth";

export default function Index() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.session) {
        setLocation("/dashboard");
      } else {
        setLocation("/sign-in");
      }
    });
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#eef2f6", fontFamily: "'Open Sans', Arial, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, background: "#118849", borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 auto 16px",
        }}>M</div>
        <p style={{ color: "#5e708d", fontSize: 14 }}>Loading Masakhe Email Automation…</p>
      </div>
    </div>
  );
}
