"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, FileText, Send, User } from "lucide-react";

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
  messages: Message[];
}

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (!res.ok) throw new Error("Failed to load document");
        const data = await res.json();
        setDocument(data);
        setMessages(data.messages || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocument();
  }, [documentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const optimisticMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) throw new Error("Failed to generate response");
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
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
        Loading document workspace...
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 text-gray-800">
        <p className="text-lg font-medium">Document not found</p>
        <Link
          href="/dashboard"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top Navbar */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-sm">
            {document.title || document.filename || "Untitled Document"}
          </span>
        </div>
      </header>

      {/* Main Split-View Workspace */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Left Side: Summary & PDF Document Viewer */}
        <div className="flex flex-col gap-4 overflow-y-auto border-r border-gray-200 p-6">
          {/* AI Executive Summary Card */}
          {document.summary && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800">
                <span>✨ AI EXECUTIVE SUMMARY</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">
                {document.summary}
              </p>
            </div>
          )}

          {/* PDF Viewer Container */}
          <div className="relative min-h-[550px] flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-900 shadow-sm">
            <iframe
              src={`/api/documents/${document.id}/file`}
              className="h-full w-full border-0"
              title="PDF Viewer"
            />
          </div>
        </div>

        {/* Right Side: Interactive AI Chatbot */}
        <div className="flex flex-col bg-white">
          {/* Chat Header */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <Bot className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-800">
              Document Assistant
            </h3>
          </div>

          {/* Messages Area */}
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
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-100 bg-gray-50 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-gray-100 p-4"
          >
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