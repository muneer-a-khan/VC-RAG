/**
 * API Client for Next.js API Routes
 * All requests go to the same-origin Next.js API endpoints
 */

// Helper function for making API requests
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${endpoint}`
  
  const response = await fetch(url, {
    ...options,
  headers: {
    "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login"
      throw new Error("Unauthorized")
    }
    
    const error = await response.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// API client functions
export const apiClient = {
  // Auth (handled by NextAuth, but keeping for compatibility)
  auth: {
    register: (data: { email: string; password: string; full_name: string; organization?: string }) =>
      fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => fetchApi("/user"),
  },

  // Chat
  chat: {
    list: (projectId?: string) => {
      const params = new URLSearchParams()
      if (projectId) params.append("project_id", projectId)
      const query = params.toString()
      return fetchApi<Array<{
        id: string
        title: string | null
        project_id: string | null
        message_count: number
        last_message: string | null
        created_at: string
        updated_at: string
      }>>(`/chats${query ? `?${query}` : ""}`)
    },
    sendMessage: (data: { message: string; chat_id?: string; project_id?: string }) =>
      fetchApi<{ chat_id: string; response: string; message_id: string; sources?: any[] }>("/chat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createNew: (data: { title?: string; project_id?: string }) =>
      fetchApi<{ chat_id: string; title: string; project_id: string | null; created_at: string }>("/chat/new", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (chatId: string) =>
      fetchApi(`/chat/${chatId}`),
    getHistory: (chatId: string) =>
      fetchApi(`/chat/history/${chatId}`),
    search: (query: string, projectId?: string) => {
      const params = new URLSearchParams({ query })
      if (projectId) params.append("project_id", projectId)
      return fetchApi(`/chat/search?${params}`)
    },
    delete: (chatId: string) =>
      fetchApi(`/chat/${chatId}`, { method: "DELETE" }),
  },

  // Projects
  projects: {
    list: () =>
      fetchApi<Array<{
        id: string
        name: string
        description: string | null
        type: string
        created_at: string
        updated_at: string
        document_count: number
        chat_count: number
      }>>("/projects"),
    create: (data: { name: string; description?: string; type?: string }) =>
      fetchApi<{ id: string; name: string; description: string | null; type: string; created_at: string }>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) =>
      fetchApi(`/projects/${id}`),
    update: (id: string, data: { name?: string; description?: string; type?: string; metadata?: Record<string, any> }) =>
      fetchApi(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi(`/projects/${id}`, { method: "DELETE" }),
    
    // Files
    listFiles: (projectId: string) =>
      fetchApi(`/projects/${projectId}/files`),
    uploadFiles: async (projectId: string, files: FileList | File[]) => {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append("files", file))
      
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Upload failed" }))
        throw new Error(error.detail)
      }
      
      return response.json()
    },
    
    // Intelligence
    getIntelligence: (projectId: string) =>
      fetchApi(`/projects/${projectId}/intelligence`),
  },

  // Integrations
  integrations: {
    list: () =>
      fetchApi<Array<{
        name: string
        display_name: string
        description: string
        icon: string
        connected: boolean
        status: string | null
        last_sync: string | null
        sync_status: string | null
        integration_id: string | null
      }>>("/integrations"),
    get: (toolName: string) =>
      fetchApi(`/integrations/${toolName}`),
    getAuthUrl: (toolName: string) =>
      fetchApi<{ auth_url: string; state: string }>(`/integrations/${toolName}/auth-url`),
    callback: (toolName: string, code: string, state: string) =>
      fetchApi(`/integrations/${toolName}/callback`, {
        method: "POST",
        body: JSON.stringify({ code, state }),
      }),
    sync: (toolName: string) =>
      fetchApi(`/integrations/${toolName}/sync`, { method: "POST" }),
    disconnect: (toolName: string) =>
      fetchApi(`/integrations/${toolName}`, { method: "DELETE" }),
  },

  // User
  user: {
    get: () => fetchApi("/user"),
  },
}

export default apiClient
