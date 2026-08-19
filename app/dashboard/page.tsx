"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  summary: string | null;
  createdAt: string;
  shareToken: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal State: Full Summary Quick View
  const [activeModalDoc, setActiveModalDoc] = useState<DocumentItem | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Card Share Button Feedback State
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Modal State: Email Invite
  const [emailInviteDoc, setEmailInviteDoc] = useState<DocumentItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load documents from backend
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/documents");
      const rawText = await res.text();

      let data: any = {};
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { documents: [] };
        }
      }

      if (res.ok && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      } else {
        setDocuments([]);
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setErrorMsg("Failed to fetch documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadDocuments();
    }
  }, [status, router]);

  // Handle PDF Upload
  const handleFileUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Only PDF documents (.pdf) are supported.");
      return;
    }

    setUploading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Invalid response format from server.");
        }
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document.");
      }

      setSelectedFile(null);
      await loadDocuments();
    } catch (err: any) {
      setErrorMsg(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setSelectedFile(droppedFile);
      handleFileUpload(droppedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Date Formatter
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Recently uploaded";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recently uploaded";

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Copy Direct Share Link
  const handleCopyCardShareLink = (shareToken: string, docId: string) => {
    const shareUrl = `${window.location.origin}/documents/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareId(docId);
    setTimeout(() => setCopiedShareId(null), 2000);
  };

  // Copy Summary Text
  const handleCopySummary = (text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Send Email Invite Handler
  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInviteDoc || !inviteEmail.trim() || sendingEmail) return;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch(`/api/documents/${emailInviteDoc.id}/share-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: inviteEmail.trim(),
          customNote: inviteNote.trim(),
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error("Server route not found or failed to respond.");
      }

      if (!res.ok) {
        throw new Error(data.error || `Server responded with error (${res.status})`);
      }

      setEmailStatus({ type: "success", text: data.message || "Invitation sent successfully!" });
      setInviteEmail("");
      setInviteNote("");
      setTimeout(() => {
        setEmailInviteDoc(null);
        setEmailStatus(null);
      }, 2000);
    } catch (err: any) {
      setEmailStatus({ type: "error", text: err.message || "Failed to send email." });
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter documents by filename
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) =>
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [documents, searchQuery]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", color: "#64748b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
          <p style={{ fontSize: "14px", fontWeight: "500" }}>Connecting to DocMind Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 30, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #2563eb, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "16px" }}>
              D
            </div>
            <span style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.02em", color: "#0f172a" }}>
              DocMind<span style={{ color: "#2563eb" }}>.ai</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f1f5f9", padding: "4px 12px", borderRadius: "20px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }}></div>
              <span style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{session?.user?.email}</span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", background: "none", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "6px", cursor: "pointer" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Metric Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Documents</span>
            <p style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", margin: "8px 0 0" }}>{documents.length}</p>
          </div>

          {/* AI Engine Stat Card */}
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Engine</span>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#2563eb", margin: "14px 0 0" }}>Gemini</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Collaboration Status</span>
            <p style={{ fontSize: "16px", fontWeight: "700", color: "#10b981", margin: "14px 0 0" }}>Link & Email Active</p>
          </div>
        </div>

        {/* Upload Hero Card */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "28px", marginBottom: "36px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px" }}>Analyze a New Document</h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Upload any technical PDF for instant executive summaries & conversational Q&A.</p>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? "#2563eb" : "#cbd5e1"}`,
              backgroundColor: dragActive ? "#eff6ff" : "#f8fafc",
              borderRadius: "10px",
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => document.getElementById("pdf-file-input")?.click()}
          >
            <input
              id="pdf-file-input"
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                if (file) handleFileUpload(file);
              }}
            />

            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "#e0e7ff", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "20px" }}>
              📄
            </div>

            {uploading ? (
              <div>
                <p style={{ fontSize: "15px", fontWeight: "600", color: "#2563eb", margin: "0 0 4px" }}>
                  Extracting text and generating executive summary...
                </p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>This takes just a few seconds.</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", margin: "0 0 4px" }}>
                  Click to browse or drag and drop your PDF here
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Standard PDF documents up to 50MB</p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", marginTop: "14px" }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Section Header with Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Your Document Library
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
              Showing {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Filter by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "9px 14px 9px 36px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", width: "260px", backgroundColor: "#ffffff", outline: "none", color: "#1e293b" }}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8" }}>
              🔍
            </span>
          </div>
        </div>

        {/* Document Cards Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            <p style={{ fontSize: "14px" }}>Loading your library...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 20px", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📂</div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", margin: "0 0 6px" }}>
              {searchQuery ? `No files matching "${searchQuery}"` : "No documents uploaded yet"}
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {searchQuery ? "Try clearing your search query" : "Upload your first PDF above to start analyzing."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ padding: "8px", backgroundColor: "#fee2e2", borderRadius: "6px", color: "#dc2626", fontSize: "16px" }}>
                      📄
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.filename}
                      </h3>
                      <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px" }}>
                        📅 {formatDate(doc.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Summary Box with modal trigger */}
                  <div
                    onClick={() => setActiveModalDoc(doc)}
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #dcfce7",
                      borderRadius: "8px",
                      padding: "12px",
                      marginBottom: "18px",
                      cursor: "pointer",
                    }}
                    title="Click to view full executive summary"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        ✨ Executive Summary
                      </span>
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                        Read full ↗
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#166534", lineHeight: "1.5", margin: 0, maxHeight: "72px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {doc.summary || "Summary unavailable."}
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons: Open, Copy Link, Email Invite */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Link
                    href={`/documents/${doc.id}`}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "8px 0",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      textDecoration: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Open <span>→</span>
                  </Link>

                  <button
                    onClick={() => handleCopyCardShareLink(doc.shareToken, doc.id)}
                    style={{
                      padding: "8px 10px",
                      backgroundColor: copiedShareId === doc.id ? "#dcfce7" : "#f1f5f9",
                      color: copiedShareId === doc.id ? "#15803d" : "#475569",
                      border: copiedShareId === doc.id ? "1px solid #86efac" : "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    title="Copy direct share link"
                  >
                    {copiedShareId === doc.id ? "✓ Copied" : "🔗 Link"}
                  </button>

                  <button
                    onClick={() => setEmailInviteDoc(doc)}
                    style={{
                      padding: "8px 10px",
                      backgroundColor: "#f8fafc",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    title="Send email invite to a colleague"
                  >
                    ✉️ Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Full Executive Summary Modal */}
      {activeModalDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
          onClick={() => setActiveModalDoc(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "600px",
              width: "100%",
              padding: "24px",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                ✨ Executive Summary
              </h3>
              <button
                onClick={() => setActiveModalDoc(null)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px", maxHeight: "350px", overflowY: "auto" }}>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#334155", margin: 0, whiteSpace: "pre-wrap" }}>
                {activeModalDoc.summary || "No summary available."}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => handleCopySummary(activeModalDoc.summary)}
                style={{ padding: "8px 14px", fontSize: "13px", fontWeight: "600", backgroundColor: copiedSummary ? "#dcfce7" : "#f1f5f9", color: copiedSummary ? "#15803d" : "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}
              >
                {copiedSummary ? "✓ Copied" : "📋 Copy Summary"}
              </button>
              <button
                onClick={() => setActiveModalDoc(null)}
                style={{ padding: "8px 16px", fontSize: "13px", fontWeight: "600", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Invite Modal */}
      {emailInviteDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "20px",
          }}
          onClick={() => setEmailInviteDoc(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                ✉️ Send Email Invitation
              </h3>
              <button
                onClick={() => setEmailInviteDoc(null)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Share <strong>{emailInviteDoc.filename}</strong> with a reviewer or teammate.
            </p>

            {emailStatus && (
              <div
                style={{
                  backgroundColor: emailStatus.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: emailStatus.type === "success" ? "#15803d" : "#b91c1c",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                {emailStatus.text}
              </div>
            )}

            <form onSubmit={handleSendEmailInvite} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Optional Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please review this document and add your feedback."
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEmailInviteDoc(null)}
                  style={{ padding: "8px 14px", fontSize: "13px", color: "#64748b", background: "none", border: "none", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail || !inviteEmail.trim()}
                  style={{
                    padding: "8px 18px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    opacity: sendingEmail ? 0.7 : 1,
                  }}
                >
                  {sendingEmail ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}