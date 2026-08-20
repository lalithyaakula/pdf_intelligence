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
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");

    const dataPayload: any = {
      title: file.name,
      filePath: `/uploads/${file.name}`,
      fileData: base64Data,
      summary: `Document: ${file.name}`,
    };

    if (currentUserId) {
      dataPayload.userId = currentUserId;
    }

    const newDoc = await prisma.document.create({
      data: dataPayload,
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