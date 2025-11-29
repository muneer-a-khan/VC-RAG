/**
 * Third-party integration services
 * Handles OAuth flows and data syncing for external platforms
 */

export interface SyncResult {
  status: "success" | "error"
  [key: string]: any
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Available integrations configuration
 */
export const AVAILABLE_INTEGRATIONS = [
  {
    name: "google_workspace",
    displayName: "Google Workspace",
    description: "Access files from Google Drive, Docs, and Sheets",
    icon: "🔗",
  },
  {
    name: "hubspot",
    displayName: "HubSpot CRM",
    description: "Sync CRM data including companies, contacts, and deals",
    icon: "🟠",
  },
  {
    name: "angellist",
    displayName: "AngelList",
    description: "Import startup data and investment information",
    icon: "😇",
  },
  {
    name: "pitchbook",
    displayName: "PitchBook",
    description: "Access market research and company intelligence",
    icon: "📊",
  },
]

/**
 * Sync data from Google Workspace (Drive, Docs, Sheets)
 */
export async function syncGoogleWorkspace(
  credentials: Record<string, any>
): Promise<SyncResult> {
  // TODO: Implement Google Workspace sync
  // - List files in Drive
  // - Download and extract content
  // - Process and embed documents
  return {
    status: "success",
    filesSynced: 0,
    errors: [],
  }
}

/**
 * Sync CRM data from HubSpot
 */
export async function syncHubspot(apiKey: string): Promise<SyncResult> {
  // TODO: Implement HubSpot sync
  // - Fetch companies, contacts, deals
  // - Transform to unified format
  // - Store and embed relevant data
  return {
    status: "success",
    companies: 0,
    contacts: 0,
    deals: 0,
  }
}

/**
 * Sync startup data from AngelList
 */
export async function syncAngellist(apiKey: string): Promise<SyncResult> {
  // TODO: Implement AngelList sync
  return {
    status: "success",
    startups: 0,
  }
}

/**
 * Generate OAuth URL for integration
 */
export function getOAuthUrl(integrationName: string, userId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const state = Buffer.from(JSON.stringify({ userId, integration: integrationName })).toString("base64")

  switch (integrationName) {
    case "google_workspace":
      const googleClientId = process.env.GOOGLE_CLIENT_ID
      const googleRedirectUri = `${baseUrl}/api/integrations/google_workspace/callback`
      const scopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ].join(" ")
      
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(googleRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`

    case "hubspot":
      const hubspotClientId = process.env.HUBSPOT_CLIENT_ID
      const hubspotRedirectUri = `${baseUrl}/api/integrations/hubspot/callback`
      const hubspotScopes = "crm.objects.companies.read crm.objects.contacts.read crm.objects.deals.read"
      
      return `https://app.hubspot.com/oauth/authorize?client_id=${hubspotClientId}&redirect_uri=${encodeURIComponent(hubspotRedirectUri)}&scope=${encodeURIComponent(hubspotScopes)}&state=${state}`

    default:
      throw new Error(`Unknown integration: ${integrationName}`)
  }
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeOAuthCode(
  integrationName: string,
  code: string,
  state: string
): Promise<OAuthTokens> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  switch (integrationName) {
    case "google_workspace": {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${baseUrl}/api/integrations/google_workspace/callback`,
          grant_type: "authorization_code",
        }),
      })

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      }
    }

    case "hubspot": {
      const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.HUBSPOT_CLIENT_ID || "",
          client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
          redirect_uri: `${baseUrl}/api/integrations/hubspot/callback`,
          code,
        }),
      })

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      }
    }

    default:
      throw new Error(`Unknown integration: ${integrationName}`)
  }
}

/**
 * Trigger sync for an integration
 */
export async function triggerSync(
  integrationName: string,
  credentials: Record<string, any>
): Promise<SyncResult> {
  switch (integrationName) {
    case "google_workspace":
      return syncGoogleWorkspace(credentials)
    case "hubspot":
      return syncHubspot(credentials.apiKey)
    case "angellist":
      return syncAngellist(credentials.apiKey)
    default:
      throw new Error(`Unknown integration: ${integrationName}`)
  }
}

