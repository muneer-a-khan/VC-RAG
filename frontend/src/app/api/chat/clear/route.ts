import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// Helper function to clear data
async function clearUserData(userId: string) {
  const uploadProject = await prisma.project.findFirst({
    where: {
      userId,
      name: "Chat Uploads",
    },
  })

  let vectorsDeleted = 0
  let documentsDeleted = 0

  if (uploadProject) {
    const vectorResult = await prisma.vectorDocument.deleteMany({
      where: { projectId: uploadProject.id },
    })
    vectorsDeleted = vectorResult.count

    const docResult = await prisma.document.deleteMany({
      where: { projectId: uploadProject.id },
    })
    documentsDeleted = docResult.count
  }

  return { vectorsDeleted, documentsDeleted }
}

// GET /api/chat/clear - Clear via GET for easy browser access
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { vectorsDeleted, documentsDeleted } = await clearUserData(session.user.id)

    return NextResponse.json({
      success: true,
      vectors_deleted: vectorsDeleted,
      documents_deleted: documentsDeleted,
      message: "All uploaded files and their data have been cleared. You can now upload new files.",
    })
  } catch (error: any) {
    console.error("Clear error:", error)
    return NextResponse.json({ detail: error.message || "Failed to clear data" }, { status: 500 })
  }
}

// DELETE /api/chat/clear - Clear ALL uploaded documents and vector data for user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { vectorsDeleted, documentsDeleted } = await clearUserData(session.user.id)

    return NextResponse.json({
      success: true,
      vectors_deleted: vectorsDeleted,
      documents_deleted: documentsDeleted,
      message: "All uploaded files and their data have been cleared.",
    })
  } catch (error: any) {
    console.error("Clear error:", error)
    return NextResponse.json({ detail: error.message || "Failed to clear data" }, { status: 500 })
  }
}

