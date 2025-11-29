"use client"

import { useEffect, useState, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/navbar"
import { CheckCircle, Circle, RefreshCw, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useSearchParams } from "next/navigation"

interface Integration {
  name: string
  display_name: string
  description: string
  icon: string
  connected: boolean
  status: string | null
  last_sync: string | null
  sync_status: string | null
  integration_id: string | null
}

function IntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success/error from OAuth callback
    const successParam = searchParams.get("success")
    const errorParam = searchParams.get("error")
    
    if (successParam) {
      setSuccess(`Successfully connected to ${successParam.replace("_", " ")}!`)
      // Clear URL params
      window.history.replaceState({}, "", "/integrations")
    }
    
    if (errorParam) {
      setError(`Connection failed: ${errorParam}`)
      window.history.replaceState({}, "", "/integrations")
    }

    fetchIntegrations()
  }, [searchParams])

  async function fetchIntegrations() {
    try {
      setLoading(true)
      const data = await apiClient.integrations.list()
      setIntegrations(data)
    } catch (err: any) {
      setError(err.message || "Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect(toolName: string) {
    try {
      setConnecting(toolName)
      setError(null)
      
      const { auth_url } = await apiClient.integrations.getAuthUrl(toolName)
      window.location.href = auth_url
    } catch (err: any) {
      setError(err.message || "Failed to start connection")
      setConnecting(null)
    }
  }

  async function handleDisconnect(toolName: string) {
    try {
      setError(null)
      await apiClient.integrations.disconnect(toolName)
      setSuccess(`Disconnected from ${toolName.replace("_", " ")}`)
      fetchIntegrations()
    } catch (err: any) {
      setError(err.message || "Failed to disconnect")
    }
  }

  async function handleSync(toolName: string) {
    try {
      setSyncing(toolName)
      setError(null)
      
      await apiClient.integrations.sync(toolName)
      setSuccess(`Sync completed for ${toolName.replace("_", " ")}`)
      fetchIntegrations()
    } catch (err: any) {
      setError(err.message || "Sync failed")
    } finally {
      setSyncing(null)
    }
  }

  function formatLastSync(lastSync: string | null) {
    if (!lastSync) return "Never"
    const date = new Date(lastSync)
    return date.toLocaleString()
  }

  return (
    <>
      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-4 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading integrations...</span>
        </div>
      ) : (
        /* Integrations Grid */
        <div className="grid md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.name}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div>
                      <CardTitle>{integration.display_name}</CardTitle>
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
                  <div className="space-y-3">
                    <div className="text-sm text-slate-500">
                      Last sync: {formatLastSync(integration.last_sync)}
                      {integration.sync_status && integration.sync_status !== "idle" && (
                        <span className="ml-2 text-blue-600">
                          ({integration.sync_status})
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync(integration.name)}
                        disabled={syncing === integration.name}
                      >
                        {syncing === integration.name ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Sync Now
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDisconnect(integration.name)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => handleConnect(integration.name)}
                    disabled={connecting === integration.name}
                  >
                    {connecting === integration.name ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-slate-600">Connect your tools to aggregate data in one place</p>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-500">Loading...</span>
          </div>
        }>
          <IntegrationsContent />
        </Suspense>
      </div>
    </div>
  )
}
