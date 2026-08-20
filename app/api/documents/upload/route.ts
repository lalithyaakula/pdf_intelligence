import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");

    // Create record in Supabase with base64 binary attached
    const newDoc = await prisma.document.create({
      data: {
        title: file.name,
        filePath: `/uploads/${file.name}`,
        fileData: base64Data,
        summary: `Document uploaded: ${file.name}`,
      },
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    console.error("[Upload Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload and save document." },
      { status: 500 }
    );
  }
}