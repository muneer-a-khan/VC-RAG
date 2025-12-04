import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"

export const metadata: Metadata = {
  title: "VC Copilot - AI-Powered Due Diligence Platform",
  description: "Harness the power of AI to aggregate data, uncover critical insights, and manage your portfolio with unparalleled efficiency.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
