import { getServerSession } from "next-auth"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import * as bcrypt from "bcryptjs"

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
        try {
          // Find or create user
          let dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          })

          if (!dbUser) {
            // Create new user for OAuth
            const randomPassword = Math.random().toString(36).slice(-16)
            const hashedPassword = await bcrypt.hash(randomPassword, 12)

            dbUser = await prisma.user.create({
              data: {
                email: token.email,
                hashedPassword,
                fullName: token.name || "User",
              },
            })
          }

          token.id = dbUser.id
          token.organization = dbUser.organization || undefined
        } catch (error) {
          console.error("OAuth user sync failed:", error)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        // Safely assign token properties (handle cases where token.id might not exist)
        ;(session.user as any).id = token.id || token.sub || ""
        ;(session.user as any).organization = token.organization || null
        ;(session as any).accessToken = token.accessToken || ""
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

