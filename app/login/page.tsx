"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, CheckCircle2, X } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const justRegistered = searchParams.get("registered") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (justRegistered) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [justRegistered]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error || "Invalid email or password");
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
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
      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#ffffff",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "10px 18px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          }}
        >
          <CheckCircle2 style={{ width: "18px", height: "18px", color: "#16a34a" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#15803d" }}>
            Account created successfully! Please sign in.
          </span>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              marginLeft: "6px",
              color: "#9ca3af",
            }}
          >
            <X style={{ width: "15px", height: "15px" }} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <Sparkles style={{ width: "26px", height: "26px", color: "#0022f5" }} />
        <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>
          PDF Intelligence
        </span>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
          padding: "40px 36px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "26px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
            Login
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px", marginBottom: 0 }}>
            to get started
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
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
              color: "#1e293b",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
              color: "#1e293b",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ textAlign: "left", marginTop: "-2px" }}>
            <Link href="/forgot-password" style={{ fontSize: "12px", color: "#64748b", textDecoration: "none" }}>
              Forgot Password?
            </Link>
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
            {loading ? "Please wait..." : "Continue"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "13px", color: "#64748b", marginTop: "26px" }}>
          New User?{" "}
          <Link href="/register" style={{ color: "#0f172a", fontWeight: "700", textDecoration: "none" }}>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}