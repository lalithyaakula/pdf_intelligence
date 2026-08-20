import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Active candidate models supported on v1beta REST
const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-pro",
];

async function callGeminiRest(
  modelName: string,
  apiKey: string,
  systemInstruction: string,
  userText: string,
  pdfBase64: string | null
) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const parts: any[] = [];

  // Pass PDF binary as inline_data if available
  if (pdfBase64) {
    parts.push({
      inline_data: {
        mime_type: "application/pdf",
        data: pdfBase64,
      },
    });
  }

  // Pass user text query
  parts.push({ text: userText });

  const payload: any = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.1, // Strict low temperature to prevent hallucination
      maxOutputTokens: 2500,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `HTTP ${response.status} from Gemini API`);
  }

  const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return generatedText || null;
}

// GET endpoint to satisfy Next.js page initialization and avoid 405 Method Not Allowed
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json([], { status: 200 });
}

// POST endpoint for interactive Q&A
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    const body = await req.json();
    const message = body?.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not defined in your .env file." },
        { status: 500 }
      );
    }

    // 1. Fetch document record from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // 2. Read physical PDF buffer from disk if stored locally
    const cleanRelative = document.filePath.replace(/^[/\\]+/, "");
    const diskPath = path.join(process.cwd(), "public", cleanRelative);

    let pdfBase64: string | null = null;
    if (fs.existsSync(diskPath)) {
      try {
        const fileBuffer = fs.readFileSync(diskPath);
        if (fileBuffer.length < 20 * 1024 * 1024) {
          pdfBase64 = fileBuffer.toString("base64");
        }
      } catch (err) {
        console.warn("[Chat API] Could not read local PDF file from disk:", err);
      }
    }

    // 3. Strict Boundary System Prompt
    const systemInstruction = `You are a strict, context-bound AI document assistant dedicated EXCLUSIVELY to the attached document titled "${document.title}".

CRITICAL BOUNDARY INSTRUCTIONS:
1. CHECK RELEVANCE FIRST: Verify if the user query is directly discussed or answered in the provided document.
2. STRICT REFUSAL FOR OUT-OF-DOCUMENT QUERIES: If the user asks general knowledge questions, algorithms, trivia, or anything not explicitly contained in this document, DO NOT answer from your general knowledge.
   Instead, respond strictly with:
   "⚠️ **Out of Scope**: This query cannot be answered because it is not mentioned or discussed in **${document.title}**. Please ask questions related to this document."
3. ACCURACY: When the query IS present in the document, provide structured, precise bullet points and direct facts.`;

    const userPrompt = `Document Context: "${document.title}"
Executive Summary Context: ${document.summary || "N/A"}

User Question: ${message}

Provide an answer strictly following your boundary instructions.`;

    let replyText: string | null = null;
    let lastError: any = null;

    // 4. Sequential fallback across models
    for (const modelName of CANDIDATE_MODELS) {
      try {
        replyText = await callGeminiRest(
          modelName,
          apiKey,
          systemInstruction,
          userPrompt,
          pdfBase64
        );

        if (replyText) break;
      } catch (err: any) {
        // Fallback: Retry with text context if binary PDF payload fails
        try {
          replyText = await callGeminiRest(
            modelName,
            apiKey,
            systemInstruction,
            userPrompt,
            null
          );
          if (replyText) break;
        } catch (textErr: any) {
          lastError = textErr;
        }
      }
    }

    if (!replyText) {
      return NextResponse.json(
        { error: lastError?.message || "All Gemini models returned an error." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply: replyText }, { status: 200 });
  } catch (error: any) {
    console.error("[Chat API Fatal]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process chat query." },
      { status: 500 }
    );
  }
}