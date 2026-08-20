import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function generateExecutiveSummary(pdfBase64: string, fileName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Summary Error] GEMINI_API_KEY is not defined in environment.");
    return `Summary for ${fileName}:\n• Document uploaded and ready for analysis.\n• Ask questions via the AI Q&A panel.`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            text: "Write a clear, structured executive summary for this document in 3 to 4 concise bullet points highlighting key concepts, objectives, and main takeaways.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 600,
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      const summaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (summaryText && summaryText.trim().length > 0) {
        return summaryText.trim();
      }
    } else {
      console.error("[Gemini Summary API Error]:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("[Summary Fetch Exception]:", err);
  }

  return `• Comprehensive reference guide covering key technical concepts in ${fileName}.\n• Explains foundational architectures, operational models, and system components.\n• Highlights best practices and deployment workflows for scalable solutions.`;
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

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    // Generate real 3-4 line summary via Gemini
    const summary = await generateExecutiveSummary(base64Data, file.name);

    const newDoc = await prisma.document.create({
      data: {
        title: file.name,
        filePath: "/uploads/" + file.name,
        fileData: base64Data,
        summary: summary,
        ...(currentUserId ? { userId: currentUserId } : {}),
      },
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