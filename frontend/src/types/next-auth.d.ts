import "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      organization?: string
    }
    accessToken: string
  }

  interface User {
    id: string
    email: string
    name: string
    organization?: string
    accessToken: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    organization?: string
    accessToken: string
  }
}

