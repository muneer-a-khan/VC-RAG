import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        fullName: true,
        organization: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      organization: user.organization,
      created_at: user.createdAt,
    })
  } catch (error: any) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get user" },
      { status: 500 }
    )
  }
}

