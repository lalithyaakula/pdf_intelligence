import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // 1. Create document with placeholder
    const newDoc = await prisma.document.create({
      data: {
        title: file.name,
        filePath: "/uploads/" + file.name,
        fileData: base64Data,
        summary: "Analyzing and generating AI executive summary...",
        ...(currentUserId ? { userId: currentUserId } : {}),
      },
    });

    // 2. Call Gemini API for 4-line summary
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      inlineData: {
                        mimeType: "application/pdf",
                        data: base64Data,
                      },
                    },
                    {
                      text: "Analyze this document and write an executive summary in exactly 4 concise bullet points. Each bullet point must be 1 clear sentence covering key concepts, objectives, and main takeaways.",
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        const data = await response.json();
        const geminiSummary = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (geminiSummary && geminiSummary.trim().length > 0) {
          const updatedDoc = await prisma.document.update({
            where: { id: newDoc.id },
            data: { summary: geminiSummary.trim() },
          });
          return NextResponse.json(updatedDoc, { status: 201 });
        }
      } catch (geminiErr) {
        console.error("[Gemini Upload Summary Error]:", geminiErr);
      }
    }

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    console.error("[Upload Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload document." },
      { status: 500 }
    );
  }
}