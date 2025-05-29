"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/router"
import { useSession, signIn, signOut } from "next-auth/react"
import { Send, Plus, MessageSquare, User, Menu, X, LogOut, Settings, Trash2 } from "lucide-react"
import Image from "next/image"
import PWAInstall from '../components/PWAInstall'

// Backend URL - Railway'den alındı
const API_URL = "https://web-production-ceb2.up.railway.app"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
}

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isChatMode, setIsChatMode] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

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

  // Session'dan kullanıcı bilgilerini al
  useEffect(() => {
    if (session?.user) {
      setUserName(session.user.name || session.user.email || "")
    }
  }, [session])

  const getUserId = () => {
    if (session?.user?.email) {
      return session.user.email
    }
    return "guest"
  }

  const getCurrentUserName = () => {
    if (session?.user?.name) {
      return session.user.name
    }
    return guestName || "Guest"
  }

  const isAuthenticated = () => {
    return session?.user || guestName === "Guest"
  }

  useEffect(() => {
    const queryId = router.query.id as string || `conv_${Date.now()}`

    setConversationId(queryId)
    
    if (!router.query.id) {
      router.replace(`/?id=${queryId}`, undefined, { shallow: true })
    }

    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "dark" | "light"
      const savedGuestName = localStorage.getItem("guestName")
      if (savedTheme) setTheme(savedTheme)
      if (savedGuestName) setGuestName(savedGuestName)
    }
  }, [router])

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
    if (!conversationId || !isAuthenticated()) return
    fetchHistory(conversationId)
    fetchConversations()
  }, [conversationId, session, guestName])

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
          user_name: getCurrentUserName(),
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
      if (!session?.user) {
        localStorage.setItem("guestName", guestName)
      }
    }
    setShowSettings(false)
  }

  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    try {
      await signIn("google", { 
        callbackUrl: window.location.href,
        redirect: false 
      })
    } catch (error) {
      console.error("Google sign in error:", error)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGuestContinue = () => {
    setGuestName("Guest") // Otomatik olarak "Guest" adını ata
    localStorage.setItem("guestName", "Guest")
  }

  const handleSignOut = async () => {
    if (session?.user) {
      await signOut({ redirect: false })
    } else {
      setGuestName("")
      localStorage.removeItem("guestName")
    }
    setMessages([])
    startNewConversation()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Loading durumu
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 relative mx-auto mb-4">
            <Image src="/orionbot-logo.png" alt="OrionBot Logo" fill className="object-contain animate-pulse" />
          </div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  // Login Screen
  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-md relative">
          {/* Logo/App Name */}
          <div className="text-center mb-12">
            <div className="w-64 h-64 mx-auto mb-8 relative">
              <Image src="/orionbot-logo.png" alt="OrionBot Logo" fill className="object-contain" priority />
            </div>
            <p className="text-gray-400 text-lg">Your intelligent AI assistant</p>
          </div>

          {/* Login Form */}
          <div className="space-y-4">
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full h-14 bg-white hover:bg-gray-50 text-gray-900 rounded-xl font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink-0 px-4 text-gray-400 text-sm">or</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            {/* Guest Login Button */}
            <button
              onClick={handleGuestContinue}
              className="w-full h-14 bg-white/5 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 hover:border-white/30 rounded-xl font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-3"
            >
              <User className="w-5 h-5" />
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex overflow-hidden" style={{paddingTop: 'env(safe-area-inset-top)'}}>
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
                <div className="w-10 h-10 relative">
                  <Image src="/orionbot-logo.png" alt="OrionBot" fill className="object-contain" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">OrionBot</h2>
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
                <span className="text-sm">
                  {getCurrentUserName().charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{getCurrentUserName()}</p>
                <p className="text-gray-400 text-xs">
                  {session?.user ? "Google Account" : "Guest Mode"}
                </p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <button
              className="w-full text-red-400 hover:text-red-300 text-sm px-3 py-2 bg-gray-700/50 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
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
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <Image src="/orionbot-logo.png" alt="OrionBot" fill className="object-contain" />
            </div>
            <h1 className="text-white font-semibold">OrionBot</h1>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Welcome Mode */}
        {!isChatMode && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-3xl mx-auto text-center space-y-8">
              <div className="space-y-6">
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  <Image src="/orionbot-logo.png" alt="OrionBot" fill className="object-contain" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent leading-tight">
                  Hello {getCurrentUserName()}!
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
                  I'm OrionBot, your intelligent AI assistant. Ask me anything or start a conversation.
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
                  placeholder={`${getCurrentUserName()}, type your message...`}
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
                              {getCurrentUserName().charAt(0).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center relative">
                            <div className="w-5 h-5 relative">
                              <Image
                                src="/orionbot-logo.png"
                                alt="OrionBot"
                                fill
                                className="object-contain brightness-0 invert"
                              />
                            </div>
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
                          {msg.role === "user" ? getCurrentUserName() : "OrionBot"}
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center relative">
                        <div className="w-5 h-5 relative">
                          <Image
                            src="/orionbot-logo.png"
                            alt="OrionBot"
                            fill
                            className="object-contain brightness-0 invert"
                          />
                        </div>
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
                      placeholder={`${getCurrentUserName()}, type your message...`}
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 relative">
                <Image src="/orionbot-logo.png" alt="OrionBot" fill className="object-contain" />
              </div>
              <h2 className="text-xl font-bold text-white">OrionBot Settings</h2>
            </div>

            {/* User Info */}
            <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {getCurrentUserName().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{getCurrentUserName()}</p>
                  <p className="text-gray-400 text-sm">
                    {session?.user ? session.user.email : "Guest User"}
                  </p>
                </div>
              </div>
            </div>

            {/* Guest Name Input (only for guest users) */}
            {!session?.user && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-300">Your Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                  placeholder="Enter your name..."
                />
              </div>
            )}

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
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>

      {/* PWA Install Component */}
      <PWAInstall />
    </div>
  )
}