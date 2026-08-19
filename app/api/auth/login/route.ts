// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Use Better Auth's signIn
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: error.message || "Invalid credentials" },
      { status: 401 }
    )
  }
}