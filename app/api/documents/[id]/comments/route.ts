import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    if (!documentId) {
      return NextResponse.json([], { status: 200 });
    }

    const comments = await prisma.comment.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments || [], { status: 200 });
  } catch (error: any) {
    console.error("[Comments GET Error]:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: documentId } = await params;

    const body = await req.json();
    const text = body?.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
    }

    const author =
      session?.user?.name ||
      session?.user?.email?.split("@")[0] ||
      body?.authorName ||
      "Collaborator";

    let currentUserId: string | null = null;
    if (session?.user?.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });
        currentUserId = user?.id || null;
      } catch {
        currentUserId = null;
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        text,
        authorName: author,
        documentId,
        ...(currentUserId ? { userId: currentUserId } : {}),
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error: any) {
    console.error("[Comments POST Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to post comment." },
      { status: 500 }
    );
  }
}