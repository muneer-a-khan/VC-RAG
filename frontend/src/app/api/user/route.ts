import { NextResponse } from "next/server"
import { withAuth, notFound } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ session }) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      email: true,
      fullName: true,
      organization: true,
      createdAt: true,
    },
  })

  if (!user) {
    return notFound("User not found")
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    organization: user.organization,
    created_at: user.createdAt,
  })
}, "Get user")
