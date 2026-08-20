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

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // 1. Direct Base64 stream from Supabase PostgreSQL (Permanent & Cloud-Safe)
    if (document.fileData) {
      const pdfBuffer = Buffer.from(document.fileData, "base64");
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(
            document.title || "document"
          )}.pdf"`,
        },
      });
    }

    // 2. Remote URL fallback
    if (
      document.filePath?.startsWith("http://") ||
      document.filePath?.startsWith("https://")
    ) {
      const response = await fetch(document.filePath);
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

    // 3. Local disk fallback
    if (document.filePath) {
      const cleanRelative = document.filePath.replace(/^[/\\]+/, "");
      const diskPath = path.join(process.cwd(), "public", cleanRelative);

      if (fs.existsSync(diskPath)) {
        const fileBuffer = fs.readFileSync(diskPath);
        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${encodeURIComponent(
              document.title || "document"
            )}.pdf"`,
          },
        });
      }
    }

    return new NextResponse("PDF content not found in database or disk.", {
      status: 404,
    });
  } catch (error: any) {
    console.error("[PDF Stream Error]:", error);
    return new NextResponse("Error rendering PDF", { status: 500 });
  }
}