import { NextResponse } from "next/server"
import { withAuth, badRequest } from "@/lib/api-utils"
import { getOAuthUrl, AVAILABLE_INTEGRATIONS } from "@/lib/services/integration-service"

export const dynamic = 'force-dynamic'

// GET /api/integrations/[toolName]/auth-url - Get OAuth URL for integration
export const GET = withAuth(async ({ session, params }) => {
  const { toolName } = params

  const integration = AVAILABLE_INTEGRATIONS.find((i) => i.name === toolName)
  if (!integration) {
    return badRequest("Unknown integration")
  }

  try {
    const authUrl = getOAuthUrl(toolName, session.user.id)
    const state = Buffer.from(
      JSON.stringify({ userId: session.user.id, integration: toolName })
    ).toString("base64")

    return NextResponse.json({ auth_url: authUrl, state })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "OAuth not configured for this integration"
    return badRequest(message)
  }
}, "Get auth URL")
