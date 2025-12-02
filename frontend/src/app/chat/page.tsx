"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { Send, Plus, MessageSquare, Trash2, Loader2, Paperclip, X, FileText, File } from "lucide-react"
import { apiClient } from "@/lib/api"

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
  project_id: string | null
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

export default function ChatPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [recentChats, setRecentChats] = useState<ChatSession[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load recent chats and uploaded files on mount
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

  const handleSend = async () => {
    if (!input.trim()) return

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
      
      // Update current chat ID if this was a new chat
      if (!currentChatId && response.chat_id) {
        setCurrentChatId(response.chat_id)
        loadRecentChats() // Refresh recent chats
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: response.response || "I received your message but couldn't generate a response.",
        timestamp: new Date().toISOString(),
        sources: response.sources,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const assistantMessage: Message = {
        role: "assistant",
        content: "I'm sorry, there was an error processing your request. Please try again.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r p-4 hidden md:flex flex-col">
          <Button 
            variant="outline" 
            className="w-full mb-4 justify-start gap-2"
            onClick={startNewChat}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          
          {/* File Upload Section */}
          <div className="mb-4 pb-4 border-b">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.html,.xml"
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowFiles(!showFiles)}
                  className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 hover:text-slate-700"
                >
                  <FileText className="h-3 w-3" />
                  {uploadedFiles.length} File{uploadedFiles.length !== 1 ? 's' : ''} Uploaded
                </button>
                
                {showFiles && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="group flex items-center gap-2 p-2 rounded-md bg-slate-50 text-xs"
                      >
                        <File className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{file.filename}</div>
                          <div className="text-slate-400">{formatFileSize(file.file_size)}</div>
                        </div>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                        >
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recent Chats
            </div>
            {loadingChats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : recentChats.length === 0 ? (
              <div className="text-sm text-slate-500 py-2">
                No recent chats
              </div>
            ) : (
              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <div 
                    key={chat.id}
                    className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      currentChatId === chat.id 
                        ? "bg-blue-50 text-blue-700" 
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">{chat.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChat(chat.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <h3 className="text-2xl font-semibold mb-2">How can I help you today?</h3>
                  <p className="text-slate-600 mb-6">
                    Upload files and ask questions about their content. I'll search through your documents to provide accurate answers.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Paperclip className="h-4 w-4" />
                      Upload Files
                    </Button>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <p className="mt-4 text-sm text-green-600">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready for questions
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message, index) => (
                  <Card key={message.id || index} className={message.role === "user" ? "bg-blue-50" : "bg-white"}>
                    <div className="p-4">
                      <div className="font-semibold mb-1">
                        {message.role === "user" ? "You" : "Assistant"}
                      </div>
                      <div className="text-slate-700 whitespace-pre-wrap">{message.content}</div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="text-xs font-semibold text-slate-500 mb-1">Sources:</div>
                          <div className="text-xs text-slate-600 space-y-1">
                            {message.sources.map((source: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                <span>{source.source || source.name || `Source ${i + 1}`}</span>
                                {source.similarity && (
                                  <span className="text-slate-400">
                                    ({(source.similarity * 100).toFixed(0)}% match)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                {isLoading && (
                  <Card className="bg-white">
                    <div className="p-4">
                      <div className="font-semibold mb-1">Assistant</div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching documents and generating response...
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-white p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Upload files"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
                  placeholder={`Ask a question${session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}...`}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {uploadedFiles.length === 0 && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Tip: Upload files to chat about their content
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".txt,.md,.csv,.json,.pdf,.html,.xml"
        className="hidden"
      />
    </div>
  )
}
