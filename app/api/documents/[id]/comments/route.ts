import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, context: any) {
  try {
    const rawParams = context?.params ? await context.params : null;
    const urlParts = req.nextUrl.pathname.split("/").filter(Boolean);
    const idOrToken = rawParams?.id || urlParts[urlParts.length - 2];

    const body = await req.json();
    const { authorName, content, parentId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
    }

    const document = await prisma.document.findFirst({
      where: {
        OR: [{ id: idOrToken }, { shareToken: idOrToken }],
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const resolvedAuthorName = session?.user?.name || authorName?.trim() || "Guest Reviewer";

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorName: resolvedAuthorName,
        documentId: document.id,
        parentId: parentId || null,
      },
      include: {
        replies: true,
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error("Post comment error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to post comment." },
      { status: 500 }
    );
  }
}