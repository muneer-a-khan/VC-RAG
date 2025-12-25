"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
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

const integrationLogos: Record<string, string> = {
  salesforce: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbf_XiHrb6RogQxqWhSsoIYmLmH6as_PE6gE_bCqK0t_i8JkdPiw_RgFs__EnCa2-FfEcUqZvENxQG2-kpHw8jsvmPo_oZNcNNjEbh8ovYZftOQhv08PUW-q_2XFCDZr1JpaXluA5PEC7cEaYd43en836R-nk0u9S9iRhrVHrD_eLPwyMD8lvhPkXEuAG73DwPrqaqqRSyZIXWBa21tq-9A7qsvFuNUlz-OcEiAiDMcQMWvn16eWJQZAfkQ90aJSUzEThdzUvjq9vZ",
  pitchbook: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuQRxu2F_7MdvQL4ZEubhdzlnwO5-kPuXFxMgd4nCQesCHugLH0swVZymg7Mii-tzt9ThDXEvf_IzUyRPvY3McUaQQY6fOG8sG8ksgcAYSNmdzWR7t1TQ5kCE93fcQuZ5apOSmwhnU1VxKRy5s0EYyptRgcCYjqAjLKsNzB-U_NoZQQOZ5ZB1hXDESLm-0fWzFKBan4MJHhsqwW7P_D3pYsqDQ7osWZXMRm_ThrsPlB5aWw0zTumbG65IXMnEaGwe-qDiYFHGONilt",
  crunchbase: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKHz59tJCo-sSwTSHfizHvyTUYk_o30Rr5s2kVzdZZB-Sh3CdcRGAlZ4fMiEat6OvV2wm82iMixbo_n481G8NV6KUGJFw4axTOc0jnGPgMeEg2BmZs-BWJYGWHmFMY6qvPldfQtKU5yUMDLt_2B-UxNo1oMdUBeM_diszr4-rgvFoCYYK0wnDr2XfuZXNGJrdAlWqIkHUOSkORpfdQxIl2PQZr4RNTAd3zckWBSLp35kqYnNwdLUn3ex425ijP1oZslMAeVrxSH-4K",
  gmail: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsV8DapYVNxaPCZQFUIXKy7wmqmUPx_xYPTDPF5lA9BFxL08kAlkUKlPwT6Ooz8apznB-aktF9VZSfJ8SquRYpaN9qzmyhCTQZ8Go3Sk_n4MIMe9XC7QEIIYY-pl8ph9c7gwKkVOlG5W0xMjyjA_LjOJQYOAX5CtmhzuKLDUqzum98mRegeVdq94ug-Nskh3oJjCsOlBStqlf0rYCCW_PG0npCNrMPretmVNIxssLRoHPaw5fhmn8kwUJv-jrYlCIXw1rbtsAmqDh1",
  linkedin: "https://lh3.googleusercontent.com/aida-public/AB6AXuAfQCo-AsVHeP4g4Kgh_jIUz2Q3jSO21BfpaUX7ckg_3tS_pjCjdBf_OOdMgma068CS9d9Rsx9ylCy6UqcKfh6SR3ptE3NEAEmVjFneGOsqAyiRWjYUYexoENeFZCRgSu7zULpXrKDB3CSK5QPf-EFZ6DMD4xgyqata_ISgQbj45O1YEnxYkbn2o_3tIXGyK-6XnkGqIzJGFwC4NlZ6HpuwPfZi88G_H3hqLR8u6wYazRfR5zXTY2oqkOGVRCTS9CZfDxRohWeaHP84",
  quickbooks: "https://lh3.googleusercontent.com/aida-public/AB6AXuBtF4qW61gv7GvTdo_r8FZSD8FCiTSMa2BRnx65eGd9CnUQqbh-NiK8TXU5DHptzDcBkc4c0_jn6Wp9UESKhHQmUkWfR50XQqZjetPL550XrrRJBz-QoWiusSMKCySpUFWfAbmJ6iYK_DqbbG1ZeUkyi957RBLom0Si-KjDWxj99MlwwBb_-zrqGtAfWloWyGE99VGI5kR6PtozGe2eN3JElx7xSnitDn__0IF8MKB5KkkYTxicIX3JNhniKHfddJcxt8kTYfGfTB-H",
}

function IntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const searchParams = useSearchParams()

  useEffect(() => {
    const successParam = searchParams.get("success")
    const errorParam = searchParams.get("error")
    
    if (successParam) {
      setSuccess(`Successfully connected to ${successParam.replace("_", " ")}!`)
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
    if (!lastSync) return "Never synced"
    const date = new Date(lastSync)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return "Last synced: Just now"
    if (diffMins < 60) return `Last synced: ${diffMins} mins ago`
    if (diffHours < 24) return `Last synced: ${diffHours} hrs ago`
    return `Last synced: ${date.toLocaleDateString()}`
  }

  const tabs = [
    { id: "all", label: "All Sources" },
    { id: "crm", label: "CRM" },
    { id: "market", label: "Market Data" },
    { id: "communication", label: "Communication" },
    { id: "financials", label: "Financials" },
  ]

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden font-display">
      <div className="layout-container flex h-full grow flex-col">
        {/* TopNavBar */}
        <div className="w-full flex justify-center border-b border-border-dark bg-background-dark">
          <div className="flex flex-col max-w-[1280px] w-full">
            <header className="flex items-center justify-between whitespace-nowrap px-4 lg:px-10 py-3">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-4 text-white">
                  <div className="size-8 text-primary">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path d="M42 24C42 14.0589 33.9411 6 24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24Z" stroke="currentColor" strokeWidth="4" />
                      <path d="M24 14V34" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
                      <path d="M14 24H34" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
                    </svg>
                  </div>
                  <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">VC Copilot</h2>
                </Link>
                <div className="hidden lg:flex items-center gap-9">
                  <Link href="/chat" className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Dashboard</Link>
                  <Link href="/chat" className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Deal Flow</Link>
                  <Link href="/projects" className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors">Projects</Link>
                  <Link href="/integrations" className="text-primary text-sm font-medium leading-normal">Integrations</Link>
                </div>
              </div>
              <div className="flex flex-1 justify-end gap-6 items-center">
                <div className="hidden md:flex size-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-border-dark"></div>
              </div>
            </header>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-8">
          <div className="flex flex-col max-w-[1080px] flex-1">
            {/* Meta Text & Security Badge */}
            <div className="flex justify-end mb-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-dark bg-[#161f2b] px-3 py-1 text-xs font-medium text-text-secondary">
                <span className="material-symbols-outlined text-sm">lock</span>
                SOC2 Compliant | End-to-end Encrypted
              </div>
            </div>

            {/* Page Heading */}
            <div className="flex flex-wrap justify-between gap-3 pb-6">
              <div className="flex min-w-72 flex-col gap-2">
                <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Data Integrations</h1>
                <p className="text-text-secondary text-base font-normal leading-normal max-w-2xl">
                  Connect external data sources to enhance AI due diligence accuracy and portfolio tracking. We automatically sync data every 24 hours.
                </p>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-sm underline hover:no-underline">Dismiss</button>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 flex items-center justify-between">
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="text-sm underline hover:no-underline">Dismiss</button>
              </div>
            )}

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-end">
              {/* Tabs */}
              <div className="w-full md:w-auto overflow-x-auto">
                <div className="flex border-b border-[#324867] gap-6 min-w-max">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-2 transition-colors ${
                        activeTab === tab.id
                          ? "border-b-primary text-white"
                          : "border-b-transparent text-text-secondary hover:text-white"
                      }`}
                    >
                      <span className="text-sm font-bold leading-normal tracking-[0.015em]">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <label className="flex flex-col w-full md:w-80 h-10">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-[#1e293b] border border-[#334155] focus-within:border-primary transition-colors">
                  <div className="text-text-secondary flex items-center justify-center pl-3">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </div>
                  <input className="flex w-full min-w-0 flex-1 bg-transparent text-white focus:outline-none placeholder:text-[#64748b] px-3 text-sm font-normal" placeholder="Search integrations..." />
                </div>
              </label>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined text-4xl text-gray-500 animate-spin">progress_activity</span>
                <span className="ml-3 text-gray-500">Loading integrations...</span>
              </div>
            ) : (
              /* Grid Layout for Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((integration) => {
                  const logo = integrationLogos[integration.name] || null
                  return (
                    <div key={integration.name} className="flex flex-col bg-[#1e293b] border border-[#334155] rounded-xl p-5 hover:border-[#475569] transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-white p-2 rounded-lg size-12 flex items-center justify-center">
                          {logo ? (
                            <img alt={`${integration.display_name} logo`} className="w-8 h-8 object-contain" src={logo} />
                          ) : (
                            <span className="text-2xl">{integration.icon}</span>
                          )}
                        </div>
                        {integration.connected ? (
                          <div className="flex items-center gap-1.5 bg-[#10b981]/10 px-2.5 py-1 rounded-full border border-[#10b981]/20">
                            <div className="size-1.5 rounded-full bg-[#10b981]"></div>
                            <span className="text-[#10b981] text-xs font-semibold">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-[#334155]/30 px-2.5 py-1 rounded-full border border-[#475569]">
                            <div className="size-1.5 rounded-full bg-[#94a3b8]"></div>
                            <span className="text-[#94a3b8] text-xs font-semibold">Not Connected</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 mb-6">
                        <h3 className="text-white text-lg font-bold mb-1">{integration.display_name}</h3>
                        <p className="text-[#94a3b8] text-sm leading-relaxed">{integration.description}</p>
                      </div>
                      <div className="mt-auto border-t border-[#334155] pt-4">
                        <div className="flex justify-between items-center mb-3 text-xs text-[#64748b]">
                          <span>{integration.connected ? formatLastSync(integration.last_sync) : "Requires API Key"}</span>
                        </div>
                        {integration.connected ? (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDisconnect(integration.name)}
                              className="flex-1 bg-transparent border border-[#334155] text-white hover:bg-[#334155] text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => handleSync(integration.name)}
                              disabled={syncing === integration.name}
                              className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <span className={`material-symbols-outlined text-[18px] ${syncing === integration.name ? "animate-spin" : ""}`}>sync</span>
                              {syncing === integration.name ? "Syncing" : "Sync"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConnect(integration.name)}
                            disabled={connecting === integration.name}
                            className="w-full bg-primary hover:bg-primary/90 text-white text-sm font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {connecting === integration.name ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                Connecting...
                              </>
                            ) : (
                              <>
                                Connect
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer / Empty State Hint */}
            <div className="mt-12 p-6 bg-[#161f2b] rounded-xl border border-dashed border-[#334155] flex flex-col items-center justify-center text-center">
              <div className="bg-[#1e293b] p-3 rounded-full mb-3">
                <span className="material-symbols-outlined text-text-secondary text-2xl">add_link</span>
              </div>
              <h4 className="text-white font-medium mb-1">Don&apos;t see the tool you use?</h4>
              <p className="text-text-secondary text-sm mb-4">Request a new integration and our engineering team will prioritize it.</p>
              <button className="text-primary text-sm font-bold hover:underline">Request Integration</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  )
}
