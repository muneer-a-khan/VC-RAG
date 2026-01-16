import { getServerSession } from "next-auth"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import * as bcrypt from "bcryptjs"

async function refreshGoogleAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token"

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
      refresh_token: token.refreshToken || "",
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      // Google may not always return a new refresh token
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Math.floor(Date.now() / 1000) + (refreshedTokens.expires_in ?? 3600),
      error: undefined,
    }
  } catch (error) {
    console.error("Failed to refresh Google access token", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider - authenticates directly with database
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            return null
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)

          if (!isValid) {
            return null
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            organization: user.organization || undefined,
          }
        } catch (error: any) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),

    // Google OAuth (optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                // Add Drive permission for Google Picker + file downloads
                scope: "openid email profile https://www.googleapis.com/auth/drive.readonly",
                // Ask for a refresh token on first consent
                access_type: "offline",
                prompt: "consent",
              },
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in with credentials
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.organization = (user as any).organization
      }

      // For OAuth providers, create/sync user in database
      if (account && account.provider !== "credentials" && token.email) {
        // Persist OAuth tokens (needed for Google Drive Picker + downloads)
        if (account.provider === "google") {
          ;(token as any).accessToken = (account as any).access_token
          ;(token as any).refreshToken = (account as any).refresh_token ?? (token as any).refreshToken
          ;(token as any).accessTokenExpires = (account as any).expires_at
        }

        try {
          // Find or create user using upsert to avoid race conditions
          const dbUser = await prisma.user.upsert({
            where: { email: token.email },
            update: {
              // Update name if changed
              fullName: token.name || undefined,
            },
            create: {
              email: token.email,
              hashedPassword: await bcrypt.hash(
                Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16),
                12
              ),
              fullName: token.name || "User",
            },
          })

          token.id = dbUser.id
          token.organization = dbUser.organization || undefined
        } catch (error) {
          console.error("OAuth user sync failed:", error)
          // Don't silently fail - throw to prevent invalid session
          throw new Error("Failed to create user account. Please try again.")
        }
      }

      // Refresh Google access token if it's expired (or about to expire)
      const accessTokenExpires = (token as any).accessTokenExpires
      const refreshToken = (token as any).refreshToken
      if (refreshToken && accessTokenExpires && Date.now() > accessTokenExpires * 1000 - 60_000) {
        token = await refreshGoogleAccessToken(token)
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        // Only assign id if we have a valid database user id
        if (token.id && typeof token.id === "string") {
          ;(session.user as any).id = token.id
        } else {
          // This shouldn't happen, but if it does, the user needs to re-authenticate
          console.error("Session missing valid user id, token:", { id: token.id, sub: token.sub })
          ;(session.user as any).id = ""
        }
        ;(session.user as any).organization = token.organization || null
        ;(session as any).accessToken = token.accessToken || ""
        ;(session as any).authError = (token as any).error || null
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // After sign in, redirect to the intended page or chat
      const callbackUrl = url.includes('callbackUrl=') ? new URL(url).searchParams.get('callbackUrl') : null
      if (callbackUrl) {
        return callbackUrl
      }
      // Default to chat page after login
      return `${baseUrl}/chat`
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Only enable debug in development
  debug: process.env.NODE_ENV === "development",
}

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}
