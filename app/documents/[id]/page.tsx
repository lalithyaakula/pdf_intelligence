"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DocumentData {
  id: string;
  title: string;
  filePath: string;
  summary?: string | null;
  createdAt?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CommentData {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export default function DocumentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap async params in Next.js 15+
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;
  const router = useRouter();

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  // Active Tab: "chat" | "comments" | "summary"
  const [activeTab, setActiveTab] = useState<"chat" | "comments" | "summary">("chat");

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Comments State
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Share state
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Fetch Document Metadata
  useEffect(() => {
    async function loadDocument() {
      try {
        setLoadingDoc(true);
        const res = await fetch(`/api/documents/${documentId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setDocError("Document not found. It may have been deleted or moved.");
          } else {
            setDocError("Failed to fetch document details.");
          }
          return;
        }
        const data = await res.json();
        setDocument(data);
      } catch (err: any) {
        setDocError(err.message || "An unexpected error occurred.");
      } finally {
        setLoadingDoc(false);
      }
    }

    if (documentId) {
      loadDocument();
      fetchComments();
    }
  }, [documentId]);

  // 2. Fetch Comments List
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("[Comments] Error loading comments:", err);
    }
  };

  // 3. Auto-poll comments every 4 seconds
  useEffect(() => {
    const interval = setInterval(fetchComments, 4000);
    return () => clearInterval(interval);
  }, [documentId]);

  // 4. Send Question to Gemini Chat Route
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;

    const userQuery = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsGenerating(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${data.error || "Failed to process question."}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply || "No response generated." },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Network error while communicating with AI service.",
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. Submit New Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || postingComment) return;

    const textToPost = commentInput.trim();
    setCommentInput("");
    setPostingComment(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToPost }),
      });

      if (res.ok) {
        const savedComment = await res.json();
        setComments((prev) => [...prev, savedComment]);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to post comment.");
      }
    } catch (err) {
      alert("Error submitting comment.");
    } finally {
      setPostingComment(false);
    }
  };

  // 6. Copy Document Share URL
  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loadingDoc) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 500 }}>
          Loading document workspace...
        </p>
      </div>
    );
  }

  if (docError || !document) {
    return (
      <div style={styles.centerContainer}>
        <h2 style={{ fontSize: "20px", color: "#ef4444", marginBottom: "8px" }}>
          Document Unavailable
        </h2>
        <p style={{ color: "#64748b", marginBottom: "20px" }}>{docError}</p>
        <Link href="/dashboard" style={styles.primaryBtn}>
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const pdfStreamUrl = `/api/documents/${documentId}/file`;

  return (
    <div style={styles.pageWrapper}>
      {/* Top Navigation Bar */}
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={styles.backBtn}
            title="Back to Dashboard"
          >
            ← Dashboard
          </button>
          <div>
            <h1 style={styles.docTitle}>{document.title}</h1>
            <span style={styles.docBadge}>PDF Intelligence Workspace</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleCopyShareLink} style={styles.shareBtn}>
            {copiedLink ? "✓ Link Copied!" : "🔗 Share Document"}
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div style={styles.mainLayout}>
        {/* Left Side: PDF Stream Viewer */}
        <div style={styles.viewerContainer}>
          <iframe
            key={documentId}
            src={`${pdfStreamUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            title={document.title}
            style={styles.iframe}
          />
        </div>

        {/* Right Side: Interactive AI Assistant & Collaboration */}
        <div style={styles.sidebar}>
          {/* Navigation Tabs */}
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === "chat" ? "2px solid #2563eb" : "none",
                color: activeTab === "chat" ? "#2563eb" : "#64748b",
                fontWeight: activeTab === "chat" ? 600 : 500,
              }}
              onClick={() => setActiveTab("chat")}
            >
              💬 AI Q&A
            </button>
            <button
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === "comments" ? "2px solid #2563eb" : "none",
                color: activeTab === "comments" ? "#2563eb" : "#64748b",
                fontWeight: activeTab === "comments" ? 600 : 500,
              }}
              onClick={() => setActiveTab("comments")}
            >
              📝 Notes ({comments.length})
            </button>
            <button
              style={{
                ...styles.tabBtn,
                borderBottom: activeTab === "summary" ? "2px solid #2563eb" : "none",
                color: activeTab === "summary" ? "#2563eb" : "#64748b",
                fontWeight: activeTab === "summary" ? 600 : 500,
              }}
              onClick={() => setActiveTab("summary")}
            >
              📄 Summary
            </button>
          </div>

          {/* TAB 1: Chat Q&A */}
          {activeTab === "chat" && (
            <div style={styles.panelContent}>
              <div style={styles.chatScrollArea}>
                {messages.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={{ fontWeight: 600, color: "#334155" }}>
                      Ask questions about this PDF
                    </p>
                    <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                      Gemini is strictly grounded to this document and will refuse off-topic
                      queries.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        ...styles.chatBubble,
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        backgroundColor: msg.role === "user" ? "#2563eb" : "#f1f5f9",
                        color: msg.role === "user" ? "#ffffff" : "#1e293b",
                      }}
                    >
                      <p style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
                {isGenerating && (
                  <div style={styles.generatingIndicator}>
                    <span style={styles.pulseDot}></span>
                    Analyzing document and generating answer...
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} style={styles.inputForm}>
                <input
                  type="text"
                  placeholder="Ask any question about this document..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  style={styles.textInput}
                  disabled={isGenerating}
                />
                <button
                  type="submit"
                  disabled={isGenerating || !chatInput.trim()}
                  style={{
                    ...styles.submitBtn,
                    opacity: isGenerating || !chatInput.trim() ? 0.6 : 1,
                  }}
                >
                  Ask
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Notes & Comments */}
          {activeTab === "comments" && (
            <div style={styles.panelContent}>
              <div style={styles.chatScrollArea}>
                {comments.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={{ fontWeight: 600, color: "#334155" }}>No notes added yet</p>
                    <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                      Leave notes or team feedback synced directly with Supabase.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} style={styles.commentCard}>
                      <div style={styles.commentHeader}>
                        <span style={styles.authorBadge}>{comment.authorName}</span>
                        <span style={styles.commentTime}>
                          {new Date(comment.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p style={styles.commentText}>{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} style={styles.inputForm}>
                <input
                  type="text"
                  placeholder="Type a team note or feedback..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  style={styles.textInput}
                  disabled={postingComment}
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentInput.trim()}
                  style={{
                    ...styles.submitBtn,
                    opacity: postingComment || !commentInput.trim() ? 0.6 : 1,
                  }}
                >
                  Post
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Summary */}
          {activeTab === "summary" && (
            <div style={{ ...styles.panelContent, padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "12px" }}>
                Executive Summary
              </h3>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#475569", whiteSpace: "pre-wrap" }}>
                {document.summary || "No executive summary has been generated for this document."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Visual Inline Styles
const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  centerContainer: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  header: {
    height: "64px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    backgroundColor: "#f1f5f9",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#475569",
    cursor: "pointer",
  },
  docTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
    maxWidth: "400px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  docBadge: {
    fontSize: "11px",
    color: "#2563eb",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  shareBtn: {
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#1e293b",
    cursor: "pointer",
  },
  mainLayout: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  viewerContainer: {
    flex: "1 1 60%",
    backgroundColor: "#334155",
    padding: "16px",
    display: "flex",
  },
  iframe: {
    width: "100%",
    height: "100%",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ffffff",
  },
  sidebar: {
    flex: "0 0 420px",
    backgroundColor: "#ffffff",
    borderLeft: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  tabContainer: {
    display: "flex",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
  },
  tabBtn: {
    flex: 1,
    padding: "14px 0",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
  },
  panelContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatScrollArea: {
    flex: 1,
    padding: "16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  chatBubble: {
    maxWidth: "85%",
    padding: "10px 14px",
    borderRadius: "12px",
  },
  generatingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#64748b",
    fontStyle: "italic",
    padding: "6px 12px",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    backgroundColor: "#2563eb",
    borderRadius: "50%",
    display: "inline-block",
  },
  emptyState: {
    textAlign: "center",
    marginTop: "60px",
    padding: "0 20px",
  },
  inputForm: {
    display: "flex",
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
    gap: "8px",
  },
  textInput: {
    flex: 1,
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "13px",
    outline: "none",
  },
  submitBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "0 18px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  commentCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  authorBadge: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#1e293b",
  },
  commentTime: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  commentText: {
    fontSize: "13px",
    color: "#334155",
    margin: 0,
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: "10px 18px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
};