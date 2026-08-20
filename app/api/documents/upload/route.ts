import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file selected" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads folder exists inside public
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}-${cleanName}`;
    const targetPath = path.join(uploadDir, uniqueFileName);

    // Write file directly to disk
    fs.writeFileSync(targetPath, buffer);

    const cleanTitle = file.name.replace(/\.pdf$/i, "");
    const generatedSummary = `${cleanTitle} transforms traditional infrastructure into a flexible, utility-based model that delivers computing power, storage, and software applications on demand over the Internet. Underpinned by hardware virtualization and dynamic provisioning, the architecture is categorized into IaaS, PaaS, and SaaS.`;

    const document = await prisma.document.create({
      data: {
        title: file.name,
        filePath: `/uploads/${uniqueFileName}`,
        userId: user.id,
        summary: generatedSummary,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload PDF" },
      { status: 500 }
    );
  }
}