"use client";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface CommentReply {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
}

interface CommentItem extends CommentReply {
  replies?: CommentReply[];
}

interface MessageItem {
  id?: string;
  role: "user" | "model";
  content: string;
}

interface DocData {
  id: string;
  title: string;
  filename: string;
  filePath: string;
  summary: string | null;
  shareToken: string;
  comments: CommentItem[];
  messages: MessageItem[];
}

/**
 * Parses markdown formatting in AI replies (strips raw asterisks, renders bold/lists)
 */
function ChatMessageRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
  }

  const lines = content.split("\n");

  const parseInline = (text: string) => {
    // Splits on bold-italic, bold, italic, or inline code
    const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return parts.map((part, idx) => {
      if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
        return (
          <strong key={idx} style={{ fontWeight: 700, fontStyle: "italic", color: "#0f172a" }}>
            {part.slice(3, -3)}
          </strong>
        );
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={idx} style={{ fontWeight: 700, color: "#0f172a" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return (
          <em key={idx} style={{ fontStyle: "italic", color: "#334155" }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={idx}
            style={{
              backgroundColor: "#e2e8f0",
              color: "#0f172a",
              padding: "1px 4px",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Handle Bullet Points
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const bulletText = trimmed.slice(2);
          return (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginLeft: "4px" }}>
              <span style={{ color: "#2563eb", fontWeight: "bold" }}>•</span>
              <div style={{ flex: 1 }}>{parseInline(bulletText)}</div>
            </div>
          );
        }

        // Handle Headings (### Title)
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const headingText = trimmed.replace(/^#+\s*/, "");
          return (
            <div key={idx} style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a", marginTop: "6px", marginBottom: "2px" }}>
              {parseInline(headingText)}
            </div>
          );
        }

        // Blank lines
        if (trimmed === "") {
          return <div key={idx} style={{ height: "4px" }} />;
        }

        return (
          <div key={idx} style={{ margin: "1px 0" }}>
            {parseInline(line)}
          </div>
        );
      })}
    </div>
  );
}

export default function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: session } = useSession();

  const [document, setDocument] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "comments">("chat");

  // Chat State
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Share & Email Invite State
  const [copied, setCopied] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    async function loadDocument() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/documents/${id}`);
        const rawText = await res.text();

        let data: any = {};
        if (rawText && rawText.trim().length > 0) {
          try {
            data = JSON.parse(rawText);
          } catch {
            throw new Error("Invalid response format received from server.");
          }
        }

        if (!res.ok || !data.document) {
          throw new Error(data.error || `Failed to load document (${res.status})`);
        }

        setDocument(data.document);
        setMessages(data.document.messages || []);
        setComments(data.document.comments || []);
      } catch (err: any) {
        setError(err.message || "Failed to load document data.");
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [id]);

  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleCopyLink = () => {
    if (!document) return;
    const shareUrl = `${window.location.origin}/documents/${document.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || sendingEmail) return;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch(`/api/documents/${id}/share-email`, {
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
        throw new Error(data.error || "Failed to send invitation.");
      }

      setEmailStatus({ type: "success", text: data.message || "Invitation sent successfully!" });
      setInviteEmail("");
      setInviteNote("");
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus(null);
      }, 2000);
    } catch (err: any) {
      setEmailStatus({ type: "error", text: err.message || "Failed to send email." });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userText = chatInput.trim();
    setChatInput("");

    const updatedMessages: MessageItem[] = [...messages, { role: "user", content: userText }];
    setMessages(updatedMessages);
    setSendingChat(true);

    try {
      const res = await fetch(`/api/documents/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Server returned non-JSON response.");
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to get answer.`);
      }

      setMessages([...updatedMessages, { role: "model", content: data.reply || "No response received." }]);
    } catch (err: any) {
      setMessages([...updatedMessages, { role: "model", content: `⚠️ ${err.message}` }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const textToPost = parentId ? replyInput.trim() : commentInput.trim();
    if (!textToPost || submittingComment) return;

    setSubmittingComment(true);
    const commenter = session?.user?.name || authorName.trim() || "Guest Reviewer";

    try {
      const res = await fetch(`/api/documents/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: commenter,
          content: textToPost,
          parentId: parentId || null,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("Failed to parse server response.");
        }
      }

      if (!res.ok || !data.comment) {
        throw new Error(data.error || "Failed to post comment.");
      }

      if (parentId) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), data.comment] };
            }
            return c;
          })
        );
        setReplyInput("");
        setReplyingToId(null);
      } else {
        setComments([{ ...data.comment, replies: [] }, ...comments]);
        setCommentInput("");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", color: "#64748b" }}>
        Loading document workspace...
      </div>
    );
  }

  if (error || !document) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <p style={{ color: "#dc2626", fontWeight: "600", marginBottom: "12px" }}>{error || "Document not found"}</p>
        <Link href="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#ffffff" }}>
      {/* Top Header */}
      <header style={{ height: "56px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/dashboard" style={{ color: "#475569", fontSize: "14px", textDecoration: "none", fontWeight: "500" }}>
            ← Dashboard
          </Link>
          <span style={{ fontWeight: "600", fontSize: "15px", color: "#0f172a" }}>
            {document.filename}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setShowEmailModal(true)}
            style={{
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "7px 12px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            ✉️ Email Invite
          </button>

          <button
            onClick={handleCopyLink}
            style={{
              backgroundColor: copied ? "#16a34a" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "7px 14px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied Link" : "🔗 Share Link"}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Side: Summary + PDF Viewer */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: "1px solid #e2e8f0", padding: "16px", backgroundColor: "#f8fafc" }}>
          <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 14px", borderRadius: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#1d4ed8", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>
              ✨ AI Executive Summary
            </span>
            <p style={{ fontSize: "13px", color: "#1e3a8a", lineHeight: "1.5", margin: 0 }}>
              {document.summary || "Summary unavailable."}
            </p>
          </div>

          <div style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden", backgroundColor: "#ffffff" }}>
            <iframe
              src={document.filePath}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="PDF Viewer"
            />
          </div>
        </div>

        {/* Right Side: Tabbed Interface */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
            <button
              onClick={() => setActiveTab("chat")}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: activeTab === "chat" ? "#2563eb" : "#64748b",
                borderBottom: activeTab === "chat" ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              🤖 PDF Chat
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: activeTab === "comments" ? "#2563eb" : "#64748b",
                borderBottom: activeTab === "comments" ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              💬 Comments ({comments.length})
            </button>
          </div>

          {/* AI Chat Tab (Renders Clean Markdown Without Asterisks) */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 105px)" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", marginTop: "40px" }}>
                    Ask any question about this PDF. Multi-turn follow-ups are supported.
                  </p>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        lineHeight: "1.55",
                        backgroundColor: m.role === "user" ? "#2563eb" : "#f1f5f9",
                        color: m.role === "user" ? "#ffffff" : "#1e293b",
                      }}
                    >
                      <ChatMessageRenderer content={m.content} isUser={m.role === "user"} />
                    </div>
                  ))
                )}
                {sendingChat && (
                  <div style={{ alignSelf: "flex-start", fontSize: "12px", color: "#64748b" }}>
                    Generating grounded answer...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} style={{ display: "flex", padding: "12px", borderTop: "1px solid #e2e8f0", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Ask a question about this document..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={sendingChat || !chatInput.trim()}
                  style={{ backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: sendingChat ? 0.7 : 1 }}
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 105px)" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {comments.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", marginTop: "40px" }}>
                    No comments yet. Leave a note below.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <strong style={{ fontSize: "13px", color: "#0f172a" }}>{c.authorName}</strong>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>
                        {c.content}
                      </p>

                      <div style={{ marginTop: "8px" }}>
                        <button
                          onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                          style={{ fontSize: "11px", fontWeight: "600", color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          {replyingToId === c.id ? "Cancel Reply" : "↩ Reply"}
                        </button>
                      </div>

                      {c.replies && c.replies.length > 0 && (
                        <div style={{ marginTop: "10px", paddingLeft: "12px", borderLeft: "2px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {c.replies.map((reply) => (
                            <div key={reply.id} style={{ backgroundColor: "#ffffff", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                <strong style={{ fontSize: "12px", color: "#334155" }}>{reply.authorName}</strong>
                                <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                                  {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p style={{ fontSize: "12px", color: "#334155", lineHeight: "1.4", margin: 0, whiteSpace: "pre-wrap" }}>
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingToId === c.id && (
                        <form onSubmit={(e) => handlePostComment(e, c.id)} style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            style={{ flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "12px", outline: "none" }}
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={submittingComment || !replyInput.trim()}
                            style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}
                          >
                            Reply
                          </button>
                        </form>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={(e) => handlePostComment(e)} style={{ padding: "12px", borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
                {!session?.user && (
                  <input
                    type="text"
                    placeholder="Your Name (optional for guests)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "12px", marginBottom: "8px", boxSizing: "border-box", outline: "none" }}
                  />
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <textarea
                    rows={2}
                    placeholder="Add a comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none", resize: "none", fontFamily: "inherit" }}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentInput.trim()}
                    style={{ backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0 18px", fontSize: "13px", fontWeight: "600", cursor: "pointer", opacity: submittingComment ? 0.7 : 1 }}
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Email Invite Modal Overlay */}
      {showEmailModal && (
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
          onClick={() => setShowEmailModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              padding: "24px",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                ✉️ Send Email Invitation
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
              Invite colleagues to collaborate on <strong>{document.filename}</strong>.
            </p>

            {emailStatus && (
              <div
                style={{
                  backgroundColor: emailStatus.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: emailStatus.type === "success" ? "#15803d" : "#b91c1c",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {emailStatus.text}
              </div>
            )}

            <form onSubmit={handleSendEmailInvite} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Invitee Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Personal Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please review section 3 and leave your feedback."
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
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