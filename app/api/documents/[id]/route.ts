import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, context: any) {
  try {
    const rawParams = context?.params ? await context.params : null;
    const id = rawParams?.id || req.nextUrl.pathname.split("/").filter(Boolean).pop();

    if (!id) {
      return NextResponse.json({ error: "Missing document ID." }, { status: 400 });
    }

    const document = await prisma.document.findFirst({
      where: { OR: [{ id }, { shareToken: id }] },
      include: {
        comments: {
          where: { parentId: null }, // Only top-level comments
          include: {
            replies: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json({ document }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve document." },
      { status: 500 }
    );
  }
}