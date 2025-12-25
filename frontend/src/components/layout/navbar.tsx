"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/auth/user-menu"

const navItems = [
  { name: "Product", href: "/chat" },
  { name: "Pricing", href: "#" },
  { name: "About", href: "/about" },
  { name: "Resources", href: "#" },
]

const authNavItems = [
  { name: "Dashboard", href: "/chat" },
  { name: "Deals", href: "/chat" },
  { name: "Projects", href: "/projects" },
  { name: "Integrations", href: "/integrations" },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const items = session ? authNavItems : navItems

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-border-dark bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">VC Copilot</span>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-slate-600 dark:text-gray-300 hover:text-primary dark:hover:text-white"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <button className="hidden sm:flex p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors relative">
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border border-background-dark"></span>
              </button>
              <UserMenu />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-slate-600 dark:text-white hover:text-primary transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white shadow transition-transform hover:scale-105 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
