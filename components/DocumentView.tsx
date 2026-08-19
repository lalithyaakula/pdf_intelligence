"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, MessageSquare, Bot, ArrowLeft, Loader2 } from "lucide-react";

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
}

export interface DocumentData {
  id: string;
  filename: string;
  fileUrl: string;
  summary: string;
  comments: Comment[];
  messages: Message[];
}

export default function DocumentView({
  doc,
  isGuest = false,
}: {
  doc: DocumentData;
  isGuest?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "comments">("chat");
  const [messages, setMessages] = useState<Message[]>(doc.messages || []);
  const [comments, setComments] = useState<Comment[]>(doc.comments || []);
  const [question, setQuestion] = useState("");
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || chatLoading) return;

    const userQ = question;
    setQuestion("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userQ }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/documents/${doc.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userQ }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "model", content: data.reply },
        ]);
      }
    } catch {
      alert("Failed to get AI response");
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          guestName: isGuest ? guestName || "Guest Collaborator" : undefined,
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
      }
    } catch {
      alert("Failed to post comment");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isGuest && (
            <Link href="/dashboard" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="font-semibold text-slate-800 text-sm md:text-base">{doc.filename}</h1>
            <span className="text-xs text-slate-500">{isGuest ? "Guest Collaborator Access" : "Document Owner"}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 border-r border-slate-200 bg-slate-200 p-2 flex flex-col">
          <iframe
            src={`${doc.fileUrl}#toolbar=1`}
            className="w-full h-full rounded-lg bg-white shadow-inner"
            title={doc.filename}
          />
        </div>

        <div className="w-full md:w-[480px] bg-white flex flex-col h-full shadow-lg">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">AI Executive Summary</h4>
            <p className="text-xs text-blue-950 leading-relaxed max-h-24 overflow-y-auto">{doc.summary}</p>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeTab === "chat"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Bot className="w-4 h-4" /> AI Document Chat
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeTab === "comments"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Comments ({comments.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "chat" ? (
              <>
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Ask any question about this document. Grounded answers provided by Gemini.
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-1 capitalize">{m.role === "user" ? "You" : "Gemini AI"}</span>
                      <div
                        className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                          m.role === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Thinking...
                  </div>
                )}
              </>
            ) : (
              <>
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No comments yet. Start the discussion below.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">{c.authorName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{c.content}</p>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            {activeTab === "chat" ? (
              <form onSubmit={handleSendQuestion} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about this document..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !question.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddComment} className="space-y-2">
                {isGuest && (
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Post
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}