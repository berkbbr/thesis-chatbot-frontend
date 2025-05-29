import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const API_URL = "https://web-production-ceb2.up.railway.app"

interface Message {
  id: number
  user_email: string
  conversation_id: string
  user_message: string
  assistant_response: string
  timestamp: string
}

interface Stats {
  total_users: number
  total_messages: number
  total_conversations: number
  today_messages: number
  active_users: Array<{
    email: string
    message_count: number
  }>
}

export default function AdminPanel() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState("")

  const isAdmin = session?.user?.email === "berkbuber95@gmail.com"

  useEffect(() => {
    if (isAdmin) {
      fetchAllMessages()
      fetchAllUsers()
      fetchStats()
    }
  }, [isAdmin])

  const fetchAllMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/all-messages?admin_email=${session?.user?.email}&limit=200`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
    setLoading(false)
  }

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users?admin_email=${session?.user?.email}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats?admin_email=${session?.user?.email}`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        admin_email: session?.user?.email || "",
        query: searchQuery,
        user_email: selectedUser,
        limit: "100"
      })
      
      const res = await fetch(`${API_URL}/admin/search?${params}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error searching messages:', error)
    }
    setLoading(false)
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Please sign in to access admin panel</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Access Denied - Admin Only</div>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">OrionBot Admin Panel</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Chat
          </Link>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total_users}</div>
              <div className="text-gray-400 text-sm">Total Users</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total_messages}</div>
              <div className="text-gray-400 text-sm">Total Messages</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total_conversations}</div>
              <div className="text-gray-400 text-sm">Conversations</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.today_messages}</div>
              <div className="text-gray-400 text-sm">Today's Messages</div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Search Messages</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in messages..."
              className="flex-1 p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Users</option>
              {users.map((user, i) => (
                <option key={i} value={user}>{user}</option>
              ))}
            </select>
            <button 
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-medium"
            >
              Search
            </button>
            <button 
              onClick={fetchAllMessages}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded font-medium"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Users ({users.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {users.map((user, i) => (
              <div key={i} className="bg-gray-700 p-3 rounded text-white text-sm">
                {user}
              </div>
            ))}
          </div>
        </div>

        {/* Active Users */}
        {stats?.active_users && stats.active_users.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Most Active Users (Last 30 Days)</h2>
            <div className="space-y-2">
              {stats.active_users.map((user, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                  <span className="text-white">{user.email}</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                    {user.message_count} messages
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              Recent Messages ({messages.length})
            </h2>
            <button 
              onClick={fetchAllMessages}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {loading ? (
            <div className="text-white text-center py-8">Loading messages...</div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No messages found</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>👤 {msg.user_email}</span>
                      <span>🕐 {new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-green-300 text-sm mb-2">
                      <strong>User:</strong> {msg.user_message}
                    </div>
                    <div className="text-blue-300 text-sm">
                      <strong>OrionBot:</strong> {msg.assistant_response}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Conversation: {msg.conversation_id}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}