import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/integrations/[toolName] - Get specific integration status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { toolName } = await params

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

    return NextResponse.json({
      id: integration.id,
      name: integration.name,
      display_name: integration.displayName,
      status: integration.status,
      last_sync: integration.lastSync?.toISOString() || null,
      sync_status: integration.syncStatus,
      created_at: integration.createdAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Get integration error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get integration" },
      { status: 500 }
    )
  }
}

<<<<<<< HEAD
=======
// Map of API key integrations to their env var names
const API_KEY_ENV_MAP: Record<string, { env: string; displayName: string }> = {
  crunchbase: { env: "CRUNCHBASE_API_KEY", displayName: "Crunchbase" },
  apollo: { env: "APOLLO_API_KEY", displayName: "Apollo.io" },
}

// POST /api/integrations/[toolName] - Connect API-key integration (reads key from .env)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
    }

    const { toolName } = await params
    const config = API_KEY_ENV_MAP[toolName]

    if (!config) {
      return NextResponse.json({ detail: "Unknown integration" }, { status: 400 })
    }

    const apiKey = process.env[config.env]
    if (!apiKey) {
      return NextResponse.json(
        { detail: `${config.env} is not set in your .env file` },
        { status: 400 }
      )
    }

    const integration = await prisma.integration.upsert({
      where: {
        userId_name: {
          userId: session.user.id,
          name: toolName,
        },
      },
      create: {
        userId: session.user.id,
        name: toolName,
        displayName: config.displayName,
        status: "connected",
        credentials: { api_key: apiKey },
      },
      update: {
        status: "connected",
        credentials: { api_key: apiKey },
      },
    })

    return NextResponse.json({
      status: "connected",
      integration_id: integration.id,
    })
  } catch (error: any) {
    console.error("Connect integration error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to connect integration" },
      { status: 500 }
    )
  }
}

>>>>>>> d914165 (Initial local Coreflow project)
// DELETE /api/integrations/[toolName] - Disconnect integration
export async function DELETE(
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

    // Delete integration
    await prisma.integration.delete({
      where: { id: integration.id },
    })

    return NextResponse.json({
      status: "disconnected",
      integration: toolName,
    })
  } catch (error: any) {
    console.error("Disconnect integration error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to disconnect integration" },
      { status: 500 }
    )
  }
}

