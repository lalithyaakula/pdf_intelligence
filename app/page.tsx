"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      email: username,
      password: password,
      redirect: false,
    });

    if (!result?.error) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
      {/* DocuMind Heading */}
      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>
        DocuMind
      </h1>

      {/* Exact Card from Second Image */}
      <div style={{ width: "320px", border: "1px solid #e5e7eb", padding: "28px 24px", boxSizing: "border-box" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1f2937", textAlign: "center", margin: "0 0 20px 0" }}>
          Login
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px", color: "#111827", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px", color: "#111827", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            style={{ width: "100%", backgroundColor: "#007bff", color: "#ffffff", border: "none", borderRadius: "4px", padding: "10px 0", fontSize: "15px", fontWeight: "500", cursor: "pointer", marginTop: "4px" }}
          >
            Sign in
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "13px", color: "#4b5563", margin: "16px 0 0 0" }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "#007bff", textDecoration: "none" }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}