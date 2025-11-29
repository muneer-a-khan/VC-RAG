import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { documents: true, chats: true },
        },
      },
    })

    return NextResponse.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: p.type,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        document_count: p._count.documents,
        chat_count: p._count.chats,
      }))
    )
  } catch (error: any) {
    console.error("Get projects error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get projects" },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type } = body

    if (!name) {
      return NextResponse.json({ detail: "Name is required" }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        type: type || "portfolio_company",
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      created_at: project.createdAt,
    })
  } catch (error: any) {
    console.error("Create project error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to create project" },
      { status: 500 }
    )
  }
}

