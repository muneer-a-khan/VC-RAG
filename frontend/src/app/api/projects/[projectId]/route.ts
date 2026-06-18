import { NextResponse } from "next/server"
import { withAuth, requireProjectAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/projects/[projectId] - Get a specific project
export const GET = withAuth(async ({ session, params }) => {
  const { projectId } = params

  const { project, error } = await requireProjectAccess(projectId, session.user.id, {
    _count: { select: { documents: true, chats: true } },
  })
  if (error) return error

  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    type: project.type,
    metadata: project.metadata,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    document_count: (project as any)._count.documents,
    chat_count: (project as any)._count.chats,
  })
}, "Get project")

// PATCH /api/projects/[projectId] - Update a project
export const PATCH = withAuth(async ({ session, params, request }) => {
  const { projectId } = params
  const body = await request.json()
  const { name, description, type, metadata } = body

  const { error } = await requireProjectAccess(projectId, session.user.id)
  if (error) return error

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(type && { type }),
      ...(metadata && { metadata }),
    },
  })

  return NextResponse.json({
    id: project.id,
    name: project.name,
    description: project.description,
    type: project.type,
    metadata: project.metadata,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
  })
}, "Update project")

// DELETE /api/projects/[projectId] - Delete a project
export const DELETE = withAuth(async ({ session, params }) => {
  const { projectId } = params

  const { error } = await requireProjectAccess(projectId, session.user.id)
  if (error) return error

  await prisma.project.delete({ where: { id: projectId } })

  return NextResponse.json({ status: "deleted", project_id: projectId })
}, "Delete project")
