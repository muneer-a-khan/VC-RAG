import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getOAuthUrl, AVAILABLE_INTEGRATIONS } from "@/lib/services/integration-service"

// GET /api/integrations/[toolName]/auth-url - Get OAuth URL for integration
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

    // Check if integration exists
    const integration = AVAILABLE_INTEGRATIONS.find((i) => i.name === toolName)
    if (!integration) {
      return NextResponse.json(
        { detail: "Unknown integration" },
        { status: 400 }
      )
    }

    try {
      const authUrl = getOAuthUrl(toolName, session.user.id)
      const state = Buffer.from(
        JSON.stringify({ userId: session.user.id, integration: toolName })
      ).toString("base64")

      return NextResponse.json({
        auth_url: authUrl,
        state,
      })
    } catch (error: any) {
      return NextResponse.json(
        { detail: error.message || "OAuth not configured for this integration" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Get auth URL error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to get auth URL" },
      { status: 500 }
    )
  }
}

