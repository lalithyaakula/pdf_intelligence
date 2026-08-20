import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    if (!documentId) {
      return new NextResponse("Document ID is required", { status: 400 });
    }

    // 1. Fetch document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.filePath) {
      return new NextResponse("Document or file record not found", { status: 404 });
    }

    // 2. Handle remote URLs (e.g., Supabase Storage / S3)
    if (
      document.filePath.startsWith("http://") ||
      document.filePath.startsWith("https://")
    ) {
      const response = await fetch(document.filePath);
      if (!response.ok) {
        return new NextResponse("Failed to fetch remote PDF stream", {
          status: 502,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(Buffer.from(arrayBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            document.title || "document"
          )}.pdf"`,
        },
      });
    }

    // 3. Handle local disk files from /public
    const cleanRelative = document.filePath.replace(/^[/\\]+/, "");
    const diskPath = path.join(process.cwd(), "public", cleanRelative);

    if (!fs.existsSync(diskPath)) {
      console.error("[PDF Stream] File not found on local disk:", diskPath);
      return new NextResponse("PDF file missing on server disk", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(diskPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          document.title || "document"
        )}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[PDF Stream Error]:", error);
    return new NextResponse(error?.message || "Internal Server Error loading PDF", {
      status: 500,
    });
  }
}