"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Send, Upload, FileText, Zap, Settings, TrendingUp, Users, DollarSign, Building2 } from "lucide-react"
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: response.response || "I'll help you with that. Once you connect your API keys and upload documents, I'll be able to provide detailed insights from PitchBook, AngelList, and Crunchbase data.",
        timestamp: new Date().toISOString()
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
        <Link 
          href="/integrations"
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          Settings
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-16">
        {/* Left Panel - Deal Pipeline */}
        <div className="w-[420px] border-r border-slate-800 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-cyan-400">Deal Pipeline</h2>
            <p className="text-sm text-slate-400 mt-1">Track and analyze potential investments</p>
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
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
                title="Upload document"
              >
                <Upload className="w-5 h-5" />
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
