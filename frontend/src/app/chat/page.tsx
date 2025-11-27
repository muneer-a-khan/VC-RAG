"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages([...messages, userMessage])
    setInput("")
    setIsLoading(true)

    // TODO: Call API
    setTimeout(() => {
      const assistantMessage: Message = {
        role: "assistant",
        content: "This is a placeholder response. The RAG pipeline will be implemented to provide intelligent, context-aware responses.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r p-4">
        <h2 className="font-semibold mb-4">VC Copilot</h2>
        <Button variant="outline" className="w-full mb-4">+ New Chat</Button>
        <div className="text-sm text-slate-600">
          <p>Recent chats will appear here</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">How can I help you today?</h3>
                <p className="text-slate-600">Ask me anything about your portfolio companies, deals, or market research.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <Card key={index} className={message.role === "user" ? "bg-blue-50" : "bg-white"}>
                  <div className="p-4">
                    <div className="font-semibold mb-1">
                      {message.role === "user" ? "You" : "VC Copilot"}
                    </div>
                    <div className="text-slate-700">{message.content}</div>
                  </div>
                </Card>
              ))}
              {isLoading && (
                <Card className="bg-white">
                  <div className="p-4">
                    <div className="font-semibold mb-1">VC Copilot</div>
                    <div className="text-slate-700">Thinking...</div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t bg-white p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question about your portfolio..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

