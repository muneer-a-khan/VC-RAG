import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, organization } = body

    // Validate input
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { detail: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { detail: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        fullName: full_name,
        organization: organization || null,
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        organization: user.organization,
      },
      message: "User created successfully",
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to register" },
      { status: 500 }
    )
  }
}

