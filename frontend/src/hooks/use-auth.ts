"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isAuthenticated = !!session
  const isLoading = status === "loading"
  const user = session?.user

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      throw new Error(result.error)
    }

    router.push("/chat")
    router.refresh()
  }

  const loginWithProvider = (provider: "google" | "github") => {
    signIn(provider, { callbackUrl: "/chat" })
  }

  const logout = () => {
    signOut({ callbackUrl: "/" })
  }

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithProvider,
    logout,
  }
}

