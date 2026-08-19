"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, FileText, Send, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface DocumentData {
  id: string;
  title: string;
  filename: string | null;
  summary: string | null;
  extractedText: string | null;
  messages?: Message[];
}

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (!res.ok) throw new Error("Document not found");
        const data = await res.json();
        setDoc(data);
        setMessages(data.messages || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDoc();
  }, [documentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userText },
    ]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: data.id || (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply || data.content,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I ran into an issue answering your question. Please try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-gray-600 font-medium">
        Loading document...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-50 text-gray-800">
        <p className="text-xl font-semibold">Document not found in database</p>
        <p className="text-sm text-gray-500">This document may have been deleted or created before the database sync.</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700"
        >
          Return to Dashboard & Upload Again
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-100">
      {/* Top Navbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-md">
            {doc.title || doc.filename || "Document Workspace"}
          </span>
        </div>
      </header>

      {/* Split Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Summary + PDF Viewer */}
        <div className="flex w-1/2 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-gray-50 p-6">
          {doc.summary && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>AI Executive Summary</span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-gray-700">
                {doc.summary}
              </p>
            </div>
          )}

          <div className="min-h-[500px] flex-1 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
            <iframe
              src={`/api/documents/${doc.id}/file`}
              className="h-full w-full border-0"
              title="PDF Viewer"
            />
          </div>
        </div>

        {/* Right Side: Chat Bot */}
        <div className="flex w-1/2 flex-col bg-white">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
            <Bot className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-800">
              Document Assistant
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                <FileText className="h-10 w-10 stroke-1 text-gray-300" />
                <p className="mt-2 text-sm">Ask any question regarding this document.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-100 bg-gray-50 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.role === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isSending && (
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500">
                  Analyzing document...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask any question about this document..."
                className="flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                className="rounded-md bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}