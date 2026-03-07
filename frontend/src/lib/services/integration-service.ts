/**
 * Third-party integration services
 * Handles OAuth flows and data syncing for external platforms
 *
 * Integrations:
 * - Google Workspace (Drive, Docs, Sheets) with incremental sync
 * - Gmail (messages + attachments)
 * - HubSpot CRM (companies, deals, contacts) with incremental sync
 * - Salesforce CRM (accounts, opportunities, leads)
 * - Crunchbase (startup funding, investors, acquisitions)
 * - Clearbit (company enrichment by domain)
 * - Apollo.io (contacts, company search, revenue)
 */

import { createHmac } from "crypto"
import { indexDocument } from "./rag-service"
import { extractTextContent } from "./text-extraction"

const OAUTH_STATE_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret"

// ============================================================
// TYPES
// ============================================================

export interface SyncResult {
  status: "success" | "error"
  [key: string]: any
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface IntegrationMetadata {
  lastSyncAt?: string
  /** Google Drive changes API page token for incremental sync */
  driveChangesToken?: string
  /** HubSpot: ISO timestamp of last successful sync */
  hubspotLastSync?: string
  /** Gmail: historyId for incremental sync */
  gmailHistoryId?: string
  /** Salesforce: instance URL after OAuth */
  salesforceInstanceUrl?: string
}

export interface SyncItemError {
  item: string
  error: string
  retryable: boolean
}

// ============================================================
// UTILITIES: Exponential Backoff + Actionable Errors
// ============================================================

/**
 * Fetch with exponential backoff for rate-limited APIs (429, 503)
 * Retries up to maxRetries times with exponential delay + jitter
 */
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)

    if (response.ok) return response

    // Rate limit or temporary server error - retry with backoff
    if (
      (response.status === 429 || response.status === 503) &&
      attempt < maxRetries
    ) {
      const retryAfter = response.headers.get("Retry-After")
      const baseDelay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.pow(2, attempt) * 1000
      const jitter = Math.random() * 500
      const delay = baseDelay + jitter

      console.warn(
        `Rate limited (${response.status}) on ${url}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
      continue
    }

    // Non-retryable error
    const body = await response.text().catch(() => "")
    lastError = new Error(
      `HTTP ${response.status}: ${response.statusText}${body ? ` - ${body.slice(0, 200)}` : ""}`
    )
    break
  }

  throw lastError || new Error("Fetch failed after retries")
}

/**
 * Build user-friendly, actionable error messages
 */
function buildActionableError(
  integration: string,
  operation: string,
  error: any
): string {
  const message = error?.message || String(error)

  if (message.includes("401") || message.includes("403")) {
    return `${integration} ${operation} failed: Access denied. Please reconnect your ${integration} account in Settings > Integrations.`
  }
  if (message.includes("404")) {
    return `${integration} ${operation} failed: Resource not found. The item may have been deleted or you may lack permission.`
  }
  if (message.includes("429")) {
    return `${integration} ${operation} failed: Rate limit exceeded. Please wait a few minutes and try again.`
  }
  if (message.includes("500") || message.includes("503")) {
    return `${integration} ${operation} failed: ${integration} service is temporarily unavailable. Please try again later.`
  }
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("fetch failed")
  ) {
    return `${integration} ${operation} failed: Could not connect to ${integration}. Check your internet connection.`
  }

  return `${integration} ${operation} failed: ${message}`
}

// ============================================================
// OAUTH STATE (CSRF Protection)
// ============================================================

function createSignedState(data: Record<string, string>): string {
  const payload = JSON.stringify(data)
  const signature = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(payload)
    .digest("hex")
  return Buffer.from(JSON.stringify({ payload, signature })).toString(
    "base64url"
  )
}

export function verifySignedState(
  state: string
): Record<string, string> | null {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString())
    const { payload, signature } = decoded
    const expectedSignature = createHmac("sha256", OAUTH_STATE_SECRET)
      .update(payload)
      .digest("hex")
    if (signature !== expectedSignature) {
      console.error("OAuth state signature mismatch - possible CSRF attempt")
      return null
    }
    return JSON.parse(payload)
  } catch {
    // Try legacy unsigned format for backward compatibility
    try {
      return JSON.parse(Buffer.from(state, "base64").toString())
    } catch {
      return null
    }
  }
}

// ============================================================
// AVAILABLE INTEGRATIONS
// ============================================================

export const AVAILABLE_INTEGRATIONS = [
  {
    name: "google_workspace",
    displayName: "Google Workspace",
    description: "Access files from Google Drive, Docs, and Sheets",
    icon: "drive",
  },
  {
    name: "gmail",
    displayName: "Gmail",
    description:
      "Sync emails and attachments for deal flow and communication tracking",
    icon: "gmail",
  },
  {
    name: "hubspot",
    displayName: "HubSpot CRM",
    description: "Sync CRM data including companies, contacts, and deals",
    icon: "hubspot",
  },
  {
    name: "salesforce",
    displayName: "Salesforce CRM",
    description:
      "Sync accounts, opportunities, and leads from Salesforce",
    icon: "salesforce",
  },
  {
    name: "crunchbase",
    displayName: "Crunchbase",
    description: "Startup funding rounds, investors, acquisitions, and company intelligence",
    icon: "crunchbase",
  },
  {
    name: "apollo",
    displayName: "Apollo.io",
    description: "Contact data, company search, revenue estimates, and founder information",
    icon: "apollo",
  },
  {
    name: "angellist",
    displayName: "AngelList",
    description: "Import startup data and investment information via CSV export",
    icon: "angellist",
  },
  {
    name: "pitchbook",
    displayName: "PitchBook",
    description: "Import market research and company intelligence via CSV export",
    icon: "pitchbook",
  },
]

// ============================================================
// GOOGLE TOKEN REFRESH
// ============================================================

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const response = await fetchWithBackoff(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  )

  const data = await response.json()
  return data.access_token
}

// ============================================================
// GOOGLE WORKSPACE SYNC (with Incremental Changes API)
// ============================================================

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
}

/**
 * Get the initial changes start page token for incremental sync
 */
async function getDriveStartPageToken(
  accessToken: string
): Promise<string> {
  const response = await fetchWithBackoff(
    "https://www.googleapis.com/drive/v3/changes/startPageToken",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await response.json()
  return data.startPageToken
}

/**
 * List changed files since last sync using Changes API
 */
async function listDriveChanges(
  accessToken: string,
  pageToken: string
): Promise<{
  files: DriveFile[]
  newStartPageToken?: string
  nextPageToken?: string
}> {
  const params = new URLSearchParams({
    pageToken,
    pageSize: "100",
    fields:
      "nextPageToken,newStartPageToken,changes(fileId,file(id,name,mimeType,modifiedTime,size),removed)",
    includeRemoved: "false",
    spaces: "drive",
  })

  const response = await fetchWithBackoff(
    `https://www.googleapis.com/drive/v3/changes?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const data = await response.json()

  // Extract only supported file types from changes
  const supportedMimeTypes = new Set([
    "application/pdf",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/json",
    "text/html",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
  ])

  const files: DriveFile[] = (data.changes || [])
    .filter(
      (change: any) =>
        change.file &&
        !change.removed &&
        supportedMimeTypes.has(change.file.mimeType)
    )
    .map((change: any) => change.file)

  return {
    files,
    newStartPageToken: data.newStartPageToken,
    nextPageToken: data.nextPageToken,
  }
}

/**
 * List files from Google Drive (full sync fallback)
 */
async function listDriveFiles(
  accessToken: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    pageSize: "100",
    fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size)",
    q: "trashed=false and (mimeType='application/pdf' or mimeType='text/plain' or mimeType='text/csv' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='text/markdown' or mimeType='application/json' or mimeType='text/html')",
    orderBy: "modifiedTime desc",
  })

  if (pageToken) {
    params.set("pageToken", pageToken)
  }

  const response = await fetchWithBackoff(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  return response.json()
}

/**
 * Download file content from Google Drive
 * Handles native Google Docs (export) and regular files (download)
 */
async function downloadDriveFile(
  accessToken: string,
  fileId: string,
  mimeType: string,
  fileName: string
): Promise<string> {
  let url: string
  let exportMime: string | null = null

  if (mimeType === "application/vnd.google-apps.document") {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
    exportMime = "text/plain"
  } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`
    exportMime = "text/csv"
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  }

  const response = await fetchWithBackoff(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // Use our enhanced text extraction for all file types
  const buffer = Buffer.from(await response.arrayBuffer())
  const effectiveMime = exportMime || mimeType
  return extractTextContent(fileName, effectiveMime, buffer)
}

/**
 * Sync data from Google Workspace with incremental sync support
 */
export async function syncGoogleWorkspace(
  credentials: Record<string, any>,
  userId?: string,
  projectId?: string,
  metadata?: IntegrationMetadata
): Promise<SyncResult> {
  try {
    let accessToken = credentials.accessToken

    if (credentials.refreshToken) {
      try {
        accessToken = await refreshGoogleToken(credentials.refreshToken)
      } catch {
        // Use existing token if refresh fails
      }
    }

    let filesToProcess: DriveFile[] = []
    let newChangesToken: string | undefined

    // Incremental sync: use Changes API if we have a token
    if (metadata?.driveChangesToken) {
      try {
        let pageToken: string | undefined = metadata.driveChangesToken
        while (pageToken) {
          const result = await listDriveChanges(accessToken, pageToken)
          filesToProcess.push(...result.files)
          if (result.newStartPageToken) {
            newChangesToken = result.newStartPageToken
            break
          }
          pageToken = result.nextPageToken
        }
        console.log(
          `Incremental sync: ${filesToProcess.length} changed files since last sync`
        )
      } catch (err) {
        console.warn(
          "Incremental sync failed, falling back to full sync:",
          err
        )
        filesToProcess = []
      }
    }

    // Full sync fallback
    if (filesToProcess.length === 0 && !newChangesToken) {
      const { files } = await listDriveFiles(accessToken)
      filesToProcess = files.slice(0, 50)

      // Get initial changes token for next incremental sync
      try {
        newChangesToken = await getDriveStartPageToken(accessToken)
      } catch {
        // Non-critical
      }
    }

    let filesSynced = 0
    const itemErrors: SyncItemError[] = []
    const syncedFiles: string[] = []

    for (const file of filesToProcess) {
      try {
        const content = await downloadDriveFile(
          accessToken,
          file.id,
          file.mimeType,
          file.name
        )

        if (content && content.trim().length > 50) {
          if (userId) {
            await indexDocument(
              content,
              `[Google Drive] ${file.name}`,
              userId,
              projectId,
              "integration"
            )
          }
          filesSynced++
          syncedFiles.push(file.name)
        }
      } catch (fileError: any) {
        itemErrors.push({
          item: file.name,
          error: buildActionableError(
            "Google Drive",
            `download "${file.name}"`,
            fileError
          ),
          retryable:
            fileError.message?.includes("429") ||
            fileError.message?.includes("503"),
        })
      }
    }

    return {
      status: "success",
      filesSynced,
      totalFilesFound: filesToProcess.length,
      syncedFiles,
      driveChangesToken: newChangesToken,
      errors:
        itemErrors.length > 0
          ? itemErrors.map((e) => e.error)
          : undefined,
    }
  } catch (error: any) {
    return {
      status: "error",
      filesSynced: 0,
      error: buildActionableError(
        "Google Workspace",
        "sync",
        error
      ),
    }
  }
}

// ============================================================
// GMAIL SYNC
// ============================================================

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload?: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{
      mimeType: string
      body?: { data?: string; attachmentId?: string }
      filename?: string
    }>
  }
}

/**
 * Decode base64url-encoded Gmail body
 */
function decodeGmailBody(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8")
}

/**
 * Extract plain text body from a Gmail message
 */
function extractGmailText(message: GmailMessage): string {
  const parts: string[] = []

  // Extract headers
  const headers = message.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
    ""

  const subject = getHeader("Subject")
  const from = getHeader("From")
  const to = getHeader("To")
  const date = getHeader("Date")

  if (subject) parts.push(`Subject: ${subject}`)
  if (from) parts.push(`From: ${from}`)
  if (to) parts.push(`To: ${to}`)
  if (date) parts.push(`Date: ${date}`)
  parts.push("")

  // Extract body text
  if (message.payload?.body?.data) {
    parts.push(decodeGmailBody(message.payload.body.data))
  } else if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      if (
        part.mimeType === "text/plain" &&
        part.body?.data
      ) {
        parts.push(decodeGmailBody(part.body.data))
        break
      }
    }
    // Fallback to HTML part if no plain text
    if (parts.length <= 4) {
      for (const part of message.payload.parts) {
        if (
          part.mimeType === "text/html" &&
          part.body?.data
        ) {
          const html = decodeGmailBody(part.body.data)
          // Strip HTML tags for plain text
          parts.push(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
          break
        }
      }
    }
  }

  return parts.join("\n")
}

/**
 * Sync emails from Gmail for deal flow tracking
 */
export async function syncGmail(
  credentials: Record<string, any>,
  userId?: string,
  projectId?: string,
  _metadata?: IntegrationMetadata
): Promise<SyncResult> {
  try {
    let accessToken = credentials.accessToken

    if (credentials.refreshToken) {
      try {
        accessToken = await refreshGoogleToken(credentials.refreshToken)
      } catch {
        // Use existing token
      }
    }

    // List recent messages — pull all recent emails, not just VC-keyword-filtered
    const query = encodeURIComponent("newer_than:30d -category:promotions -category:social -category:updates")
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`

    const listResponse = await fetchWithBackoff(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listData = await listResponse.json()

    const messageIds: string[] = (listData.messages || []).map(
      (m: any) => m.id
    )
    let messagesSynced = 0
    const itemErrors: SyncItemError[] = []

    // Fetch and index each message
    for (const msgId of messageIds) {
      try {
        const msgResponse = await fetchWithBackoff(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const message: GmailMessage = await msgResponse.json()

        const text = extractGmailText(message)

        if (text.trim().length > 50 && userId) {
          const subject =
            message.payload?.headers?.find(
              (h) => h.name.toLowerCase() === "subject"
            )?.value || "Email"
          await indexDocument(
            text,
            `[Gmail] ${subject}`,
            userId,
            projectId,
            "integration"
          )
          messagesSynced++
        }
      } catch (err: any) {
        itemErrors.push({
          item: `Message ${msgId}`,
          error: buildActionableError("Gmail", `fetch message`, err),
          retryable: true,
        })
      }
    }

    return {
      status: "success",
      messagesSynced,
      totalMessages: messageIds.length,
      errors:
        itemErrors.length > 0
          ? itemErrors.map((e) => e.error)
          : undefined,
    }
  } catch (error: any) {
    return {
      status: "error",
      messagesSynced: 0,
      error: buildActionableError("Gmail", "sync", error),
    }
  }
}

// ============================================================
// HUBSPOT CRM SYNC (with Incremental Search API)
// ============================================================

interface HubSpotObject {
  id: string
  properties: Record<string, string | null>
  createdAt: string
  updatedAt: string
}

/**
 * Fetch objects from HubSpot CRM API with backoff
 */
async function fetchHubSpotObjects(
  accessToken: string,
  objectType: string,
  properties: string[]
): Promise<HubSpotObject[]> {
  const allObjects: HubSpotObject[] = []
  let after: string | undefined

  for (let page = 0; page < 10; page++) {
    const params: Record<string, string> = {
      limit: "100",
      properties: properties.join(","),
    }
    if (after) params.after = after

    const queryString = new URLSearchParams(params).toString()
    const response = await fetchWithBackoff(
      `https://api.hubapi.com/crm/v3/objects/${objectType}?${queryString}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    const data = await response.json()
    allObjects.push(...(data.results || []))

    if (data.paging?.next?.after) {
      after = data.paging.next.after
    } else {
      break
    }
  }

  return allObjects
}

/**
 * Search HubSpot objects modified since a given timestamp
 * Uses the HubSpot Search API for incremental sync
 */
async function searchHubSpotModifiedSince(
  accessToken: string,
  objectType: string,
  properties: string[],
  sinceTimestamp: string
): Promise<HubSpotObject[]> {
  const allObjects: HubSpotObject[] = []
  let after: string | undefined

  for (let page = 0; page < 10; page++) {
    const body: any = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "lastmodifieddate",
              operator: "GTE",
              value: new Date(sinceTimestamp).getTime().toString(),
            },
          ],
        },
      ],
      properties,
      limit: 100,
      sorts: [
        {
          propertyName: "lastmodifieddate",
          direction: "ASCENDING",
        },
      ],
    }
    if (after) body.after = after

    const response = await fetchWithBackoff(
      `https://api.hubapi.com/crm/v3/objects/${objectType}/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    allObjects.push(...(data.results || []))

    if (data.paging?.next?.after) {
      after = data.paging.next.after
    } else {
      break
    }
  }

  return allObjects
}

function formatCompanyForIndexing(company: HubSpotObject): string {
  const p = company.properties
  return [
    `Company: ${p.name || "Unknown"}`,
    p.domain ? `Website: ${p.domain}` : null,
    p.industry ? `Industry: ${p.industry}` : null,
    p.description ? `Description: ${p.description}` : null,
    p.numberofemployees ? `Employees: ${p.numberofemployees}` : null,
    p.annualrevenue ? `Annual Revenue: $${p.annualrevenue}` : null,
    p.city && p.state ? `Location: ${p.city}, ${p.state}` : null,
    p.phone ? `Phone: ${p.phone}` : null,
    p.founded_year ? `Founded: ${p.founded_year}` : null,
    `HubSpot ID: ${company.id}`,
    `Last Updated: ${company.updatedAt}`,
  ]
    .filter(Boolean)
    .join("\n")
}

function formatDealForIndexing(deal: HubSpotObject): string {
  const p = deal.properties
  return [
    `Deal: ${p.dealname || "Unknown"}`,
    p.dealstage ? `Stage: ${p.dealstage}` : null,
    p.amount ? `Amount: $${p.amount}` : null,
    p.pipeline ? `Pipeline: ${p.pipeline}` : null,
    p.closedate ? `Close Date: ${p.closedate}` : null,
    p.deal_currency_code ? `Currency: ${p.deal_currency_code}` : null,
    p.description ? `Description: ${p.description}` : null,
    `HubSpot ID: ${deal.id}`,
    `Last Updated: ${deal.updatedAt}`,
  ]
    .filter(Boolean)
    .join("\n")
}

function formatContactForIndexing(contact: HubSpotObject): string {
  const p = contact.properties
  const name =
    [p.firstname, p.lastname].filter(Boolean).join(" ") || "Unknown"
  return [
    `Contact: ${name}`,
    p.email ? `Email: ${p.email}` : null,
    p.phone ? `Phone: ${p.phone}` : null,
    p.company ? `Company: ${p.company}` : null,
    p.jobtitle ? `Title: ${p.jobtitle}` : null,
    p.lifecyclestage ? `Lifecycle Stage: ${p.lifecyclestage}` : null,
    `HubSpot ID: ${contact.id}`,
    `Last Updated: ${contact.updatedAt}`,
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Sync CRM data from HubSpot with incremental support
 */
export async function syncHubspot(
  credentials: Record<string, any>,
  userId?: string,
  projectId?: string,
  metadata?: IntegrationMetadata
): Promise<SyncResult> {
  try {
    const accessToken = credentials.accessToken || credentials.apiKey
    if (!accessToken) {
      return { status: "error", error: "No access token available" }
    }

    const errors: string[] = []
    const isIncremental = !!metadata?.hubspotLastSync

    // Shared fetch function: incremental or full
    const fetchObjects = async (
      objectType: string,
      properties: string[]
    ): Promise<HubSpotObject[]> => {
      if (isIncremental) {
        return searchHubSpotModifiedSince(
          accessToken,
          objectType,
          properties,
          metadata!.hubspotLastSync!
        )
      }
      return fetchHubSpotObjects(accessToken, objectType, properties)
    }

    // Fetch companies
    let companies: HubSpotObject[] = []
    try {
      companies = await fetchObjects("companies", [
        "name",
        "domain",
        "industry",
        "description",
        "numberofemployees",
        "annualrevenue",
        "city",
        "state",
        "phone",
        "founded_year",
      ])
    } catch (e: any) {
      errors.push(
        buildActionableError("HubSpot", "fetch companies", e)
      )
    }

    // Fetch deals
    let deals: HubSpotObject[] = []
    try {
      deals = await fetchObjects("deals", [
        "dealname",
        "dealstage",
        "amount",
        "pipeline",
        "closedate",
        "deal_currency_code",
        "description",
      ])
    } catch (e: any) {
      errors.push(buildActionableError("HubSpot", "fetch deals", e))
    }

    // Fetch contacts
    let contacts: HubSpotObject[] = []
    try {
      contacts = await fetchObjects("contacts", [
        "firstname",
        "lastname",
        "email",
        "phone",
        "company",
        "jobtitle",
        "lifecyclestage",
      ])
    } catch (e: any) {
      errors.push(
        buildActionableError("HubSpot", "fetch contacts", e)
      )
    }

    // Index data for RAG
    if (userId) {
      if (companies.length > 0) {
        const companiesText = companies
          .map((c) => formatCompanyForIndexing(c))
          .join("\n\n---\n\n")
        await indexDocument(
          companiesText,
          "[HubSpot] Companies",
          userId,
          projectId,
          "integration"
        )
      }
      if (deals.length > 0) {
        const dealsText = deals
          .map((d) => formatDealForIndexing(d))
          .join("\n\n---\n\n")
        await indexDocument(
          dealsText,
          "[HubSpot] Deals",
          userId,
          projectId,
          "integration"
        )
      }
      if (contacts.length > 0) {
        const contactsText = contacts
          .map((c) => formatContactForIndexing(c))
          .join("\n\n---\n\n")
        await indexDocument(
          contactsText,
          "[HubSpot] Contacts",
          userId,
          projectId,
          "integration"
        )
      }
    }

    return {
      status: "success",
      companies: companies.length,
      deals: deals.length,
      contacts: contacts.length,
      syncType: isIncremental ? "incremental" : "full",
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: any) {
    return {
      status: "error",
      companies: 0,
      deals: 0,
      contacts: 0,
      error: buildActionableError("HubSpot", "sync", error),
    }
  }
}

// ============================================================
// SALESFORCE CRM SYNC
// ============================================================

interface SalesforceRecord {
  Id: string
  Name?: string
  [key: string]: any
}

/**
 * Execute a SOQL query against Salesforce
 */
async function querySalesforce(
  accessToken: string,
  instanceUrl: string,
  soql: string
): Promise<SalesforceRecord[]> {
  const allRecords: SalesforceRecord[] = []
  let url = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`

  while (url) {
    const response = await fetchWithBackoff(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const data = await response.json()
    allRecords.push(...(data.records || []))

    url = data.nextRecordsUrl
      ? `${instanceUrl}${data.nextRecordsUrl}`
      : ""
  }

  return allRecords
}

function formatSalesforceAccountForIndexing(
  record: SalesforceRecord
): string {
  return [
    `Account: ${record.Name || "Unknown"}`,
    record.Website ? `Website: ${record.Website}` : null,
    record.Industry ? `Industry: ${record.Industry}` : null,
    record.Description ? `Description: ${record.Description}` : null,
    record.NumberOfEmployees
      ? `Employees: ${record.NumberOfEmployees}`
      : null,
    record.AnnualRevenue
      ? `Annual Revenue: $${record.AnnualRevenue}`
      : null,
    record.BillingCity && record.BillingState
      ? `Location: ${record.BillingCity}, ${record.BillingState}`
      : null,
    record.Type ? `Type: ${record.Type}` : null,
    `Salesforce ID: ${record.Id}`,
    record.LastModifiedDate
      ? `Last Updated: ${record.LastModifiedDate}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
}

function formatSalesforceOpportunityForIndexing(
  record: SalesforceRecord
): string {
  return [
    `Opportunity: ${record.Name || "Unknown"}`,
    record.StageName ? `Stage: ${record.StageName}` : null,
    record.Amount ? `Amount: $${record.Amount}` : null,
    record.CloseDate ? `Close Date: ${record.CloseDate}` : null,
    record.Type ? `Type: ${record.Type}` : null,
    record.Description ? `Description: ${record.Description}` : null,
    record.Probability
      ? `Probability: ${record.Probability}%`
      : null,
    `Salesforce ID: ${record.Id}`,
    record.LastModifiedDate
      ? `Last Updated: ${record.LastModifiedDate}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
}

function formatSalesforceLeadForIndexing(
  record: SalesforceRecord
): string {
  const name =
    [record.FirstName, record.LastName].filter(Boolean).join(" ") ||
    "Unknown"
  return [
    `Lead: ${name}`,
    record.Email ? `Email: ${record.Email}` : null,
    record.Company ? `Company: ${record.Company}` : null,
    record.Title ? `Title: ${record.Title}` : null,
    record.Status ? `Status: ${record.Status}` : null,
    record.Industry ? `Industry: ${record.Industry}` : null,
    record.LeadSource ? `Source: ${record.LeadSource}` : null,
    `Salesforce ID: ${record.Id}`,
    record.LastModifiedDate
      ? `Last Updated: ${record.LastModifiedDate}`
      : null,
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * Sync CRM data from Salesforce (Accounts, Opportunities, Leads)
 */
export async function syncSalesforce(
  credentials: Record<string, any>,
  userId?: string,
  projectId?: string
): Promise<SyncResult> {
  try {
    const accessToken = credentials.accessToken
    const instanceUrl =
      credentials.instanceUrl || credentials.instance_url

    if (!accessToken || !instanceUrl) {
      return {
        status: "error",
        error:
          "Salesforce credentials incomplete. Please reconnect your Salesforce account.",
      }
    }

    const errors: string[] = []

    // Fetch Accounts
    let accounts: SalesforceRecord[] = []
    try {
      accounts = await querySalesforce(
        accessToken,
        instanceUrl,
        "SELECT Id, Name, Website, Industry, Description, NumberOfEmployees, AnnualRevenue, BillingCity, BillingState, Type, LastModifiedDate FROM Account ORDER BY LastModifiedDate DESC LIMIT 500"
      )
    } catch (e: any) {
      errors.push(
        buildActionableError("Salesforce", "fetch accounts", e)
      )
    }

    // Fetch Opportunities
    let opportunities: SalesforceRecord[] = []
    try {
      opportunities = await querySalesforce(
        accessToken,
        instanceUrl,
        "SELECT Id, Name, StageName, Amount, CloseDate, Type, Description, Probability, LastModifiedDate FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT 500"
      )
    } catch (e: any) {
      errors.push(
        buildActionableError("Salesforce", "fetch opportunities", e)
      )
    }

    // Fetch Leads
    let leads: SalesforceRecord[] = []
    try {
      leads = await querySalesforce(
        accessToken,
        instanceUrl,
        "SELECT Id, FirstName, LastName, Email, Company, Title, Status, Industry, LeadSource, LastModifiedDate FROM Lead ORDER BY LastModifiedDate DESC LIMIT 500"
      )
    } catch (e: any) {
      errors.push(
        buildActionableError("Salesforce", "fetch leads", e)
      )
    }

    // Index for RAG
    if (userId) {
      if (accounts.length > 0) {
        const accountsText = accounts
          .map((a) => formatSalesforceAccountForIndexing(a))
          .join("\n\n---\n\n")
        await indexDocument(
          accountsText,
          "[Salesforce] Accounts",
          userId,
          projectId,
          "integration"
        )
      }
      if (opportunities.length > 0) {
        const oppsText = opportunities
          .map((o) => formatSalesforceOpportunityForIndexing(o))
          .join("\n\n---\n\n")
        await indexDocument(
          oppsText,
          "[Salesforce] Opportunities",
          userId,
          projectId,
          "integration"
        )
      }
      if (leads.length > 0) {
        const leadsText = leads
          .map((l) => formatSalesforceLeadForIndexing(l))
          .join("\n\n---\n\n")
        await indexDocument(
          leadsText,
          "[Salesforce] Leads",
          userId,
          projectId,
          "integration"
        )
      }
    }

    return {
      status: "success",
      accounts: accounts.length,
      opportunities: opportunities.length,
      leads: leads.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error: any) {
    return {
      status: "error",
      accounts: 0,
      opportunities: 0,
      leads: 0,
      error: buildActionableError("Salesforce", "sync", error),
    }
  }
}

// ============================================================
// CRUNCHBASE
// ============================================================

async function syncCrunchbase(
  _credentials: Record<string, any>,
  userId: string,
  projectId?: string
): Promise<SyncResult> {
  const apiKey = process.env.CRUNCHBASE_API_KEY
  if (!apiKey) {
    return {
      status: "error",
      error: buildActionableError("Crunchbase", "sync", new Error("CRUNCHBASE_API_KEY not set")),
    }
  }

  try {
    const response = await fetchWithBackoff(
      `https://api.crunchbase.com/api/v4/searches/organizations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-cb-user-key": apiKey,
        },
        body: JSON.stringify({
          field_ids: [
            "identifier",
            "short_description",
            "categories",
            "location_identifiers",
            "founded_on",
            "num_employees_enum",
            "funding_total",
            "last_funding_type",
            "last_funding_at",
            "investor_identifiers",
            "website_url",
            "linkedin",
          ],
          order: [{ field_id: "last_funding_at", sort: "desc" }],
          limit: 50,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Crunchbase API error: ${response.status}`)
    }

    const data = await response.json()
    const entities = data.entities || []
    let synced = 0

    for (const entity of entities) {
      const props = entity.properties || {}
      const content = formatCrunchbaseEntity(props)
      const title = props.identifier?.value || "Unknown Company"

      await indexDocument(content, `crunchbase-${title}`, userId, projectId, "integration")
      synced++
    }

    return { status: "success", companies: synced }
  } catch (error) {
    return {
      status: "error",
      error: buildActionableError("Crunchbase", "sync", error),
    }
  }
}

function formatCrunchbaseEntity(props: any): string {
  const name = props.identifier?.value || "Unknown"
  const desc = props.short_description || ""
  const funding = props.funding_total?.value_usd
    ? `$${(props.funding_total.value_usd / 1_000_000).toFixed(1)}M`
    : "N/A"
  const lastRound = props.last_funding_type || "N/A"
  const employees = props.num_employees_enum || "N/A"
  const categories = (props.categories || []).map((c: any) => c.value).join(", ")
  const investors = (props.investor_identifiers || []).map((i: any) => i.value).join(", ")
  const location = (props.location_identifiers || []).map((l: any) => l.value).join(", ")
  const website = props.website_url || ""

  return `# ${name}

${desc}

## Key Metrics
- **Total Funding**: ${funding}
- **Last Round**: ${lastRound}
- **Last Funded**: ${props.last_funding_at || "N/A"}
- **Employees**: ${employees}
- **Location**: ${location || "N/A"}

## Categories
${categories || "N/A"}

## Investors
${investors || "N/A"}

## Links
- Website: ${website}
- LinkedIn: ${props.linkedin?.value || "N/A"}
`
}

// ============================================================
// APOLLO.IO
// ============================================================

async function syncApollo(
  _credentials: Record<string, any>,
  userId: string,
  projectId?: string
): Promise<SyncResult> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) {
    return {
      status: "error",
      error: buildActionableError("Apollo", "sync", new Error("APOLLO_API_KEY not set")),
    }
  }

  try {
    // Search for recently funded organizations
    const response = await fetchWithBackoff(
      "https://api.apollo.io/v1/mixed_companies/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          page: 1,
          per_page: 50,
          organization_num_employees_ranges: ["1,50", "51,200", "201,1000"],
          sort_by_field: "organization_last_funding_date",
          sort_ascending: false,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`)
    }

    const data = await response.json()
    const organizations = data.organizations || []
    let synced = 0

    for (const org of organizations) {
      const content = formatApolloOrg(org)

      await indexDocument(content, `apollo-${org.name || org.id}`, userId, projectId, "integration")
      synced++
    }

    return { status: "success", companies: synced }
  } catch (error) {
    return {
      status: "error",
      error: buildActionableError("Apollo", "sync", error),
    }
  }
}

function formatApolloOrg(org: any): string {
  return `# ${org.name || "Unknown"}

${org.short_description || ""}

## Company Profile
- **Industry**: ${org.industry || "N/A"}
- **Employees**: ${org.estimated_num_employees || "N/A"}
- **Annual Revenue**: ${org.annual_revenue_printed || "N/A"}
- **Founded**: ${org.founded_year || "N/A"}
- **Location**: ${[org.city, org.state, org.country].filter(Boolean).join(", ") || "N/A"}

## Funding
- **Total Funding**: ${org.total_funding_printed || "N/A"}
- **Latest Funding**: ${org.latest_funding_stage || "N/A"}
- **Latest Funding Round Size**: ${org.latest_funding_round_amount_printed || "N/A"}

## Technology
${(org.technologies || []).join(", ") || "N/A"}

## Links
- Website: ${org.website_url || "N/A"}
- LinkedIn: ${org.linkedin_url || "N/A"}
- Phone: ${org.phone || "N/A"}
`
}

// ============================================================
// OAUTH URL GENERATION
// ============================================================

export function getOAuthUrl(
  integrationName: string,
  userId: string
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const state = createSignedState({
    userId,
    integration: integrationName,
  })

  switch (integrationName) {
    case "google_workspace": {
      const googleClientId = process.env.GOOGLE_CLIENT_ID
      const googleRedirectUri = `${baseUrl}/api/integrations/google_workspace/callback`
      const scopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ].join(" ")

      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(googleRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`
    }

    case "gmail": {
      const googleClientId = process.env.GOOGLE_CLIENT_ID
      const gmailRedirectUri = `${baseUrl}/api/integrations/gmail/callback`
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
      ].join(" ")

      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(gmailRedirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`
    }

    case "hubspot": {
      const hubspotClientId = process.env.HUBSPOT_CLIENT_ID
      const hubspotRedirectUri = `${baseUrl}/api/integrations/hubspot/callback`
      const hubspotScopes =
        "crm.objects.companies.read crm.objects.contacts.read crm.objects.deals.read"

      return `https://app.hubspot.com/oauth/authorize?client_id=${hubspotClientId}&redirect_uri=${encodeURIComponent(hubspotRedirectUri)}&scope=${encodeURIComponent(hubspotScopes)}&state=${state}`
    }

    case "salesforce": {
      const sfClientId = process.env.SALESFORCE_CLIENT_ID
      const sfRedirectUri = `${baseUrl}/api/integrations/salesforce/callback`
      const sfScope = "api refresh_token"

      return `https://login.salesforce.com/services/oauth2/authorize?client_id=${sfClientId}&redirect_uri=${encodeURIComponent(sfRedirectUri)}&response_type=code&scope=${encodeURIComponent(sfScope)}&state=${state}&code_challenge=challenge&code_challenge_method=plain`
    }

    default:
      throw new Error(`Unknown integration: ${integrationName}`)
  }
}

// ============================================================
// OAUTH CODE EXCHANGE
// ============================================================

export async function exchangeOAuthCode(
  integrationName: string,
  code: string,
  _state: string
): Promise<OAuthTokens> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  switch (integrationName) {
    case "google_workspace":
    case "gmail": {
      const callbackPath =
        integrationName === "gmail"
          ? "/api/integrations/gmail/callback"
          : "/api/integrations/google_workspace/callback"

      const response = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            redirect_uri: `${baseUrl}${callbackPath}`,
            grant_type: "authorization_code",
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(
          `Google OAuth token exchange failed: ${errorData}`
        )
      }

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      }
    }

    case "hubspot": {
      const response = await fetch(
        "https://api.hubapi.com/oauth/v1/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.HUBSPOT_CLIENT_ID || "",
            client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
            redirect_uri: `${baseUrl}/api/integrations/hubspot/callback`,
            code,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(
          `HubSpot OAuth token exchange failed: ${errorData}`
        )
      }

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      }
    }

    case "salesforce": {
      const response = await fetch(
        "https://login.salesforce.com/services/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.SALESFORCE_CLIENT_ID || "",
            client_secret: process.env.SALESFORCE_CLIENT_SECRET || "",
            redirect_uri: `${baseUrl}/api/integrations/salesforce/callback`,
            code,
            code_verifier: "challenge",
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(
          `Salesforce OAuth token exchange failed: ${errorData}`
        )
      }

      const data = await response.json()
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 7200,
      }
    }

    default:
      throw new Error(`Unknown integration: ${integrationName}`)
  }
}

// ============================================================
// TRIGGER SYNC (Main Entry Point)
// ============================================================

export async function triggerSync(
  integrationName: string,
  credentials: Record<string, any>,
  userId?: string,
  projectId?: string,
  metadata?: IntegrationMetadata
): Promise<SyncResult> {
  switch (integrationName) {
    case "google_workspace":
      return syncGoogleWorkspace(credentials, userId, projectId, metadata)
    case "gmail":
      return syncGmail(credentials, userId, projectId, metadata)
    case "hubspot":
      return syncHubspot(credentials, userId, projectId, metadata)
    case "salesforce":
      return syncSalesforce(credentials, userId, projectId)
    case "crunchbase":
      return syncCrunchbase(credentials, userId || "", projectId)
    case "apollo":
      return syncApollo(credentials, userId || "", projectId)
    default:
      throw new Error(`Unknown integration: ${integrationName}`)
  }
}
