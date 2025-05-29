"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, MessageSquare, User, Menu, X, LogOut, Settings, Trash2 } from "lucide-react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid";

const API_URL = "https://web-production-ceb2.up.railway.app";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
};

export default function Home() {
  const router = useRouter();
  // NextAuth session ve guestId yönetimi
  const sessionData = useSession();
  const session = sessionData?.data;
  const [guestId, setGuestId] = useState<string | null>(null);

  // UI State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationList, setConversationList] = useState<string[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false); // Guest login

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Guest ID oluştur
  useEffect(() => {
    if (!session) {
      let id = localStorage.getItem("guest_id");
      if (!id) {
        id = uuidv4();
        localStorage.setItem("guest_id", id);
      }
      setGuestId(id);
    }
  }, [session]);

  // Sohbet kimliği/email
  const userEmailOrId = session?.user?.email || guestId || "guest";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setIsChatMode(messages.length > 0);
  }, [messages]);

  // Sohbet ID ve local ayarları
  useEffect(() => {
    const queryId = new URLSearchParams(window.location.search).get("id");
    const id = queryId || `conv_${Date.now()}`;

    setConversationId(id);
    const newUrl = `/?id=${id}`;
    window.history.replaceState({}, "", newUrl);

    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "dark" | "light";
      const savedName = localStorage.getItem("userName");
      if (savedTheme) setTheme(savedTheme);
      if (savedName) setUserName(savedName);
    }
  }, []);

  // Sohbet listesini ve geçmişini çek
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations/${userEmailOrId}`);
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
        data.history.forEach((h: any) => {
          allMsgs.push({
            role: "user",
            content: h.user,
            timestamp: h.timestamp ? new Date(h.timestamp) : undefined,
          });
          allMsgs.push({
            role: "assistant",
            content: h.assistant,
            timestamp: h.timestamp ? new Date(h.timestamp) : undefined,
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
    // eslint-disable-next-line
  }, [conversationId, userEmailOrId]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage = input;
    const newMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId,
          user_email: userEmailOrId,
          user_name: userName || undefined,
        }),
      });

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Server error: ${res.status}. Please try again.`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        },
      ]);

      if (messages.length === 0) {
        setTimeout(() => fetchConversations(), 500);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please make sure the backend is running.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    setConversationId(newId);
    setMessages([]);
    setSidebarOpen(false);
    const newUrl = `/?id=${newId}`;
    window.history.pushState({}, "", newUrl);
  };

  const deleteConversation = async (id: string) => {
    try {
      setDeleteInProgress(id);

      setConversationList((prevList) => prevList.filter((convId) => convId !== id));
      setTitles((prev) => {
        const newTitles = { ...prev };
        delete newTitles[id];
        return newTitles;
      });

      await fetch(`${API_URL}/conversations/${id}`, {
        method: "DELETE",
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

  const saveSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      localStorage.setItem("userName", userName);
    }
    setShowSettings(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ------ GİRİŞ EKRANI ------
  if (!session && !isSignedIn) {
    // Guest id localStorage'da hazırsa göster
    if (!guestId) return null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md relative">
          <div className="text-center mb-12">
            <div className="w-32 h-32 mx-auto mb-6 relative">
              <Image src="/orionbot-logo.png" alt="OrionBot Logo" fill className="object-contain" priority />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              OrionBot
            </h1>
            <p className="text-gray-400 text-lg">Your intelligent AI assistant</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => signIn("google")}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              Google ile Giriş Yap
            </button>
            <button
              onClick={() => setIsSignedIn(true)}
              className="w-full h-14 bg-white/5 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 hover:border-white/30 rounded-2xl font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              <User className="w-5 h-5 mr-3 inline-block" />
              Guest olarak devam et
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Otomatik isim set et (Google ile giriş yaptıysa)
  useEffect(() => {
    if (session?.user?.name && userName === "") {
      setUserName(session.user.name);
    }
    // eslint-disable-next-line
  }, [session]);

  // ---- Buradan sonrası senin orijinal sohbet, sidebar, ayarlar kodunla devam ediyor! ----

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex overflow-hidden">
      {/* ... kalan kodun aynı devam eder ... */}
    </div>
  );
}
