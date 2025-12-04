"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/auth/user-menu"

const navItems = [
  { name: "Chat", href: "/chat" },
  { name: "About", href: "/about" },
  { name: "Projects", href: "/projects" },
  { name: "Integrations", href: "/integrations" },
]

function Logo() {
  return (
    <svg className="size-6 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" fill="currentColor" />
    </svg>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-center border-b border-white/10 bg-background-dark/80 backdrop-blur-sm px-4 md:px-8">
      <div className="flex h-16 w-full max-w-7xl items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-4">
            <Logo />
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">VC Copilot</h2>
          </Link>
        </div>

        {/* Nav Links - Centered */}
        <nav className="hidden md:flex flex-1 justify-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium leading-normal transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-300 hover:text-primary"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sign In / User Menu */}
        <div className="flex items-center gap-4">
          {session ? (
            <UserMenu />
          ) : (
            <Link
              href="/login"
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity"
            >
              <span className="truncate">Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-background-dark/95 backdrop-blur-sm">
        <div className="flex justify-around py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium",
                  isActive
                    ? "text-primary"
                    : "text-gray-400"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </header>
  )
}
