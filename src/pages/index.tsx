import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../utils/config";

// Geçici olarak Next-Auth devre dışı
const mockSession: unknown = null;
const useSession = () => ({ data: mockSession });
const signIn = async () => { console.log("Sign in temporarily disabled"); };
const signOut = async () => { console.log("Sign out temporarily disabled"); };

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
};

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationList, setConversationList] = useState<string[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getUserId = () => {
    if (session?.user?.email) return session.user.email;
    return "guest";
  };

  useEffect(() => {
    if (!router.isReady) return;
    
    // TypeScript hatası düzeltildi
    const queryId = router.query.id;
    const id = queryId ? String(queryId) : `conv_${Date.now()}`;
    
    setConversationId(id);
    router.replace(`/?id=${id}`, undefined, { shallow: true });
    
    // LocalStorage sadece client-side'da çalışır
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("theme") as "dark" | "light";
      const savedName = localStorage.getItem("userName");
      if (savedTheme) setTheme(savedTheme);
      if (savedName) setUserName(savedName);
    }
  }, [router.isReady]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations/${getUserId()}`);
      if (!res.ok) return;
      
      const data = await res.json();
      setConversationList(data.conversations || []);
      setTitles(data.titles || {});
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/history/${id}`);
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        const allMsgs: Message[] = [];
        data.history.forEach((h: HistoryItem) => {
          allMsgs.push({ 
            role: "user", 
            content: h.user,
            timestamp: h.timestamp ? new Date(h.timestamp) : undefined
          });
          allMsgs.push({ 
            role: "assistant", 
            content: h.assistant,
            timestamp: h.timestamp ? new Date(h.timestamp) : undefined
          });
        });
        setMessages(allMsgs);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    fetchHistory(conversationId);
    fetchConversations();
  }, [conversationId]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    
    const userMessage = input;
    const newMessage: Message = { 
      role: "user", 
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId,
          user_email: getUserId(),
          user_name: userName || undefined
        }),
      });
      
      if (!res.ok) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Server error: ${res.status}. Please try again.`,
          timestamp: new Date()
        }]);
        return;
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response,
        timestamp: new Date()
      }]);
      
      if (messages.length === 0) {
        setTimeout(() => fetchConversations(), 500);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Connection error. Please make sure the backend is running.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    setConversationId(newId);
    setMessages([]);
    router.push(`/?id=${newId}`, undefined, { shallow: true });
  };

  const deleteConversation = async (id: string) => {
    try {
      setDeleteInProgress(id);
      
      setConversationList(prevList => prevList.filter(convId => convId !== id));
      setTitles(prev => {
        const newTitles = {...prev};
        delete newTitles[id];
        return newTitles;
      });
      
      await fetch(`${API_URL}/conversations/${id}`, {
        method: "DELETE"
      });
      
      if (conversationId === id) {
        startNewConversation();
      }
      
      fetchConversations();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleteInProgress(null);
    }
  };

  const handleSignIn = () => {
    setIsSigningIn(true);
    signIn().finally(() => setIsSigningIn(false));
  };

  const saveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("theme", theme);
      localStorage.setItem("userName", userName);
    }
    setShowSettings(false);
  };

  return (
    <main className={`min-h-screen ${theme === "dark" ? "bg-gradient-to-b from-gray-900 to-gray-800 text-white" : "bg-gradient-to-b from-gray-100 to-white text-gray-900"} p-4 flex flex-col items-center`}>
      <div className="w-full max-w-6xl">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex gap-2 items-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
              Thesis Chatbot
            </span>
          </h1>
          
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"} transition-colors`}
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {session ? (
              <div className="flex items-center gap-2">
                {session.user?.image && (
                  <img 
                    src={session.user.image} 
                    alt="User" 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm">{session.user?.name}</span>
                <button 
                  className={`text-red-400 hover:text-red-300 text-sm px-2 py-1 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} rounded`}
                  onClick={() => signOut()}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                className={`text-blue-400 ${theme === "dark" ? "bg-gray-700 hover:bg-blue-600" : "bg-gray-200 hover:bg-blue-100"} px-3 py-1 rounded-md text-sm`}
                onClick={handleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? "Signing In..." : "Sign In"}
              </button>
            )}
          </div>
        </header>

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${theme === "dark" ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-xl max-w-md w-full`}>
              <h2 className="text-xl font-bold mb-4">Settings</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={`w-full p-2 rounded ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}
                  placeholder="Enter your name..."
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as "dark" | "light")}
                  className={`w-full p-2 rounded ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className={`px-4 py-2 rounded ${theme === "dark" ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-300 hover:bg-gray-400"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <div className={`w-1/4 ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"} rounded-lg p-4 shadow-lg`}>
            <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
              <span>Conversations</span>
              <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {conversationList.length}
              </span>
            </h2>

            <button
              onClick={startNewConversation}
              className="w-full mb-4 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-md hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              New Conversation
            </button>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {conversationList.length === 0 && (
                <div className={`text-center text-sm py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  No conversations yet
                </div>
              )}
              
              {conversationList.map((id) => (
                <div 
                  key={id} 
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
                    id === conversationId 
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-md text-white" 
                      : theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  <button
                    onClick={() => {
                      setConversationId(id);
                      router.push(`/?id=${id}`, undefined, { shallow: true });
                    }}
                    className="flex-1 text-left px-2 py-1 rounded text-sm truncate"
                  >
                    {titles[id] || "New conversation"}
                  </button>
                  <button
                    onClick={() => deleteConversation(id)}
                    disabled={deleteInProgress === id}
                    className={`p-1 rounded transition-all duration-200 hover:scale-110 ${
                      deleteInProgress === id ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {deleteInProgress === id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col h-[700px]">
            <div className={`flex-1 overflow-y-auto ${theme === "dark" ? "bg-gray-800" : "bg-white"} p-6 rounded-lg shadow-lg mb-4 custom-scrollbar`}>
              {messages.length === 0 && (
                <div className={`h-full flex flex-col items-center justify-center text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  <div className="text-8xl mb-4 animate-pulse">
                    <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium mb-2">
                    {userName ? `Hello ${userName}!` : "Start a new conversation"}
                  </h3>
                  <p className="text-sm max-w-md">
                    I am your AI assistant. How can I help you today?
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl shadow-md whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-green-600 to-green-700 text-white"
                          : theme === "dark" 
                            ? "bg-gradient-to-r from-gray-700 to-gray-600 text-white" 
                            : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900"
                      }`}
                    >
                      <div className="text-xs opacity-70 mb-1">
                        {msg.role === "user" ? (userName || "You") : "AI Assistant"}
                        {msg.timestamp && (
                          <span className="ml-2">
                            {new Date(msg.timestamp).toLocaleTimeString("en-US", { 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            })}
                          </span>
                        )}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className={`${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} p-4 rounded-2xl flex items-center space-x-2`}>
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="text-sm opacity-70 ml-2">typing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className={`${theme === "dark" ? "bg-gray-800" : "bg-white"} p-4 rounded-lg shadow-lg`}>
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className={`flex-1 p-3 rounded-xl ${
                    theme === "dark" 
                      ? "bg-gray-700 text-white border-gray-600" 
                      : "bg-gray-100 text-gray-900 border-gray-300"
                  } border focus:border-blue-500 focus:outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30`}
                  placeholder={userName ? `${userName}, type your message...` : "Type your message..."}
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className={`px-6 rounded-xl text-white font-medium transition-all transform hover:scale-105 ${
                    !input.trim() || loading
                      ? "bg-gray-500 cursor-not-allowed opacity-50"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
              <div className="mt-2 text-xs opacity-50 text-center">
                Press Shift + Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(75, 85, 99, 0.2);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(75, 85, 99, 0.7);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #9CA3AF;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </main>
  );
}