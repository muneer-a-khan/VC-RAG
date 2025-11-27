import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware() {
    return
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public routes that don't require authentication
        const publicRoutes = ["/", "/login", "/register"]
        if (publicRoutes.includes(pathname)) {
          return true
        }

        // API routes are handled by NextAuth internally
        if (pathname.startsWith("/api/auth")) {
          return true
        }

        // Static assets and Next.js internals
        if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match specific protected routes:
     * - /chat
     * - /projects
     * - /integrations
     * Exclude API routes and static assets
     */
    "/chat/:path*",
    "/projects/:path*",
    "/integrations/:path*",
    "/((?!api|_next|favicon).*)",
  ],
}

