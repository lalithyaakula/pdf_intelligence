import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ documents: [], error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ documents: [] }, { status: 200 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        filename: true,
        summary: true,
        createdAt: true,
        shareToken: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents: documents || [] }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { documents: [], error: error?.message || "Failed to fetch documents" },
      { status: 500 }
    );
  }
}