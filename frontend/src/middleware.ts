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

        // API routes are handled separately
        if (pathname.startsWith("/api")) {
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
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled by NextAuth internally)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

