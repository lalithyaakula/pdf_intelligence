import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import PDFParser from "pdf2json";
import { GoogleGenAI } from "@google/genai";

// Initialize Google Gemini SDK with the server-side API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

/**
 * Helper function to extract plain text from an in-memory PDF Buffer using pdf2json.
 * Resolves with raw text content or an empty string on parsing issues.
 */
function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    // Instantiate PDFParser (null context, 1 = raw text extraction mode)
    const pdfParser = new (PDFParser as any)(null, 1);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.warn("PDF parse error encountered:", errData?.parserError);
      resolve("");
    });

    pdfParser.on("pdfParser_dataReady", () => {
      try {
        const rawText = (pdfParser as any).getRawTextContent();
        resolve(rawText || "");
      } catch {
        resolve("");
      }
    });

    // Feed buffer into the parser
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User record not found." }, { status: 404 });
    }

    // 2. Read multipart form data and validate file format
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided in request." }, { status: 400 });
    }

    // Reject non-PDF files
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    // 3. Convert uploaded file to Node Buffer and persist to public/uploads
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Sanitize filename and create unique timestamped path
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/${uniqueFilename}`;

    // 4. Extract text from PDF buffer
    const extractedText = await extractTextFromPDFBuffer(buffer);

    // 5. Generate AI Executive Summary using Gemini
    let summary = "Summary unavailable.";
    if (process.env.GEMINI_API_KEY) {
      // Limit prompt context size to avoid token limit overflow
      const textToSummarize = extractedText.trim()
        ? extractedText.slice(0, 30000)
        : `Document filename: ${file.name}. Note: Scanned or minimal selectable text.`;

      const prompt = `You are an expert document summarizer. Provide a concise, clear, and informative 3 to 5 sentence executive summary of the key concepts in this document. Do not use generic filler phrases like "this document is about".\n\nDOCUMENT TEXT:\n${textToSummarize}`;

      try {
        // Primary fast model
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });
        summary = response.text || summary;
      } catch (err1: any) {
        console.warn("Primary summary model busy/failed, attempting fallback:", err1?.message);
        try {
          // Automated fallback model
          const fallback = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
          });
          summary = fallback.text || summary;
        } catch (err2: any) {
          console.error("All AI summary attempts failed:", err2);
          summary = "AI Summary generation temporarily unavailable.";
        }
      }
    }

    // 6. Save document record to database (generates unique shareToken automatically)
    const document = await prisma.document.create({
      data: {
        title: file.name,
        filename: file.name,
        filePath: publicPath,
        extractedText: extractedText.slice(0, 60000),
        summary: summary,
        userId: user.id,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process document upload." },
      { status: 500 }
    );
  }
}