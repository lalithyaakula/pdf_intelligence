import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper function to generate an executive summary via Gemini
async function generateSummary(pdfBase64: string, fileName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Document uploaded: " + fileName;
  }

  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: "Provide a comprehensive, structured executive summary with key takeaways and bullet points of this document.",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return generatedText;
        }
      }
    } catch (err) {
      console.warn(`[Summary Generation Warning with ${model}]:`, err);
    }
  }

  return "Document uploaded: " + fileName;
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

    const base64Data = Buffer.from(await file.arrayBuffer()).toString("base64");

    // Generate AI Summary using Gemini
    const generatedSummary = await generateSummary(base64Data, file.name);

    const newDoc = await prisma.document.create({
      data: {
        title: file.name,
        filePath: "/uploads/" + file.name,
        fileData: base64Data,
        summary: generatedSummary,
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