"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/router"
import { Send, Plus, MessageSquare, User, Bot, Menu, X, LogOut, Settings, Trash2, ChevronDown } from "lucide-react"

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

  const suggestionCards = [
    {
      title: "What are the advantages",
      subtitle: "of using Next.js?",
    },
    {
      title: "Write code to",
      subtitle: "demonstrate dijkstra's algorithm",
    },
    {
      title: "Help me write an essay",
      subtitle: "about silicon valley",
    },
    {
      title: "What is the weather",
      subtitle: "in San Francisco?",
    },
  ]

  const handleSuggestionClick = (suggestion: { title: string; subtitle: string }) => {
    setInput(`${suggestion.title} ${suggestion.subtitle}`)
  }

  // Login Screen
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-6 bg-white rounded-2xl flex items-center justify-center">
              <Bot className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-3xl font-semibold text-white mb-2">Thesis Chatbot</h1>
            <p className="text-gray-400">Your intelligent research assistant</p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-gray-600 focus:outline-none transition-colors"
                  placeholder="Enter your name..."
                />
              </div>

              <button
                onClick={() => setIsSignedIn(true)}
                className="w-full h-12 bg-white hover:bg-gray-100 text-black rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>

            <button
              onClick={() => {
                setUserName("")
                setIsSignedIn(true)
              }}
              className="w-full h-12 bg-gray-900 border border-gray-800 text-white hover:bg-gray-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative z-40 w-64 h-full transition-transform duration-200 bg-black border-r border-gray-800 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">Chatbot</h2>
            <div className="flex items-center gap-2">
              <button onClick={startNewConversation} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <Plus className="h-4 w-4 text-white" />
              </button>
              <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversationList.length === 0 ? (
            <div className="text-center text-sm py-8 text-gray-500">
              Your conversations will appear here once you start chatting!
            </div>
          ) : (
            <div className="space-y-1">
              {conversationList.map((id) => (
                <div
                  key={id}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-800 ${
                    id === conversationId ? "bg-gray-800" : ""
                  }`}
                  onClick={() => {
                    setConversationId(id)
                    router.push(`/?id=${id}`, undefined, { shallow: true })
                    setSidebarOpen(false)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-white text-sm truncate">{titles[id] || "New conversation"}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(id)
                      }}
                      disabled={deleteInProgress === id}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                    >
                      {deleteInProgress === id ? (
                        <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-white text-sm">{userName || "Guest"}</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="ml-auto p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <button
            className="w-full text-gray-400 hover:text-white text-sm px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            onClick={() => setIsSignedIn(false)}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm hover:bg-gray-800 transition-colors">
                  Chat model
                  <ChevronDown className="h-4 w-4" />
                </button>

                <button className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm hover:bg-gray-800 transition-colors">
                  Private
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
              Deploy with Vercel
            </button>
          </div>
        </div>

        {/* Welcome Mode */}
        {!isChatMode && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-semibold text-white mb-4">
                {userName ? `Hello ${userName}!` : "Hello there!"}
              </h1>
              <p className="text-gray-400 text-lg">How can I help you today?</p>
            </div>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 w-full max-w-2xl">
              {suggestionCards.map((card, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(card)}
                  className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-left hover:bg-gray-800 transition-colors group"
                >
                  <div className="text-white font-medium mb-1">{card.title}</div>
                  <div className="text-gray-400 text-sm">{card.subtitle}</div>
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="w-full max-w-3xl">
              <div className="relative">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Send a message..."
                  className="w-full p-4 pr-12 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 transition-colors"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-white text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-4 w-4" />
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
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6 space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex gap-4 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        {msg.role === "user" ? (
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                            <span className="text-black font-medium text-sm">
                              {userName ? userName.charAt(0).toUpperCase() : "U"}
                            </span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col">
                        <div className="text-xs text-gray-400 mb-2">
                          {msg.role === "user" ? userName || "You" : "Assistant"}
                          {msg.timestamp && <span className="ml-2">{formatTime(msg.timestamp)}</span>}
                        </div>
                        <div
                          className={`p-4 rounded-xl ${
                            msg.role === "user"
                              ? "bg-gray-800 text-white"
                              : "bg-gray-900 border border-gray-800 text-white"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex gap-4 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-xs text-gray-400 mb-2">Assistant</div>
                        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Fixed Bottom Input */}
            <div className="border-t border-gray-800 p-4">
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Send a message..."
                    className="w-full p-4 pr-12 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 transition-colors"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-white text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    {loading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-white">Settings</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-gray-600 focus:outline-none transition-colors"
                placeholder="Enter your name..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-300">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "dark" | "light")}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-gray-600 focus:outline-none transition-colors"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-black transition-colors"
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
