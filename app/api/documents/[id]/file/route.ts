import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
  });

  if (!doc) {
    return new NextResponse("Document not found", { status: 404 });
  }

  // Determine file location
  let targetPath = doc.filePath;
  if (!targetPath && doc.filename) {
    targetPath = path.join(process.cwd(), "public", "uploads", doc.filename);
  }

  if (!targetPath || !fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
  return new NextResponse("File not found on server", { status: 404 });
}

  // turbopackIgnore prevents Next.js static analysis tracing warning
  const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ targetPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.filename || "document.pdf"}"`,
    },
  });
}