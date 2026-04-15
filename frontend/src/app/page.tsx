"use client"

import { useState, useEffect, useRef } from "react"
import { signIn, useSession } from "next-auth/react"
import { apiClient } from "@/lib/api"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

interface Message {
  id?: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  sources?: any[]
}

interface ChatSession {
  id: string
  title: string
  project_id?: string
  created_at: string
}

interface UploadedFile {
  id: string
  filename: string
  file_type: string
  file_size: number
  status: string
  created_at: string
}

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

async function loadGapiScript() {
  if (typeof window === "undefined") return
  if (window.gapi && window.google?.picker) return

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://apis.google.com/js/api.js"]'
    )
    if (existing) {
      existing.addEventListener("load", () => resolve())
      return
    }

    const s = document.createElement("script")
    s.src = "https://apis.google.com/js/api.js"
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load Google API script"))
    document.body.appendChild(s)
  })
}

function isGoogleNativeMime(mimeType: string) {
  return mimeType?.startsWith("application/vnd.google-apps")
}

function exportMimeForGoogleNative(mimeType: string) {
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return { exportMime: "text/csv", extension: "csv" }
  }
  if (mimeType === "application/vnd.google-apps.presentation") {
    return { exportMime: "application/pdf", extension: "pdf" }
  }
  return { exportMime: "application/pdf", extension: "pdf" }
}

export default function HomePage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [recentChats, setRecentChats] = useState<ChatSession[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDrivePicking, setIsDrivePicking] = useState(false)
  const [isDeepMode, setIsDeepMode] = useState(false)
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadRecentChats()
    loadUploadedFiles()
  }, [])

  async function loadUploadedFiles() {
    try {
      const response = await fetch('/api/chat/upload')
      if (response.ok) {
        const data = await response.json()
        setUploadedFiles(data.files || [])
      }
    } catch (error) {
      console.error("Failed to load uploaded files:", error)
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => formData.append('files', file))

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        await loadUploadedFiles()
        
        const uploadMessage: Message = {
          role: "assistant",
          content: `Successfully uploaded ${data.files_uploaded} file(s). You can now ask questions about the content of these files.${data.errors?.length ? `\n\nWarnings:\n${data.errors.join('\n')}` : ''}`,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, uploadMessage])
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: `Failed to upload files: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function deleteFile(fileId: string) {
    try {
      const response = await fetch(`/api/chat/upload?id=${fileId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      }
    } catch (error) {
      console.error("Failed to delete file:", error)
    }
  }

  async function loadRecentChats() {
    try {
      setLoadingChats(true)
      const result = await apiClient.chat.search("", undefined) as any
      const chatsMap = new Map<string, ChatSession>()
      if (result.results) {
        for (const msg of result.results) {
          if (!chatsMap.has(msg.chat_id)) {
            chatsMap.set(msg.chat_id, {
              id: msg.chat_id,
              title: msg.chat_title || "Untitled Chat",
              project_id: msg.project_id,
              created_at: msg.created_at,
            })
          }
        }
      }
      setRecentChats(Array.from(chatsMap.values()).slice(0, 10))
    } catch (error) {
      console.error("Failed to load recent chats:", error)
    } finally {
      setLoadingChats(false)
    }
  }

  async function loadChat(chatId: string) {
    try {
      setIsLoading(true)
      const chat = await apiClient.chat.getHistory(chatId) as any
      setCurrentChatId(chatId)
      setMessages(
        chat.messages?.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
          sources: m.sources,
        })) || []
      )
    } catch (error) {
      console.error("Failed to load chat:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function startNewChat() {
    setCurrentChatId(null)
    setMessages([])
  }

  async function deleteChat(chatId: string) {
    try {
      await apiClient.chat.delete(chatId)
      if (currentChatId === chatId) {
        startNewChat()
      }
      setRecentChats(prev => prev.filter(c => c.id !== chatId))
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  async function uploadBlobsAsFiles(files: Array<{ filename: string; blob: Blob }>) {
    const formData = new FormData()
    for (const f of files) {
      const fileObj = new File([f.blob], f.filename, {
        type: f.blob.type || "application/octet-stream",
      })
      formData.append("files", fileObj)
    }

    const response = await fetch("/api/chat/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.detail || "Upload failed")
    }

    return await response.json()
  }

  async function downloadDriveFile(
    accessToken: string,
    file: { id: string; name: string; mimeType: string }
  ) {
    const headers = { Authorization: `Bearer ${accessToken}` }

    if (isGoogleNativeMime(file.mimeType)) {
      const { exportMime, extension } = exportMimeForGoogleNative(file.mimeType)
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        file.id
      )}/export?mimeType=${encodeURIComponent(exportMime)}`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`Failed to export ${file.name}`)
      const blob = await res.blob()
      const filename = file.name.endsWith(`.${extension}`) ? file.name : `${file.name}.${extension}`
      return { filename, blob }
    }

    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`Failed to download ${file.name}`)
    const blob = await res.blob()
    return { filename: file.name, blob }
  }

  async function openDrivePicker() {
    const accessToken = (session as any)?.accessToken
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

    if (!apiKey) {
      alert("Missing NEXT_PUBLIC_GOOGLE_API_KEY in env")
      return
    }

    if (!accessToken) {
      const should = confirm("To import from Google Drive, you need to sign in with Google. Continue?")
      if (should) {
        await signIn("google", { callbackUrl: "/" })
      }
      return
    }

    setIsDrivePicking(true)

    try {
      await loadGapiScript()

      window.gapi.load("picker", () => {
        const google = window.google

        const view = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true)

        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setCallback(async (data: any) => {
            if (data.action === google.picker.Action.CANCEL) {
              setIsDrivePicking(false)
              return
            }
            if (data.action !== google.picker.Action.PICKED) return

            const picked = (data.docs || []).map((d: any) => ({
              id: d.id,
              name: d.name,
              mimeType: d.mimeType,
            }))

            if (!picked.length) {
              setIsDrivePicking(false)
              return
            }

            setIsUploading(true)

            try {
              const blobs: Array<{ filename: string; blob: Blob }> = []
              for (const f of picked) {
                blobs.push(await downloadDriveFile(accessToken, f))
              }

              const result = await uploadBlobsAsFiles(blobs)
              await loadUploadedFiles()

              const uploadMessage: Message = {
                role: "assistant",
                content: `Successfully imported ${result.files_uploaded ?? blobs.length} file(s) from Google Drive. You can now ask questions about the content of these files.${
                  result.errors?.length ? `\n\nWarnings:\n${result.errors.join("\n")}` : ""
                }`,
                timestamp: new Date().toISOString(),
              }
              setMessages((prev) => [...prev, uploadMessage])
            } catch (err: any) {
              console.error("Drive import error:", err)
              const errorMessage: Message = {
                role: "assistant",
                content: `Failed to import from Google Drive: ${err.message || "Unknown error"}`,
                timestamp: new Date().toISOString(),
              }
              setMessages((prev) => [...prev, errorMessage])
            } finally {
              setIsUploading(false)
              setIsDrivePicking(false)
            }
          })
          .build()

        picker.setVisible(true)
      })
    } catch (e) {
      console.error(e)
      setIsDrivePicking(false)
      alert("Failed to open Google Drive picker")
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput("")
    setIsLoading(true)

    const placeholderMessage: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, placeholderMessage])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userInput,
          chat_id: isHistoryEnabled ? (currentChatId || undefined) : undefined,
          stream: true,
          mode: isDeepMode ? "deep" : "fast",
          history_enabled: isHistoryEnabled,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
        let streamSources: any[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          const lines = text.split("\n")

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const event = JSON.parse(jsonStr)

              if (event.type === "metadata") {
                if (isHistoryEnabled && !currentChatId && event.chat_id) {
                  setCurrentChatId(event.chat_id)
                  loadRecentChats()
                }
                streamSources = event.sources || []
              } else if (event.type === "text") {
                accumulated += event.content
                setMessages(prev => {
                  const updated = [...prev]
                  const lastMsg = updated[updated.length - 1]
                  if (lastMsg && lastMsg.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: accumulated,
                      sources: streamSources,
                    }
                  }
                  return updated
                })
              } else if (event.type === "done") {
                setMessages(prev => {
                  const updated = [...prev]
                  const lastMsg = updated[updated.length - 1]
                  if (lastMsg && lastMsg.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      id: event.message_id,
                      content: accumulated,
                      sources: streamSources,
                    }
                  }
                  return updated
                })
              } else if (event.type === "error") {
                accumulated += event.content || "\n\nAn error occurred."
                setMessages(prev => {
                  const updated = [...prev]
                  const lastMsg = updated[updated.length - 1]
                  if (lastMsg && lastMsg.role === "assistant") {
                    updated[updated.length - 1] = { ...lastMsg, content: accumulated }
                  }
                  return updated
                })
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } else {
        const data = await response.json()

        if (isHistoryEnabled && !currentChatId && data.chat_id) {
          setCurrentChatId(data.chat_id)
          loadRecentChats()
        }

        setMessages(prev => {
          const updated = [...prev]
          const lastMsg = updated[updated.length - 1]
          if (lastMsg && lastMsg.role === "assistant") {
            updated[updated.length - 1] = {
              ...lastMsg,
              id: data.message_id,
              content: data.response || "I couldn't generate a response. Please try uploading some documents first.",
              sources: data.sources,
            }
          }
          return updated
        })
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => {
        const updated = [...prev]
        const lastMsg = updated[updated.length - 1]
        if (lastMsg && lastMsg.role === "assistant") {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: "I encountered an error processing your request. Please try again, or upload documents to get started.",
          }
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasConversation = messages.length > 0

  return (
    <div className="bg-[#212121] text-white h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-0' : 'w-[260px]'} flex flex-col bg-[#171717] transition-all duration-300 overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-2 flex items-center justify-between">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={startNewChat}
            className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors"
            title="New chat"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-2 mb-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-[#2f2f2f] rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Search chats</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="px-2 space-y-1">
          <Link href="/projects" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2f2f2f] rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Projects</span>
          </Link>
          <Link href="/integrations" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2f2f2f] rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Integrations</span>
          </Link>
          <button
            onClick={() => setIsDeepMode(!isDeepMode)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${isDeepMode ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-[#2f2f2f]'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2a10 10 0 110 20 10 10 0 010-20z" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Deep Research</span>
            {isDeepMode && <span className="ml-auto text-xs bg-purple-500/20 px-1.5 py-0.5 rounded">ON</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 my-4 border-t border-[#2f2f2f]"></div>

        {/* Projects Section */}
        <div className="px-2">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</div>
          <Link href="/projects" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-[#2f2f2f] rounded-lg transition-colors">
            <span className="w-5 h-5 flex items-center justify-center rounded bg-blue-500/20 text-blue-400 text-xs">+</span>
            <span>New project</span>
          </Link>
        </div>

        {/* Recents Section */}
        <div className="px-2 mt-4 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Recents</div>
          {loadingChats ? (
            <div className="px-3 py-4 text-gray-500 text-sm">Loading...</div>
          ) : recentChats.length === 0 ? (
            <div className="px-3 py-4 text-gray-500 text-sm">No recent chats</div>
          ) : (
            recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`w-full group flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                  currentChatId === chat.id ? 'bg-[#2f2f2f] text-white' : 'text-gray-300 hover:bg-[#2f2f2f]'
                }`}
              >
                <span className="truncate flex-1">{chat.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteChat(chat.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400 hover:text-red-400">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </button>
            ))
          )}
        </div>

        {/* User Section */}
        <div className="p-2 border-t border-[#2f2f2f]">
          {session?.user ? (
            <div className="flex items-center gap-3 px-3 py-2 hover:bg-[#2f2f2f] rounded-lg cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                {session.user.name?.[0] || session.user.email?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{session.user.name || 'User'}</div>
                <div className="text-xs text-gray-500">Free</div>
              </div>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-3 px-3 py-2 hover:bg-[#2f2f2f] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm text-gray-300">Sign in</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Collapsed Sidebar Toggle */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute top-3 left-3 p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors z-10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            {sidebarCollapsed && <div className="w-10"></div>}
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2f2f2f] rounded-lg transition-colors">
              <span className="text-white font-medium">VC Copilot</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-300 hover:bg-[#2f2f2f] rounded-lg transition-colors border border-[#424242]">
              Free offer
            </button>
          </div>
        </div>

        {/* Chat Area */}
        {!hasConversation ? (
          /* Empty State - Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <h1 className="text-3xl font-medium text-white mb-8">What are you working on?</h1>
            
            {/* Input Area */}
            <div className="w-full max-w-[680px]">
              <div className="relative bg-[#2f2f2f] rounded-3xl border border-[#424242] overflow-hidden">
                <div className="flex items-center px-4 py-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-[#424242] rounded-full transition-colors"
                    title="Attach file"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none px-3 py-2 text-base"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#424242] rounded-full transition-colors" title="Voice input">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="p-2 bg-white hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-black">
                        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3a3a3a] rounded-full text-sm text-gray-300 transition-colors border border-[#424242]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload files
                </button>
                <button
                  onClick={() => setInput("Help me analyze a startup pitch deck")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3a3a3a] rounded-full text-sm text-gray-300 transition-colors border border-[#424242]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <path d="M12 20h9M12 4h9M3 4v16l6-4 6 4V4l-6 4-6-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Analyze a deal
                </button>
                <button
                  onClick={openDrivePicker}
                  disabled={isDrivePicking || isUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2f2f2f] hover:bg-[#3a3a3a] rounded-full text-sm text-gray-300 transition-colors border border-[#424242] disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Import from Drive
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Conversation View */
          <>
            <div className="flex-1 overflow-y-auto px-4 pb-32">
              <div className="max-w-[680px] mx-auto space-y-6 pt-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'bg-[#2f2f2f] rounded-3xl px-5 py-3' : ''}`}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({children}) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
                              h2: ({children}) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-semibold mb-1 mt-2">{children}</h3>,
                              p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
                              ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                              li: ({children}) => <li className="ml-4">{children}</li>,
                              strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                              code: ({children}) => <code className="bg-[#2f2f2f] px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                              pre: ({children}) => <pre className="bg-[#2f2f2f] p-4 rounded-lg text-sm overflow-x-auto mb-3">{children}</pre>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-white">{message.content}</p>
                      )}
                      
                      {message.sources && message.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.sources.map((source: any, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#2f2f2f] text-xs text-gray-300"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              {source.source || source.name || `Source ${i + 1}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white text-sm font-medium">
                        {session?.user?.name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 py-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Input for Conversation */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-8">
              <div className="max-w-[680px] mx-auto">
                <div className="relative bg-[#2f2f2f] rounded-3xl border border-[#424242] overflow-hidden">
                  <div className="flex items-center px-4 py-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 hover:bg-[#424242] rounded-full transition-colors"
                      title="Attach file"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message VC Copilot..."
                      className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none px-3 py-2 text-base"
                      disabled={isLoading}
                    />
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-[#424242] rounded-full transition-colors" title="Voice input">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-white hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-black">
                          <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-2">
                  AI can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept=".txt,.md,.csv,.json,.pdf,.html,.xml"
          className="hidden"
        />
      </main>
    </div>
  )
}
