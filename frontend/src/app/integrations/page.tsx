"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle } from "lucide-react"

const integrations = [
  {
    name: "Google Workspace",
    description: "Access files from Google Drive, Docs, and Sheets",
    connected: false,
    icon: "🔗"
  },
  {
    name: "HubSpot",
    description: "Sync CRM data including companies, contacts, and deals",
    connected: false,
    icon: "🟠"
  },
  {
    name: "AngelList",
    description: "Import startup data and investment information",
    connected: false,
    icon: "😇"
  },
  {
    name: "PitchBook",
    description: "Access market research and company intelligence",
    connected: false,
    icon: "📊"
  }
]

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-slate-600">Connect your tools to aggregate data in one place</p>
        </div>

        {/* Integrations Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div>
                      <CardTitle>{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  {integration.connected ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {integration.connected ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Sync Now</Button>
                    <Button variant="ghost" size="sm">Disconnect</Button>
                  </div>
                ) : (
                  <Button size="sm">Connect</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

