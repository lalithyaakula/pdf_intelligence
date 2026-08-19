import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 1. Resolve document ID or shareToken from route parameters
    const rawParams = await context.params;
    const urlParts = req.nextUrl.pathname.split("/").filter(Boolean);
    const idOrToken = rawParams?.id || urlParts[urlParts.length - 2];

    if (!idOrToken) {
      return NextResponse.json({ error: "Missing document identifier." }, { status: 400 });
    }

    // 2. Parse incoming user query
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const message = body?.message;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
    }

    // 3. Find document and fetch past 6 message turns for conversational memory
    const document = await prisma.document.findFirst({
      where: {
        OR: [{ id: idOrToken }, { shareToken: idOrToken }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 6, // Maintains at least last 3-5 conversational turns
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // 4. Persist the user's incoming question
    await prisma.message.create({
      data: {
        role: "user",
        content: message.trim(),
        documentId: document.id,
      },
    });

    // 5. Long Document Strategy: Normalized 30,000-character context window
    const contextText = document.extractedText?.trim()
      ? document.extractedText.slice(0, 30000)
      : `Document title: ${document.filename}. Note: Minimal selectable text in source PDF.`;

    // 6. Chronological conversation history assembly
    const pastTurns = (document.messages || [])
      .reverse()
      .map((m) => `${m.role === "model" ? "AI Assistant" : "User"}: ${m.content}`)
      .join("\n\n");

    // 7. Grounded system prompt design
    const prompt = `You are DocMind AI, an intelligent technical document assistant designed to analyze and explain documents accurately.

CORE DIRECTIVES:
1. Grounded & Factual: Answer the user's question directly and accurately based on the DOCUMENT CONTEXT provided below.
2. Conversational Continuity: Use the RECENT CONVERSATION HISTORY to resolve pronouns and follow-up queries naturally.
3. Clean Formatting: Structure your response with concise paragraphs, clear bullet points, and bold terms for high scannability.
4. Scope Awareness: If a query cannot be answered using the provided context, state clearly what the document covers and provide a concise, helpful response.

---
DOCUMENT CONTEXT:
${contextText}

---
RECENT CONVERSATION HISTORY:
${pastTurns || "No previous turns."}

---
CURRENT USER QUESTION:
${message.trim()}

ANSWER:`;

    let reply = "I could not generate an answer at this moment.";

    if (!process.env.GEMINI_API_KEY) {
      reply = "⚠️ GEMINI_API_KEY is missing in your server environment.";
    } else {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });
        reply = response.text || reply;
      } catch (err1: any) {
        console.warn("Primary chat model error, switching to fallback:", err1?.message);
        try {
          const fallback = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
          });
          reply = fallback.text || reply;
        } catch (err2: any) {
          console.error("All Gemini chat endpoints failed:", err2);
          reply = `⚠️ AI Service Error: ${err2?.message || "Service temporarily unavailable."}`;
        }
      }
    }

    // 8. Persist AI assistant answer
    await prisma.message.create({
      data: {
        role: "model",
        content: reply,
        documentId: document.id,
      },
    });

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error: any) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}