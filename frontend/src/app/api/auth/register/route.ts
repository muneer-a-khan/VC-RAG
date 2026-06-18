import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, organization } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { detail: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof full_name !== "string") {
      return NextResponse.json(
        { detail: "Invalid input types" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json(
        { detail: "Invalid email address" },
        { status: 400 }
      )
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { detail: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      )
    }

    if (password.length > 128) {
      return NextResponse.json(
        { detail: "Password must be at most 128 characters" },
        { status: 400 }
      )
    }

    const trimmedName = full_name.trim().slice(0, 200)
    if (trimmedName.length < 1) {
      return NextResponse.json(
        { detail: "Full name is required" },
        { status: 400 }
      )
    }

    const sanitizedOrg = organization ? String(organization).trim().slice(0, 200) : null

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
        email: normalizedEmail,
        hashedPassword,
        fullName: trimmedName,
        organization: sanitizedOrg,
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
  } catch (error: unknown) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { detail: "Failed to register" },
      { status: 500 }
    )
  }
}

