import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware() {
    return
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Require authentication for all routes protected by this middleware
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Only protect these specific routes that require authentication:
     */
    "/chat/:path*",
    "/projects/:path*",
    "/integrations/:path*",
  ],
}

