import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { AVAILABLE_INTEGRATIONS } from "@/lib/services/integration-service"

export const dynamic = 'force-dynamic'

// GET /api/integrations - List all integrations
export const GET = withAuth(async ({ session }) => {
  const userIntegrations = await prisma.integration.findMany({
    where: { userId: session.user.id },
  })

  const connectedMap = new Map(
    userIntegrations.map((integ) => [integ.name, integ])
  )

  const result = AVAILABLE_INTEGRATIONS.map((integ) => {
    const connected = connectedMap.get(integ.name)
    return {
      name: integ.name,
      display_name: integ.displayName,
      description: integ.description,
      icon: integ.icon,
      connected: !!connected,
      status: connected?.status || null,
      last_sync: connected?.lastSync?.toISOString() || null,
      sync_status: connected?.syncStatus || null,
      integration_id: connected?.id || null,
    }
  })

  return NextResponse.json(result)
}, "Get integrations")
