import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider - connects to your FastAPI backend
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        try {
          // Call FastAPI login endpoint
          const response = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              username: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || "Invalid credentials")
          }

          const data = await response.json()
          
          // Return user object with access token
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.full_name,
            organization: data.user.organization,
            accessToken: data.access_token,
          }
        } catch (error: any) {
          throw new Error(error.message || "Authentication failed")
        }
      },
    }),

    // Google OAuth (optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.organization = (user as any).organization
        token.accessToken = (user as any).accessToken
      }

      // For OAuth providers, register/sync user with backend
      if (account && account.provider !== "credentials") {
        try {
          const response = await fetch(`${API_URL}/api/v1/auth/oauth-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: token.email,
              name: token.name,
              provider: account.provider,
              provider_id: account.providerAccountId,
            }),
          })
          
          if (response.ok) {
            const data = await response.json()
            token.id = data.user.id
            token.accessToken = data.access_token
          }
        } catch (error) {
          console.error("OAuth sync failed:", error)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        (session.user as any).organization = token.organization
        (session as any).accessToken = token.accessToken
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/chat`
      }
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },

  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

