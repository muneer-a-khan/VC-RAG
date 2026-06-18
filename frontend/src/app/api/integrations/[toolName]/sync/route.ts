import { NextResponse } from "next/server"
import { withAuth, notFound, badRequest } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { triggerSync } from "@/lib/services/integration-service"

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST /api/integrations/[toolName]/sync - Trigger data sync
export const POST = withAuth(async ({ session, params }) => {
  const { toolName } = params

  const integration = await prisma.integration.findFirst({
    where: { userId: session.user.id, name: toolName },
  })

  if (!integration) {
    return notFound("Integration not found")
  }

  if (integration.status !== "connected") {
    return badRequest("Integration is not connected")
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { syncStatus: "syncing" },
  })

  try {
    const credentials = integration.credentials as Record<string, any>
    const result = await triggerSync(toolName, credentials, session.user.id)

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
  } catch (syncError: unknown) {
    const message =
      syncError instanceof Error ? syncError.message : "Sync failed"

    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        syncStatus: "error",
        metadata: {
          ...(integration.metadata as object),
          lastSyncError: message,
        },
      },
    })

    return NextResponse.json({ detail: message }, { status: 500 })
  }
}, "Sync")
