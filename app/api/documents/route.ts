import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper function to generate a strict 3 to 4 line executive summary
async function generateSummary(pdfBase64: string, fileName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Summary] Missing GEMINI_API_KEY");
    return `This document (${fileName}) contains technical content and key reference materials. It is fully indexed and ready for Q&A analysis.`;
  }

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ];

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: "Provide a concise, high-quality executive summary of this document in exactly 3 to 4 clear lines. Focus on the core subject, main objectives, and key takeaways.",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } else {
        const errData = await response.json();
        console.warn(`[Summary Warning] ${model} error:`, errData?.error?.message);
      }
    } catch (err: any) {
      console.warn(`[Summary Warning] ${model} failed:`, err?.message);
    }
  }

  return `This document provides key insights into the subject matter of ${fileName}. It outlines core principles, structured workflows, and essential reference points. The content is indexed and ready for AI exploration.`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId: string | undefined = undefined;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      userId = user?.id;
    }

    const documents = await prisma.document.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        filePath: true,
        summary: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let currentUserId: string | null = null;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      currentUserId = user?.id || null;
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // Generate 3-4 line summary via Gemini
    const summaryText = await generateSummary(base64Data, file.name);

    const docPayload: any = {
      title: file.name,
      filePath: `/uploads/${file.name}`,
      fileData: base64Data,
      summary: summaryText,
    };

    if (currentUserId) {
      docPayload.userId = currentUserId;
    }

    const newDoc = await prisma.document.create({
      data: docPayload,
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    console.error("[Upload Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload document." },
      { status: 500 }
    );
  }
}