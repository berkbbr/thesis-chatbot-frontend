import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const API_URL = "https://web-production-ceb2.up.railway.app"

export default function AdminPanel() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const isAdmin = session?.user?.email === "berkbuber95@gmail.com"

  useEffect(() => {
    if (isAdmin) {
      fetchAllMessages()
      fetchAllUsers()
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Access Denied - Admin Only</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">OrionBot Admin Panel</h1>
        
        {/* Kullanıcı Listesi */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Kullanıcılar ({users.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {users.map((user, i) => (
              <div key={i} className="bg-gray-700 p-2 rounded text-white text-sm">
                {user}
              </div>
            ))}
          </div>
        </div>

        {/* Mesaj Listesi */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Son Konuşmalar</h2>
            <button 
              onClick={fetchAllMessages}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Yenile
            </button>
          </div>
          
          {loading ? (
            <div className="text-white">Yükleniyor...</div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className="bg-gray-700 p-4 rounded">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>👤 {msg.user_email}</span>
                    <span>🕐 {new Date(msg.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-green-300 text-sm mb-2">
                    <strong>Kullanıcı:</strong> {msg.user_message}
                  </div>
                  <div className="text-blue-300 text-sm">
                    <strong>OrionBot:</strong> {msg.assistant_response}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}