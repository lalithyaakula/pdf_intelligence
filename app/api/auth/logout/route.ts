// app/api/auth/logout/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST() {
  try {
    await auth.api.signOut()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}