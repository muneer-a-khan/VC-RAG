import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Authenticated session with guaranteed user ID.
 */
export interface AuthenticatedSession {
  user: {
    id: string
    email?: string | null
    name?: string | null
  }
}

/**
 * Context passed to authenticated route handlers.
 */
export interface RouteContext {
  session: AuthenticatedSession
  request: NextRequest
  params: Record<string, string>
}

type RouteHandler = (ctx: RouteContext) => Promise<NextResponse | Response>

/**
 * Higher-order function that wraps an API route handler with:
 * - Authentication check (returns 401 if not authenticated)
 * - Standardized error handling (returns 500 with `{ detail }` on unhandled errors)
 *
 * Usage:
 *   export const GET = withAuth(async ({ session, request, params }) => { ... })
 */
export function withAuth(handler: RouteHandler, errorLabel?: string) {
  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse | Response> => {
    try {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
      }

      const params = context?.params ? await context.params : {}

      return await handler({
        session: session as unknown as AuthenticatedSession,
        request,
        params,
      })
    } catch (error: unknown) {
      const label = errorLabel || "API"
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred"
      console.error(`${label} error:`, error)
      return NextResponse.json({ detail: message }, { status: 500 })
    }
  }
}

/**
 * Verify that the authenticated user owns the specified project.
 * Returns the project if found, or a 404 NextResponse if not.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
  include?: Record<string, unknown>
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    ...(include ? { include } : {}),
  })

  if (!project) {
    return { project: null, error: notFound("Project not found") }
  }

  return { project, error: null }
}

/**
 * Standard error responses.
 */
export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ detail: message }, { status: 401 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ detail: message }, { status: 404 })
}

export function badRequest(message: string) {
  return NextResponse.json({ detail: message }, { status: 400 })
}

export function serverError(message: string) {
  return NextResponse.json({ detail: message }, { status: 500 })
}
