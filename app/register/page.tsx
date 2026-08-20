"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || email.split("@")[0],
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Main Top Header Above Card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        <Sparkles style={{ width: "28px", height: "28px", color: "#0022f5" }} />
        <span
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "#0f172a",
            letterSpacing: "-0.5px",
          }}
        >
          PDF Intelligence
        </span>
      </div>

      {/* Main Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
          padding: "44px 36px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#0f172a",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Register
          </h1>
          <p
            style={{
              fontSize: "15px",
              color: "#475569",
              marginTop: "4px",
              marginBottom: 0,
              fontWeight: "400",
            }}
          >
            to create an account
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          <div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "10px",
              backgroundColor: "#0022f5",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
            }}
          >
            {loading ? "Creating account..." : "Continue"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "13px", color: "#64748b", marginTop: "28px" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#0f172a", fontWeight: "700", textDecoration: "none" }}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}