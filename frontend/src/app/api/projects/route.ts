import { NextResponse } from "next/server"
import { withAuth, badRequest } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/projects - List all projects
export const GET = withAuth(async ({ session }) => {
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { documents: true, chats: true } },
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
}, "Get projects")

// POST /api/projects - Create a new project
export const POST = withAuth(async ({ session, request }) => {
  const body = await request.json()
  const { name, description, type } = body

  if (!name) {
    return badRequest("Name is required")
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
}, "Create project")
