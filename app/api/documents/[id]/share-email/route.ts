import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: documentId } = await params;

    const body = await req.json();
    const email = body?.email?.trim();

    if (!email) {
      return NextResponse.json({ error: "Recipient email is required." }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const shareLink = `${origin}/documents/${documentId}`;

    console.log(`[Share-Email] Document "${document.title}" (${shareLink}) shared to: ${email}`);

    return NextResponse.json({ success: true, link: shareLink }, { status: 200 });
  } catch (error: any) {
    console.error("[Share-Email Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to share document link." },
      { status: 500 }
    );
  }
}