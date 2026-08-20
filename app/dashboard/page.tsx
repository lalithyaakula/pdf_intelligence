"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Calendar,
  Link as LinkIcon,
  Mail,
  LogOut,
  Loader2,
  Check,
  UploadCloud,
  Sparkles,
} from "lucide-react";

interface DocItem {
  id: string;
  title: string;
  filePath: string;
  createdAt: string;
  summary?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Invite Modal State
  const [inviteModalDoc, setInviteModalDoc] = useState<DocItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      fetchDocs();
    }
  }, [status]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error(err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        await fetchDocs();
      } else {
        alert(data.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      alert("Error connecting to upload server.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopyLink = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}/documents/${id}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteModalDoc || !inviteEmail.trim()) return;
    setSendingInvite(true);
    setInviteError("");
    setInviteSuccessMsg("");

    try {
      const res = await fetch(`/api/documents/${inviteModalDoc.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteSuccessMsg(`Invite successfully dispatched to ${inviteEmail}`);
        setInviteEmail("");
      } else {
        setInviteError(data.error || "Failed to send invitation.");
      }
    } catch {
      setInviteError("Network error while sending invite.");
    } finally {
      setSendingInvite(false);
    }
  };

  const filtered = Array.isArray(documents)
    ? documents.filter((doc) =>
        (doc?.title || "").toLowerCase().includes((search || "").toLowerCase())
      )
    : [];

  if (status === "loading") {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <Loader2 className="animate-spin" style={{ width: "32px", height: "32px", color: "#2563eb" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 48px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              backgroundColor: "#2563eb",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
            }}
          >
            <Sparkles style={{ width: "20px", height: "20px" }} />
          </div>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>
            PDF Intelligence
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#f1f5f9",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "13px",
              color: "#334155",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
            {session?.user?.email || "User"}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut style={{ width: "14px", height: "14px" }} />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "36px 32px" }}>
        {/* Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            padding: "44px 20px",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "40px",
          }}
        >
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleUpload}
            style={{ display: "none" }}
          />
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            {uploading ? (
              <Loader2 className="animate-spin" style={{ width: "26px", height: "26px" }} />
            ) : (
              <UploadCloud style={{ width: "26px", height: "26px" }} />
            )}
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 6px 0" }}>
            {uploading ? "Extracting text and generating AI summary..." : "Click to browse or drag and drop your PDF here"}
          </h3>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
            Standard PDF documents up to 50MB
          </p>
        </div>

        {/* Section Title & Search Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>
              Your Document Library
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Showing {filtered.length} of {documents.length} documents
            </p>
          </div>

          <div style={{ position: "relative", width: "280px" }}>
            <Search
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                color: "#6366f1",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by filename..."
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <Loader2 className="animate-spin" style={{ width: "28px", height: "28px", color: "#2563eb" }} />
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <FileText style={{ width: "36px", height: "36px", color: "#94a3b8", marginBottom: "12px" }} />
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              No documents uploaded yet. Upload your first PDF above!
            </p>
          </div>
        )}

        {/* Document Cards */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "24px",
            }}
          >
            {filtered.map((doc) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        backgroundColor: "#fee2e2",
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText style={{ width: "22px", height: "22px" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.title}
                      </h3>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "12px",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Calendar style={{ width: "13px", height: "13px", color: "#60a5fa" }} />
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Summary Card Container */}
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #dcfce7",
                      borderRadius: "12px",
                      padding: "12px 14px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#15803d", letterSpacing: "0.5px" }}>
                        ✨ EXECUTIVE SUMMARY
                      </span>
                      <button
                        onClick={() => router.push(`/documents/${doc.id}`)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#16a34a",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Read full ↗
                      </button>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        lineHeight: "1.5",
                        color: "#166534",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {doc.summary || "Summary ready for interactive analysis."}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      fontWeight: "600",
                      fontSize: "13px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Open →
                  </button>

                  <button
                    onClick={(e) => handleCopyLink(doc.id, e)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copiedId === doc.id ? (
                      <>
                        <Check style={{ width: "14px", height: "14px", color: "#16a34a" }} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <LinkIcon style={{ width: "14px", height: "14px", color: "#94a3b8" }} />
                        Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setInviteModalDoc(doc);
                      setInviteSuccessMsg("");
                      setInviteError("");
                      setInviteEmail("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Mail style={{ width: "14px", height: "14px", color: "#c084fc" }} />
                    Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Live Email Invite Modal */}
      {inviteModalDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "440px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              Invite to Collaborate
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
              Dispatch an email invitation for <strong>{inviteModalDoc.title}</strong>.
            </p>

            {inviteSuccessMsg && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: "13px", marginBottom: "14px" }}>
                {inviteSuccessMsg}
              </div>
            )}

            {inviteError && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "13px", marginBottom: "14px" }}>
                {inviteError}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setInviteModalDoc(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Close
              </button>
              <button
                onClick={handleSendInvite}
                disabled={sendingInvite || !inviteEmail.trim()}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  border: "none",
                  cursor: sendingInvite ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {sendingInvite && <Loader2 className="animate-spin" style={{ width: "14px", height: "14px" }} />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}