import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { exchangeOAuthCode, AVAILABLE_INTEGRATIONS } from "@/lib/services/integration-service"

// POST /api/integrations/[toolName]/callback - Complete OAuth connection
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
    const body = await request.json()
    const { code, state } = body

    if (!code || !state) {
      return NextResponse.json(
        { detail: "Code and state are required" },
        { status: 400 }
      )
    }

    // Verify integration exists
    const integrationConfig = AVAILABLE_INTEGRATIONS.find((i) => i.name === toolName)
    if (!integrationConfig) {
      return NextResponse.json(
        { detail: "Unknown integration" },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    let tokens
    try {
      tokens = await exchangeOAuthCode(toolName, code, state)
    } catch (error: any) {
      console.error("Token exchange failed:", error)
      return NextResponse.json(
        { detail: "Failed to exchange authorization code" },
        { status: 400 }
      )
    }

    // Create or update integration
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
  } catch (error: any) {
    console.error("OAuth callback error:", error)
    return NextResponse.json(
      { detail: error.message || "Failed to complete OAuth" },
      { status: 500 }
    )
  }
}

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
      // Redirect to integrations page with error
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/integrations?error=missing_params", request.url)
      )
    }

    // Decode state to get user info
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
    } catch {
      return NextResponse.redirect(
        new URL("/integrations?error=invalid_state", request.url)
      )
    }

    // Verify integration exists
    const integrationConfig = AVAILABLE_INTEGRATIONS.find((i) => i.name === toolName)
    if (!integrationConfig) {
      return NextResponse.redirect(
        new URL("/integrations?error=unknown_integration", request.url)
      )
    }

    // Exchange code for tokens
    try {
      const tokens = await exchangeOAuthCode(toolName, code, state)

      // Create or update integration
      await prisma.integration.upsert({
        where: {
          userId_name: {
            userId: stateData.userId,
            name: toolName,
          },
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

      // Redirect to integrations page with success
      return NextResponse.redirect(
        new URL(`/integrations?success=${toolName}`, request.url)
      )
    } catch (error: any) {
      console.error("OAuth callback error:", error)
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error.message)}`, request.url)
      )
    }
  } catch (error: any) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/integrations?error=callback_failed", request.url)
    )
  }
}

