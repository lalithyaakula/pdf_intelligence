"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Mail, 
  Link as LinkIcon, 
  Check, 
  Bot, 
  MessageSquare, 
  Sparkles,
  Loader2
} from "lucide-react";

interface CommentItem {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export default function DocumentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  
  const unwrappedParams = typeof (params as any)?.then === "function" 
    ? use(params as Promise<{ id: string }>) 
    : (params as { id: string });
  const documentId = unwrappedParams.id;

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "comments">("chat");

  // Chat State (Persisted)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Comments State (Persisted)
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Share & Invite Modals
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDone, setInviteDone] = useState(false);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, generating]);

  // Fetch comments from DB
  const fetchComments = async () => {
    if (!documentId) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  // Fetch saved chat messages from DB
  const fetchChatHistory = async (docTitle: string) => {
    if (!documentId) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/chat`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setChatMessages(data);
        } else {
          setChatMessages([
            {
              id: "welcome",
              sender: "ai",
              text: `Hello! You are viewing **${docTitle}**. Ask any question to analyze this document with AI.`,
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  // Initial Document, Chat History, & Comments Loader
  useEffect(() => {
    async function loadDoc() {
      if (!documentId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const data = await res.json();
          setDocument(data);
          await fetchChatHistory(data.title);
        }
        await fetchComments();
      } catch (err) {
        console.error("Error loading document:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDoc();
  }, [documentId]);

  // Real-time Live Polling for Comments (every 3s)
  useEffect(() => {
    if (!documentId) return;
    const interval = setInterval(() => {
      fetchComments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || generating) return;

    const userText = inputQuery.trim();
    setInputQuery("");

    // Append user message immediately
    const tempUserMsgId = Date.now().toString();
    setChatMessages((prev) => [
      ...prev,
      { id: tempUserMsgId, sender: "user", text: userText },
    ]);

    setGenerating(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: data.id || (Date.now() + 1).toString(),
            sender: "ai",
            text: data.reply,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: `⚠️ Error: ${data.error || "Failed to generate AI response."}`,
          },
        ]);
      }
    } catch (err: any) {
      console.error("Chat client error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `⚠️ Network error: Could not reach the chat endpoint.`,
        },
      ]);
    } finally {
      setGenerating(false);
    }
  };

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
      console.error("Error posting comment:", err);
      alert("Network error while submitting comment.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <Loader2 className="animate-spin" style={{ width: "36px", height: "36px", color: "#2563eb" }} />
      </div>
    );
  }

  const pdfUrl = document?.filePath ? document.filePath : `/api/documents/${documentId}/file`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Top Navbar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              fontSize: "14px",
              fontWeight: 500,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <ArrowLeft style={{ width: "16px", height: "16px" }} />
            Dashboard
          </button>
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
            {document?.title || "Document Workspace"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => {
              setShowInviteModal(true);
              setInviteDone(false);
              setInviteEmail("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Mail style={{ width: "14px", height: "14px", color: "#c084fc" }} />
            Email Invite
          </button>

          <button
            onClick={handleCopyShareLink}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
              cursor: "pointer",
            }}
          >
            {copiedLink ? (
              <>
                <Check style={{ width: "14px", height: "14px" }} />
                Copied!
              </>
            ) : (
              <>
                <LinkIcon style={{ width: "14px", height: "14px" }} />
                Share Link
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Column: AI Executive Summary & PDF Preview */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            overflow: "hidden",
          }}
        >
          {/* Executive Summary Top Box */}
          <div style={{ padding: "16px 20px 8px 20px" }}>
            <div
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "14px",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Sparkles style={{ width: "16px", height: "16px", color: "#f59e0b" }} />
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#1e40af", letterSpacing: "0.5px" }}>
                  AI EXECUTIVE SUMMARY
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#1e3a8a",
                }}
              >
                {document?.summary ||
                  "This document has been indexed into PDF Intelligence. Core takeaways, key concepts, and architectural definitions are ready for interactive AI analysis and collaboration."}
              </p>
            </div>
          </div>

          {/* Embedded PDF Viewer */}
          <div style={{ flex: 1, padding: "12px 20px 20px 20px" }}>
            <iframe
              key={document?.id}
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={document?.title || "PDF Document Viewer"}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "12px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#525659",
              }}
            />
          </div>
        </div>

        {/* Right Column: PDF Chat & Comments Tabs */}
        <div
          style={{
            width: "480px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Tab Selection */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "14px",
                fontSize: "14px",
                fontWeight: activeTab === "chat" ? 700 : 500,
                color: activeTab === "chat" ? "#2563eb" : "#64748b",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottomWidth: "2px",
                borderBottomStyle: "solid",
                borderBottomColor: activeTab === "chat" ? "#2563eb" : "transparent",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <Bot style={{ width: "16px", height: "16px" }} />
              PDF Chat
            </button>

            <button
              onClick={() => setActiveTab("comments")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "14px",
                fontSize: "14px",
                fontWeight: activeTab === "comments" ? 700 : 500,
                color: activeTab === "comments" ? "#2563eb" : "#64748b",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottomWidth: "2px",
                borderBottomStyle: "solid",
                borderBottomColor: activeTab === "comments" ? "#2563eb" : "transparent",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <MessageSquare style={{ width: "16px", height: "16px" }} />
              Comments ({comments.length})
            </button>
          </div>

          {/* Tab 1: AI Chat */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {chatMessages.map((msg, index) => {
                  const isLastMessage = index === chatMessages.length - 1;
                  const isUserAndGenerating = isLastMessage && msg.sender === "user" && generating;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      {msg.sender === "user" ? (
                        <>
                          <div
                            style={{
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              padding: "10px 16px",
                              borderRadius: "14px 14px 2px 14px",
                              fontSize: "14px",
                              maxWidth: "85%",
                            }}
                          >
                            {msg.text}
                          </div>
                          
                          {/* Inline "generating..." label below user's query */}
                          {isUserAndGenerating && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                marginTop: "6px",
                                paddingRight: "4px",
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "#64748b",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: "#2563eb",
                                  display: "inline-block",
                                  animation: "pulse 1.4s infinite ease-in-out",
                                }}
                              />
                              <span>generating answer...</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            backgroundColor: "#f1f5f9",
                            borderRadius: "14px",
                            padding: "16px",
                            fontSize: "13px",
                            lineHeight: "1.6",
                            color: "#1e293b",
                            maxWidth: "95%",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "16px",
                  borderTop: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                <input
                  type="text"
                  placeholder="Ask a question about this document..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={generating || !inputQuery.trim()}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "13px",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: "none",
                    cursor: generating || !inputQuery.trim() ? "not-allowed" : "pointer",
                    opacity: generating || !inputQuery.trim() ? 0.7 : 1,
                  }}
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Comments (Live Shared via Link) */}
          {activeTab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", marginTop: "24px" }}>
                    No comments yet. Start a discussion below.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "14px",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>{c.authorName}</strong>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#334155" }}>{c.text}</p>
                      <button
                        type="button"
                        style={{
                          background: "transparent",
                          borderTop: "none",
                          borderLeft: "none",
                          borderRight: "none",
                          borderBottom: "none",
                          fontSize: "12px",
                          color: "#2563eb",
                          fontWeight: "600",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        ↩ Reply
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form
                onSubmit={handlePostComment}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "16px",
                  borderTop: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentInput.trim()}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "13px",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: "none",
                    cursor: postingComment ? "not-allowed" : "pointer",
                  }}
                >
                  {postingComment ? "Posting..." : "Post"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
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
              maxWidth: "420px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
              Invite to Document
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#64748b" }}>
              Send an email invite to collaborate on <strong>{document?.title}</strong>.
            </p>

            {inviteDone ? (
              <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: "13px", marginBottom: "16px" }}>
                Invite sent successfully!
              </div>
            ) : (
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
                  marginBottom: "16px",
                  outline: "none",
                }}
              />
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Close
              </button>
              {!inviteDone && (
                <button
                  onClick={() => {
                    if (inviteEmail.trim()) setInviteDone(true);
                  }}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: "600",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Send Invite
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}