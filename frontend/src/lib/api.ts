import axios from "axios"
import { getSession } from "next-auth/react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
})

// Add auth token from NextAuth session to requests
api.interceptors.request.use(async (config) => {
  // Client-side: get session from NextAuth
  if (typeof window !== "undefined") {
    const session = await getSession()
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`
    }
  }
  return config
})

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Redirect to login on unauthorized
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

// API client functions
export const apiClient = {
  // Auth
  auth: {
    register: (data: { email: string; password: string; full_name: string; organization?: string }) =>
      api.post("/auth/register", data),
    login: (data: { username: string; password: string }) =>
      api.post("/auth/login", data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    me: () => api.get("/auth/me"),
    logout: () => api.post("/auth/logout"),
  },

  // Chat
  chat: {
    sendMessage: (data: { message: string; chat_id?: string; project_id?: string }) =>
      api.post("/chat/message", data),
    createNew: (data: { title?: string; project_id?: string }) =>
      api.post("/chat/new", data),
    getHistory: (chatId: string) => api.get(`/chat/history/${chatId}`),
    search: (query: string, projectId?: string) =>
      api.get("/chat/search", { params: { query, project_id: projectId } }),
  },

  // Projects
  projects: {
    list: () => api.get("/projects"),
    create: (data: { name: string; description?: string; type?: string }) =>
      api.post("/projects", data),
    get: (id: string) => api.get(`/projects/${id}`),
    uploadFiles: (projectId: string, files: FormData) =>
      api.post(`/projects/${projectId}/files`, files, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    getIntelligence: (projectId: string) => api.get(`/projects/${projectId}/intelligence`),
    delete: (id: string) => api.delete(`/projects/${id}`),
  },

  // Integrations
  integrations: {
    list: () => api.get("/integrations"),
    getAuthUrl: (toolName: string) => api.get(`/integrations/${toolName}/auth-url`),
    callback: (toolName: string, code: string, state: string) =>
      api.post(`/integrations/${toolName}/callback`, { code, state }),
    sync: (integrationId: string) => api.post(`/sync/${integrationId}`),
    disconnect: (integrationId: string) => api.delete(`/integrations/${integrationId}`),
  },
}

export default api

