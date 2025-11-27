import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-slate-900">
            VC Copilot
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            AI-powered intelligence for venture capital professionals
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/chat">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Data Aggregation</CardTitle>
              <CardDescription>
                Unify data from HubSpot, AngelList, Google Workspace, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Connect your tools and access all your data in one place. No more switching between platforms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>
                RAG-based reasoning for due diligence and portfolio analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Ask questions in natural language and get intelligent, context-aware responses backed by your data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unified Workspace</CardTitle>
              <CardDescription>
                One interface to query, analyze, and visualize information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Manage projects, chat with your data, and automate workflows - all from a single platform.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to supercharge your VC operations?</CardTitle>
              <CardDescription>
                Start using VC Copilot today and transform how you work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/register">
                <Button size="lg" className="w-full">Create Account</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

