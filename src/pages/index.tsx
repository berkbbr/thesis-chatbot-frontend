"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/router"
import { Send, Plus, MessageSquare, User, Bot, Menu, X, LogOut, Settings, Trash2 } from "lucide-react"

// Backend URL - Railway'den alındı
const API_URL = "https://web-production-ceb2.up.railway.app"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
}

export default function Home() {
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationList, setConversationList] = useState<string[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isChatMode, setIsChatMode] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setIsChatMode(messages.length > 0)
  }, [messages])

  const getUserId = () => {
    return "guest"
  }

  useEffect(() => {
    if (!router.isReady) return

    const queryId = router.query.id
    const id = queryId ? String(queryId) : `conv_${Date.now()}`

    setConversationId(id)
    router.replace(`/?id=${id}`, undefined, { shallow: true })

    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "dark" | "light"
      const savedName = localStorage.getItem("userName")
      if (savedTheme) setTheme(savedTheme)
      if (savedName) setUserName(savedName)
    }
  }, [router.isReady])

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations/${getUserId()}`)
      if (!res.ok) return

      const data = await res.json()
      setConversationList(data.conversations || [])
      setTitles(data.titles || {})
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/history/${id}`)
      if (!res.ok) return

      const data = await res.json()
      if (data.history && data.history.length > 0) {
        const allMsgs: Message[] = []
        data.history.forEach((h: any) => {
          allMsgs.push({
            role: "user",
            content: h.user,
            timestamp: h.timestamp ? new Date(h.timestamp) : undefined,
          })
          allMsgs.push({
            role: "assistant",
            content: h.assistant,
            timestamp: h.timestamp ? new Date(h.timestamp) : undefined,
          })
        })
        setMessages(allMsgs)
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("Error fetching history:", error)
      setMessages([])
    }
  }

  useEffect(() => {
    if (!conversationId) return
    fetchHistory(conversationId)
    fetchConversations()
  }, [conversationId])

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return

    const userMessage = input
    const newMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId,
          user_email: getUserId(),
          user_name: userName || undefined,
        }),
      })

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Server error: ${res.status}. Please try again.`,
            timestamp: new Date(),
          },
        ])
        return
      }

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        },
      ])

      if (messages.length === 0) {
        setTimeout(() => fetchConversations(), 500)
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please make sure the backend is running.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const startNewConversation = () => {
    const newId = `conv_${Date.now()}`
    setConversationId(newId)
    setMessages([])
    setSidebarOpen(false)
    router.push(`/?id=${newId}`, undefined, { shallow: true })
  }

  const deleteConversation = async (id: string) => {
    try {
      setDeleteInProgress(id)

      setConversationList((prevList) => prevList.filter((convId) => convId !== id))
      setTitles((prev) => {
        const newTitles = { ...prev }
        delete newTitles[id]
        return newTitles
      })

      await fetch(`${API_URL}/conversations/${id}`, {
        method: "DELETE",
      })

      if (conversationId === id) {
        startNewConversation()
      }

      fetchConversations()
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setDeleteInProgress(null)
    }
  }

  const saveSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme)
      localStorage.setItem("userName", userName)
    }
    setShowSettings(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatConversationTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`
    } else {
      return `${Math.floor(diffInHours / 24)}d`
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative z-40 w-80 h-full transition-all duration-300 ease-in-out bg-gray-800/80 backdrop-blur-xl border-r border-white/10 shadow-xl lg:shadow-none`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Thesis Chatbot</h2>
                  <p className="text-gray-400 text-xs">AI Assistant</p>
                </div>
              </div>
              <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={startNewConversation}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl h-12 font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              New Chat
            </button>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="space-y-1 pb-4">
              {conversationList.length === 0 && (
                <div className="text-center text-sm py-4 text-gray-400">No conversations yet</div>
              )}

              {conversationList.map((id) => (
                <div
                  key={id}
                  className={`group p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all duration-200 border border-transparent hover:border-white/10 ${
                    id === conversationId ? "bg-white/10 border-white/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => {
                        setConversationId(id)
                        router.push(`/?id=${id}`, undefined, { shallow: true })
                        setSidebarOpen(false)
                      }}
                    >
                      <h4 className="text-white font-medium text-sm truncate">{titles[id] || "New conversation"}</h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(id)
                      }}
                      disabled={deleteInProgress === id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all duration-200"
                    >
                      {deleteInProgress === id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {userName ? userName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{userName || "Guest User"}</p>
                <p className="text-gray-400 text-xs">{isSignedIn ? "Signed In" : "Guest Mode"}</p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {isSignedIn ? (
              <button
                className="w-full text-red-400 hover:text-red-300 text-sm px-3 py-2 bg-gray-700/50 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                onClick={() => setIsSignedIn(false)}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <button
                className="w-full text-blue-400 bg-gray-700/50 hover:bg-blue-500/20 px-3 py-2 rounded-lg text-sm transition-colors"
                onClick={() => setIsSignedIn(true)}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-gray-800/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <button className="text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-white font-semibold">Thesis Chatbot</h1>
          <div className="w-8"></div>
        </div>

        {/* Welcome Mode */}
        {!isChatMode && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-3xl mx-auto text-center space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent leading-tight">
                  {userName ? `Hello ${userName}!` : "What's on the agenda today?"}
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                  I'm your AI assistant for thesis research. Ask me anything or start a conversation.
                </p>
              </div>

              <div className="relative max-w-2xl mx-auto">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={userName ? `${userName}, type your message...` : "Type your message here..."}
                  className="w-full h-16 md:h-18 px-6 pr-16 text-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 shadow-lg"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-5 w-5 md:h-6 md:w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Mode */}
        {isChatMode && (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex items-end gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center">
                        {msg.role === "user" ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {userName ? userName.charAt(0).toUpperCase() : "U"}
                            </span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-200 ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-green-600 to-green-700 text-white"
                            : "bg-white/10 text-gray-100 border border-white/20"
                        }`}
                      >
                        <div className="text-xs opacity-70 mb-1">
                          {msg.role === "user" ? userName || "You" : "AI Assistant"}
                          {msg.timestamp && <span className="ml-2">{formatTime(msg.timestamp)}</span>}
                        </div>
                        <p className="text-sm leading-relaxed break-words whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-3 max-w-[85%] md:max-w-[75%]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white/10 text-gray-100 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Fixed Bottom Input */}
            <div className="bg-gray-800/80 backdrop-blur-xl border-t border-white/10 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder={userName ? `${userName}, type your message...` : "Type your message..."}
                      className="w-full h-12 md:h-14 px-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                      disabled={loading}
                    />
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-xs opacity-50 text-center">
                  Press Enter to send • Shift + Enter for new line
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl max-w-md w-full mx-4 border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-white">Settings</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="Enter your name..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-300">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "dark" | "light")}
                className="w-full p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  )
}
