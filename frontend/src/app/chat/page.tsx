"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Send, Upload, FileText, Zap, TrendingUp, Users, DollarSign, Building2, Plus, Trash2, Loader2, X, File, MessageSquare } from "lucide-react"
import { apiClient } from "@/lib/api"
import Link from "next/link"

interface Message {
  id?: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  sources?: any[]
}

interface DealCard {
  id: string
  name: string
  description: string
  stage: string
  industry: string
  funding: string
  employees: string
  growth: string
  icon: string
  color: string
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

const sampleDeals: DealCard[] = [
  {
    id: "1",
    name: "NeuralFlow AI",
    description: "Next-gen ML infrastructure for enterprises",
    stage: "Series A",
    industry: "AI/ML",
    funding: "$12M",
    employees: "24 people",
    growth: "+340%",
    icon: "🤖",
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "2", 
    name: "QuantumLeap",
    description: "Quantum computing as a service",
    stage: "Seed",
    industry: "Deep Tech",
    funding: "$4.5M",
    employees: "12 people",
    growth: "+180%",
    icon: "⚛️",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "3",
    name: "HealthSync",
    description: "AI-powered healthcare coordination",
    stage: "Series B",
    industry: "Healthcare",
    funding: "$28M",
    employees: "67 people",
    growth: "+220%",
    icon: "🏥",
    color: "from-emerald-500 to-teal-500"
  },
  {
    id: "4",
    name: "FinEdge",
    description: "Embedded finance for SMBs",
    stage: "Series A",
    industry: "FinTech",
    funding: "$15M",
    employees: "34 people",
    growth: "+290%",
    icon: "💳",
    color: "from-amber-500 to-orange-500"
  }
]

export default function ChatPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your VC Copilot. I can help you analyze startups using data from PitchBook, AngelList, and Crunchbase. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Chat history state (from RAG-integration)
  const [recentChats, setRecentChats] = useState<ChatSession[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  
  // File upload state (from RAG-integration)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom (from main)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load recent chats and uploaded files on mount (from RAG-integration)
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
        
        // Show success message in chat
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
      // Search for recent messages to get chat sessions
      const result = await apiClient.chat.search("", undefined) as any
      // Extract unique chats from results
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
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm your VC Copilot. I can help you analyze startups using data from PitchBook, AngelList, and Crunchbase. What would you like to know?",
        timestamp: new Date().toISOString()
      }
    ])
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

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await apiClient.chat.sendMessage({ 
        message: input,
        chat_id: currentChatId || undefined,
      })
      
      if (!currentChatId && response.chat_id) {
        setCurrentChatId(response.chat_id)
        loadRecentChats() // Refresh chat list
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: response.response || "I'll help you with that. Once you connect your API keys and upload documents, I'll be able to provide detailed insights from PitchBook, AngelList, and Crunchbase data.",
        timestamp: new Date().toISOString(),
        sources: response.sources,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const assistantMessage: Message = {
        role: "assistant",
        content: "I'll help you with that. Once you connect your API keys and upload documents, I'll be able to provide detailed insights from PitchBook, AngelList, and Crunchbase data.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-screen bg-[#0B1120] text-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">VC Copilot</h1>
            <p className="text-xs text-slate-400">Investment Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* File upload indicator */}
          {uploadedFiles.length > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-400 border border-emerald-500/30">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </span>
          )}
          <Link 
            href="/integrations"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-16">
        {/* Left Panel - Deal Pipeline + Chat History */}
        <div className="w-[420px] border-r border-slate-800 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
          {/* New Chat & Upload Buttons */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".txt,.md,.csv,.json,.pdf,.html,.xml"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
            
            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowFiles(!showFiles)}
                  className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 hover:text-slate-300"
                >
                  <FileText className="h-3 w-3" />
                  {uploadedFiles.length} File{uploadedFiles.length !== 1 ? 's' : ''} Ready
                </button>
                
                {showFiles && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="group flex items-center gap-2 p-2 rounded-md bg-slate-800/50 text-xs"
                      >
                        <File className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-slate-300">{file.filename}</div>
                          <div className="text-slate-500">{formatFileSize(file.file_size)}</div>
                        </div>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                        >
                          <X className="h-3 w-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Chats Section */}
          {recentChats.length > 0 && (
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent Chats</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recentChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentChatId === chat.id ? 'bg-slate-700' : 'hover:bg-slate-800'
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <MessageSquare className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <span className="flex-1 truncate text-sm text-slate-300">{chat.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChat(chat.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deal Pipeline */}
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-cyan-400">Deal Pipeline</h2>
            <p className="text-xs text-slate-400 mt-1">Track and analyze potential investments</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sampleDeals.map((deal) => (
              <div 
                key={deal.id}
                className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${deal.color} flex items-center justify-center text-2xl`}>
                      {deal.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{deal.name}</h3>
                      <p className="text-sm text-slate-400">{deal.description}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                    {deal.stage}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Building2 className="w-4 h-4" />
                    <span>{deal.industry}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <DollarSign className="w-4 h-4" />
                    <span>{deal.funding}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{deal.employees}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>{deal.growth}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - AI Research Assistant */}
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)]">
          {/* Chat Header */}
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white">AI Research Assistant</h2>
            <p className="text-sm text-slate-400 mt-1">Query your deal flow data</p>
            <div className="flex gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
                <FileText className="w-3.5 h-3.5" />
                APIs Ready
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
                <Upload className="w-3.5 h-3.5" />
                Documents
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white"
                      : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Sources display (from RAG-integration) */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="text-xs font-semibold text-slate-400 mb-1">Sources:</div>
                      <div className="text-xs text-slate-400 space-y-1">
                        {message.sources.map((source: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span>{source.source || source.name || `Source ${i + 1}`}</span>
                            {source.similarity && (
                              <span className="text-slate-500">
                                ({(source.similarity * 100).toFixed(0)}% match)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl border border-slate-700 p-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-50"
                title="Upload document"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about startups, market trends, or competitor analysis..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
