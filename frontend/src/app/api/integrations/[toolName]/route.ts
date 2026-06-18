import { NextResponse } from "next/server"
import { withAuth, notFound, badRequest } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/integrations/[toolName] - Get specific integration status
export const GET = withAuth(async ({ session, params }) => {
  const { toolName } = params

  const integration = await prisma.integration.findFirst({
    where: { userId: session.user.id, name: toolName },
  })

  if (!integration) {
    return notFound("Integration not found")
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
}, "Get integration")

// Map of API key integrations to their env var names
const API_KEY_ENV_MAP: Record<string, { env: string; displayName: string }> = {
  crunchbase: { env: "CRUNCHBASE_API_KEY", displayName: "Crunchbase" },
  apollo: { env: "APOLLO_API_KEY", displayName: "Apollo.io" },
}

// POST /api/integrations/[toolName] - Connect API-key integration
export const POST = withAuth(async ({ session, params }) => {
  const { toolName } = params
  const config = API_KEY_ENV_MAP[toolName]

  if (!config) {
    return badRequest("Unknown integration")
  }

  const apiKey = process.env[config.env]
  if (!apiKey) {
    return badRequest(`${config.env} is not set in your .env file`)
  }

  const integration = await prisma.integration.upsert({
    where: {
      userId_name: { userId: session.user.id, name: toolName },
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
}, "Connect integration")

// DELETE /api/integrations/[toolName] - Disconnect integration
export const DELETE = withAuth(async ({ session, params }) => {
  const { toolName } = params

  const integration = await prisma.integration.findFirst({
    where: { userId: session.user.id, name: toolName },
  })

  if (!integration) {
    return notFound("Integration not found")
  }

  await prisma.integration.delete({ where: { id: integration.id } })

  return NextResponse.json({ status: "disconnected", integration: toolName })
}, "Disconnect integration")
