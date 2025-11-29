import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AVAILABLE_INTEGRATIONS } from "@/lib/services/integration-service"

// GET /api/integrations - List all integrations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    // Get user's connected integrations
    const userIntegrations = await prisma.integration.findMany({
      where: { userId: session.user.id },
    })

    // Map connected integrations by name
    const connectedMap = new Map(
      userIntegrations.map((integ) => [integ.name, integ])
    )

    // Build response with all available integrations
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
  } catch (error: any) {
    console.error("Get integrations error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get integrations" },
      { status: 500 }
    )
  }
}

