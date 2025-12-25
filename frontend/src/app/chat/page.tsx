"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
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

interface DealCard {
  id: string
  name: string
  description: string
  stage: string
  industry: string
  arr: string
  growth: string
  icon: string
  stageColor: string
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
    name: "Acme AI",
    description: "Generative AI for Legal Tech",
    stage: "SERIES A",
    industry: "AI/ML",
    arr: "$2M ARR",
    growth: "120% YoY",
    icon: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCVSIm9ZOktB0Ttl6ZQThi75nsHX7HKu9m4ulAanKTTT-bEQSg1HEVJnJo3_kmJARxRinSRHb0b9v4o92FOwK1FO7VTGz43EY-z4ojdyDG9xH_e-aO9rXkLaHOYHUOOda1hyNKJrP_Ne3oJ1dRk4cP01ryPOUaV0cQnHHj2lEItyAU6kjuJyuupuIT_ZUVB1x7OG2KoSYBRCU2bn6yf1cwoJp8zuYGbASgYZ_WDZ8lqczZX92Y6x-HFReHqIGIQ1UmF-OWFW4vcfNg",
    stageColor: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  },
  {
    id: "2",
    name: "HealthFlow",
    description: "Patient monitoring platform",
    stage: "SEED",
    industry: "Healthcare",
    arr: "$150k ARR",
    growth: "Pre-Rev",
    icon: "https://lh3.googleusercontent.com/aida-public/AB6AXuAr_N9y_waynOBkcO9lSgXq09q4-PDxYQMLIh-Q0boLDGTtuU-XYDhyv_2--oTzDQoQbH_AiTwzpheQkkjcj3W9WbY_vD60G0yW1h6uumvcPlRvBwILSDbXmHECPWwlf1r4KCi_LbRvS4N8CG0hk8Q2-ZiK1k1NHKJ_9Kjoz7BwWcxnMqEI2adKgqpOJdNFgLL89b76fd_noRRysreP2Ysnac7CNuBw3nkswO8bTLNM3COwmMAfSo4TxMPs3FiMS7g5flcHIhZTO897",
    stageColor: "bg-green-500/20 text-green-400 border-green-500/20",
  },
  {
    id: "3",
    name: "BlockSafe",
    description: "Web3 security infrastructure",
    stage: "SERIES B",
    industry: "Web3",
    arr: "$8M ARR",
    growth: "Strong Burn",
    icon: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ3A-c0Io2BMQgPC8XM_NE3X1hjZGXiIbyLlwUbHcIYiUdmJBSgRpWeNDyk0wUDGgbdc5hMx9f-fgQuFhRktnHEA690hWRfnZn89tDy4YkP2RsGrmqFhDLpnATN8x1b7mVGMJUdJ5spGmeXOMKh7PPmjq7DsPq6ub3l9y6HMf6NMa_bxAtMRv7ZKFq8oSpdQ8F29AQijQDcHI4GCnqeozmyhKdwOf8Vp8m8OfFgk9kECRJWukHDZbaFiDENIBUCbWcaWWn5wTS7ktq",
    stageColor: "bg-purple-500/20 text-purple-400 border-purple-500/20",
  },
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
  const [activeTab, setActiveTab] = useState<"pipeline" | "history">("pipeline")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [recentChats, setRecentChats] = useState<ChatSession[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        loadRecentChats()
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
    <div className="bg-[#0B1120] text-white font-display h-screen flex flex-col overflow-hidden antialiased selection:bg-primary/30 selection:text-white">
      {/* Header */}
      <header className="h-16 shrink-0 flex items-center justify-between border-b border-[#1f2937] bg-[#111827] px-6 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
            </div>
            <h1 className="text-white text-lg font-bold tracking-tight">VC Copilot</h1>
          </Link>
          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20 ml-2">
            <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-medium text-green-500 uppercase tracking-wider">Online</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/chat" className="text-white text-sm font-medium transition-colors">Dashboard</Link>
            <Link href="/chat" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Deals</Link>
            <Link href="/projects" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Projects</Link>
            <Link href="/integrations" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Integrations</Link>
          </nav>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border border-[#111827]"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
            <div className="size-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-[#111827] cursor-pointer" title="User Profile"></div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (420px) */}
        <aside className="w-[420px] flex flex-col bg-[#111827] border-r border-[#1f2937] shrink-0 z-10">
          {/* Action Area */}
          <div className="p-5 flex flex-col gap-5">
            <button
            onClick={startNewChat}
              className="group flex w-full items-center justify-center gap-3 bg-primary hover:bg-blue-600 text-white h-12 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">add_comment</span>
              <span>New Analysis</span>
            </button>
            
            {/* Segmented Control */}
            <div className="flex p-1 bg-[#1F2937] rounded-lg">
                <button
                onClick={() => setActiveTab("pipeline")}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-all ${
                  activeTab === "pipeline"
                    ? "bg-[#111827] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Pipeline
                </button>
                        <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-all ${
                  activeTab === "history"
                    ? "bg-[#111827] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                History
                        </button>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {activeTab === "pipeline" ? (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Deals</p>
            {sampleDeals.map((deal) => (
              <div 
                key={deal.id}
                    className="group relative flex gap-4 p-4 rounded-xl bg-[#1F2937]/50 hover:bg-[#1F2937] border border-transparent hover:border-gray-700 cursor-pointer transition-all"
                  >
                    <div
                      className="shrink-0 size-12 rounded-lg bg-gray-800 bg-center bg-cover border border-gray-700"
                      style={{ backgroundImage: `url('${deal.icon}')` }}
                    ></div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="text-white font-semibold truncate">{deal.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${deal.stageColor}`}>
                    {deal.stage}
                  </span>
        </div>
                      <p className="text-gray-400 text-xs truncate mb-2">{deal.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">attach_money</span>
                          {deal.arr}
                        </span>
                        <span className="size-1 rounded-full bg-gray-600"></span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">trending_up</span>
                          {deal.growth}
                        </span>
                      </div>
                  </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Chats</p>
                {loadingChats ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="material-symbols-outlined text-2xl text-gray-500 animate-spin">progress_activity</span>
                  </div>
                ) : recentChats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No chat history yet
                  </div>
                ) : (
                  recentChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        currentChatId === chat.id
                          ? "bg-[#1F2937] border border-gray-700"
                          : "hover:bg-[#1F2937]/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-gray-500">chat_bubble</span>
                      <span className="flex-1 truncate text-sm text-gray-300">{chat.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                      >
                        <span className="material-symbols-outlined text-sm text-red-400">close</span>
                      </button>
                </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Upload Area */}
          <div className="p-5 border-t border-[#1f2937] bg-[#111827]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Context Files</p>
            <div className="flex flex-col gap-2">
              {/* File Items */}
              {uploadedFiles.slice(0, 2).map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-gray-700 group transition-all"
                >
                  <div className="size-8 rounded flex items-center justify-center bg-red-500/10 text-red-500">
                    <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-300 truncate">{file.filename}</p>
                    <p className="text-[10px] text-gray-500">{formatFileSize(file.file_size)}</p>
                  </div>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
              
              {/* Dropzone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".txt,.md,.csv,.json,.pdf,.html,.xml"
                className="hidden"
              />
              <label
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-800/20 hover:bg-gray-800/50 hover:border-primary/50 transition-all group"
              >
                <div className="flex flex-col items-center justify-center pt-2 pb-3">
                  {isUploading ? (
                    <span className="material-symbols-outlined text-gray-500 group-hover:text-primary mb-1 animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-gray-500 group-hover:text-primary mb-1 transition-colors">cloud_upload</span>
                  )}
                  <p className="text-xs text-gray-500 group-hover:text-gray-300">
                    <span className="font-semibold">{isUploading ? 'Uploading...' : 'Click to upload'}</span> or drag and drop
                  </p>
                </div>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col relative min-w-0 bg-[#0B1120]">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
            {/* Date Separator */}
            <div className="flex justify-center">
              <span className="text-xs font-medium text-gray-600 bg-[#111827]/50 px-3 py-1 rounded-full border border-gray-800">
                Today
              </span>
            </div>

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "flex-row-reverse" : "flex-row"} items-start gap-3`}>
                {/* Avatar */}
                {message.role === "user" ? (
                  <div className="size-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 border border-gray-600">
                    <span className="material-symbols-outlined text-sm text-gray-300">person</span>
                  </div>
                ) : (
                  <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 mt-1">
                    <span className="material-symbols-outlined text-sm text-white">auto_awesome</span>
                  </div>
                )}

                {/* Message Content */}
                <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} gap-2 max-w-[85%]`}>
                  <div
                    className={`px-5 py-3.5 ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md"
                        : "bg-[#1F2937] text-gray-100 rounded-2xl rounded-tl-sm border border-gray-800 shadow-sm"
                    }`}
                  >
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2 mt-4">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                          p: ({children}) => <p className="mb-2 text-sm leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-300">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-300">{children}</ol>,
                          li: ({children}) => <li className="ml-4">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          code: ({children}) => <code className="bg-gray-700 px-1 py-0.5 rounded text-xs font-mono text-green-400">{children}</code>,
                          pre: ({children}) => <pre className="bg-gray-700 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-primary pl-4 italic my-2">{children}</blockquote>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {message.sources.map((source: any, i: number) => (
                        <button
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-colors text-xs text-blue-400 font-medium group"
                        >
                          <span className="material-symbols-outlined text-[14px] group-hover:text-blue-300">description</span>
                          {source.source || source.name || `Source ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                              </div>
                            ))}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex flex-row items-end gap-3">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-sm text-white">auto_awesome</span>
                          </div>
                <div className="bg-[#1F2937] px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-800">
                  <div className="flex gap-1.5 items-center h-4">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
              </div>
            )}

            {/* Spacer for bottom input */}
            <div className="h-24"></div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0B1120] via-[#0B1120] to-transparent pt-12 z-10">
            <div className="max-w-4xl mx-auto relative glass-effect rounded-2xl border border-gray-700 shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/50 bg-gray-900/30">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
                  title="Attach File"
                >
                  <span className="material-symbols-outlined text-[18px]">attach_file</span>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors" title="Format Text">
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                </button>
                <div className="w-px h-4 bg-gray-700/50 mx-1"></div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors">
                  <span className="material-symbols-outlined text-[14px] text-blue-400">psychology</span>
                  <span className="text-[10px] font-medium text-blue-400 uppercase">Deep Analysis Mode</span>
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full bg-transparent border-0 text-white placeholder-gray-500 focus:ring-0 resize-none py-3 px-4 min-h-[52px] max-h-[200px] text-sm leading-relaxed"
                  placeholder="Ask about the deal, financials, or market risks..."
                  rows={1}
                  disabled={isLoading}
                />
                {/* Send Button */}
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="flex items-center justify-center size-9 bg-primary hover:bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-[10px] text-gray-500">AI can make mistakes. Verify important financial data.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
