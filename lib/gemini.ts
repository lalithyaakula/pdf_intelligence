import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  // Don't throw at import time (would crash the whole app / build) — just warn loudly.
  console.error(
    "[gemini] GEMINI_API_KEY is not set. Add it to your .env / .env.local file."
  );
}

const ai = new GoogleGenAI({ apiKey });

// Current, actively supported Gemini model (released July 2026).
// NOTE: "gemini-1.5-flash" is fully retired (404s). "gemini-2.5-flash" still
// works but Google has scheduled it to shut down Oct 16, 2026 — don't rely on it.
export const MODEL_NAME = "gemini-3.6-flash";

const MIN_TEXT_LENGTH = 50;

/**
 * Resolves a stored filePath (e.g. "/uploads/foo.pdf" or "uploads/foo.pdf")
 * to an absolute path inside the `public` folder on disk.
 */
function resolvePdfPath(filePath: string): string {
  const relative = filePath.replace(/^[/\\]+/, "");
  return path.join(process.cwd(), "public", relative);
}

function readPdfAsInlinePart(filePath: string) {
  const absolutePath = resolvePdfPath(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`PDF not found on disk at ${absolutePath}`);
  }

  const base64Data = fs.readFileSync(absolutePath).toString("base64");

  return {
    inlineData: {
      mimeType: "application/pdf",
      data: base64Data,
    },
  };
}

/**
 * Generates a summary for a document.
 *
 * If `extractedText` already has enough content, we summarize the text directly
 * (cheaper/faster, no need to re-send the whole PDF). Otherwise — e.g. a scanned
 * / image-based PDF where OCR extraction produced little or no text — we fall
 * back to sending the raw PDF bytes to Gemini so it can read the document itself.
 */
export async function generatePDFSummary(
  extractedText: string,
  filePath?: string
): Promise<string> {
  try {
    const hasUsableText =
      typeof extractedText === "string" &&
      extractedText.trim().length >= MIN_TEXT_LENGTH;

    const instruction =
      "You are summarizing a document for a user. Write a concise, well-structured " +
      "summary (3-6 sentences, or a short bulleted list) covering the main topic, key " +
      "points, and any important numbers, dates, or conclusions. Base the summary only " +
      "on the actual content provided.";

    let contents;

    if (hasUsableText) {
      contents = [
        { text: `${instruction}\n\nDocument text:\n"""\n${extractedText}\n"""` },
      ];
    } else if (filePath) {
      // Short/empty extracted text -> likely a scanned/image PDF. Send raw bytes
      // so Gemini can read (and effectively OCR) the document directly.
      const pdfPart = readPdfAsInlinePart(filePath);
      contents = [{ text: instruction }, pdfPart];
    } else {
      throw new Error(
        "No usable extracted text and no filePath was provided to fall back on."
      );
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
    });

    const summary = response.text?.trim();

    if (!summary) {
      throw new Error("Empty response from Gemini when generating summary.");
    }

    return summary;
  } catch (error) {
    console.error("[gemini] generatePDFSummary failed:", error);
    throw new Error(
      `Failed to generate summary: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Answers a question about a PDF document by sending the raw PDF bytes to Gemini
 * (so it works for scanned/image-based PDFs too, not just ones with clean extracted
 * text) along with recent chat history for conversational context.
 */
export async function askPDFQuestion(
  filePath: string,
  history: Array<{ role: string; content: string }>,
  question: string
): Promise<string> {
  try {
    if (!filePath) {
      throw new Error("askPDFQuestion called without a filePath.");
    }

    const pdfPart = readPdfAsInlinePart(filePath);

    const historyText = (history || [])
      .map((m) => {
        const role =
          m.role === "assistant" || m.role === "ai" ? "Assistant" : "User";
        return `${role}: ${m.content}`;
      })
      .join("\n");

    const promptText =
      "You are answering questions about the attached PDF document. Base your " +
      "answer only on the document's contents. If the answer isn't in the document, " +
      "say so clearly instead of guessing.\n\n" +
      (historyText ? `Conversation so far:\n${historyText}\n\n` : "") +
      `Question: ${question}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [pdfPart, { text: promptText }],
    });

    const answer = response.text?.trim();

    if (!answer) {
      throw new Error("Empty response from Gemini when answering question.");
    }

    return answer;
  } catch (error) {
    console.error("[gemini] askPDFQuestion failed:", error);
    throw new Error(
      `Failed to answer question: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
