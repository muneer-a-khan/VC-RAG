import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { triggerSync } from "@/lib/services/integration-service"

export const dynamic = 'force-dynamic'

// POST /api/integrations/[toolName]/sync - Trigger data sync
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { toolName } = await params

    // Find integration
    const integration = await prisma.integration.findFirst({
      where: {
        userId: session.user.id,
        name: toolName,
      },
    })

    if (!integration) {
      return NextResponse.json(
        { detail: "Integration not found" },
        { status: 404 }
      )
    }

    if (integration.status !== "connected") {
      return NextResponse.json(
        { detail: "Integration is not connected" },
        { status: 400 }
      )
    }

    // Update sync status to syncing
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: "syncing" },
    })

    // Trigger sync (in production, this would be a background job)
    try {
      const credentials = integration.credentials as Record<string, any>
      const result = await triggerSync(toolName, credentials)

      // Update integration with sync results
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: result.status === "success" ? "idle" : "error",
          lastSync: new Date(),
          metadata: {
            ...(integration.metadata as object),
            lastSyncResult: result,
          },
        },
      })

      return NextResponse.json({
        status: "sync_completed",
        integration: toolName,
        result,
      })
    } catch (syncError: any) {
      // Update integration with error
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          syncStatus: "error",
          metadata: {
            ...(integration.metadata as object),
            lastSyncError: syncError.message,
          },
        },
      })

      return NextResponse.json(
        { detail: syncError.message || "Sync failed" },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to sync" },
      { status: 500 }
    )
  }
}

