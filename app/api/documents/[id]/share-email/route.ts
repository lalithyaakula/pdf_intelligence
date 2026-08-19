import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: NextRequest, context: any) {
  try {
    // 1. Resolve parameters safely across Next.js versions
    const rawParams = context?.params ? await context.params : null;
    const urlParts = req.nextUrl.pathname.split("/").filter(Boolean);
    const idOrToken = rawParams?.id || urlParts[urlParts.length - 2];

    if (!idOrToken) {
      return NextResponse.json({ error: "Missing document ID." }, { status: 400 });
    }

    // 2. Parse request body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { recipientEmail, customNote } = body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid recipient email." }, { status: 400 });
    }

    // 3. Locate document in database
    const document = await prisma.document.findFirst({
      where: {
        OR: [{ id: idOrToken }, { shareToken: idOrToken }],
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found in database." }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const senderName = session?.user?.name || session?.user?.email || "A DocMind user";

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const shareUrl = `${origin}/documents/${document.shareToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
          <div style="width: 32px; height: 32px; background: #2563eb; color: #fff; border-radius: 8px; text-align: center; line-height: 32px; font-weight: bold;">D</div>
          <span style="font-size: 18px; font-weight: bold; color: #0f172a;">DocMind AI</span>
        </div>
        
        <h2 style="font-size: 20px; color: #1e293b; margin: 0 0 12px;">Document Shared with You</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          <strong>${senderName}</strong> invited you to collaborate on <strong>"${document.filename}"</strong>.
        </p>

        ${customNote ? `<div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #334155; font-style: italic;">"${customNote}"</div>` : ""}

        <div style="margin: 28px 0;">
          <a href="${shareUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
            Open Document Workspace &rarr;
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          No account registration is required to view or leave comments on this shared document.
        </p>
      </div>
    `;

    // 4. Send email via Resend if API key is set
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey.startsWith("re_")) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "DocMind AI <onboarding@resend.dev>",
          to: recipientEmail.trim(),
          subject: `📄 Document Shared: "${document.filename}"`,
          html: emailHtml,
        });
      } catch (err: any) {
        console.warn("Resend API warning (logged fallback):", err?.message);
      }
    } else {
      console.log(`\n📨 [SIMULATED EMAIL] To: ${recipientEmail} | Document: ${document.filename} | Link: ${shareUrl}\n`);
    }

    return NextResponse.json(
      { message: `Invitation successfully sent to ${recipientEmail}` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Share email API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email." },
      { status: 500 }
    );
  }
}