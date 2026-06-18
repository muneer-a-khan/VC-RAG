import { NextRequest, NextResponse } from "next/server"
import { withAuth, badRequest } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { exchangeOAuthCode, AVAILABLE_INTEGRATIONS, verifySignedState } from "@/lib/services/integration-service"

export const dynamic = 'force-dynamic'

// POST /api/integrations/[toolName]/callback - Complete OAuth connection
export const POST = withAuth(async ({ session, params, request }) => {
  const { toolName } = params
  const body = await request.json()
  const { code, state } = body

  if (!code || !state) {
    return badRequest("Code and state are required")
  }

  const integrationConfig = AVAILABLE_INTEGRATIONS.find((i) => i.name === toolName)
  if (!integrationConfig) {
    return badRequest("Unknown integration")
  }

  let tokens
  try {
    tokens = await exchangeOAuthCode(toolName, code, state)
  } catch (error: unknown) {
    console.error("Token exchange failed:", error)
    return badRequest("Failed to exchange authorization code")
  }

  const integration = await prisma.integration.upsert({
    where: {
      userId_name: { userId: session.user.id, name: toolName },
    },
    create: {
      userId: session.user.id,
      name: toolName,
      displayName: integrationConfig.displayName,
      status: "connected",
      credentials: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      },
    },
    update: {
      status: "connected",
      credentials: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
      },
    },
  })

  return NextResponse.json({
    status: "connected",
    integration: toolName,
    integration_id: integration.id,
  })
}, "OAuth callback")

// GET /api/integrations/[toolName]/callback - Handle OAuth redirect
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> }
) {
  try {
    const { toolName } = await params
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/integrations?error=missing_params", request.url)
      )
    }

    const stateData = verifySignedState(state)
    if (!stateData) {
      return NextResponse.redirect(
        new URL("/integrations?error=invalid_state", request.url)
      )
    }

    const integrationConfig = AVAILABLE_INTEGRATIONS.find((i) => i.name === toolName)
    if (!integrationConfig) {
      return NextResponse.redirect(
        new URL("/integrations?error=unknown_integration", request.url)
      )
    }

    try {
      const tokens = await exchangeOAuthCode(toolName, code, state)

      await prisma.integration.upsert({
        where: {
          userId_name: { userId: stateData.userId, name: toolName },
        },
        create: {
          userId: stateData.userId,
          name: toolName,
          displayName: integrationConfig.displayName,
          status: "connected",
          credentials: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
          },
        },
        update: {
          status: "connected",
          credentials: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: Date.now() + tokens.expiresIn * 1000,
          },
        },
      })

      return NextResponse.redirect(
        new URL(`/integrations?success=${toolName}`, request.url)
      )
    } catch (oauthError: unknown) {
      const message = oauthError instanceof Error ? oauthError.message : "callback_failed"
      console.error("OAuth callback error:", oauthError)
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(message)}`, request.url)
      )
    }
  } catch (error: unknown) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/integrations?error=callback_failed", request.url)
    )
  }
}
