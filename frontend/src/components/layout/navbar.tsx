"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/auth/user-menu"
import { MessageSquare, FolderKanban, Plug, LayoutDashboard } from "lucide-react"

const navItems = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Integrations", href: "/integrations", icon: Plug },
]

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Logo & Nav Links */}
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-slate-900">VC Copilot</span>
            </Link>

            {session && (
              <div className="hidden sm:ml-10 sm:flex sm:space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {session && (
        <div className="sm:hidden border-t border-slate-200">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium rounded-md",
                    isActive
                      ? "text-blue-700"
                      : "text-slate-600"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}

