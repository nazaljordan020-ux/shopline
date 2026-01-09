"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Bell, Package, MessageCircle, UserPlus } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  orderId?: string
  read: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    const notifQuery = query(collection(db, "notifications"), where("userId", "==", user.uid))

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const notifList: Notification[] = []
      snapshot.forEach((doc) => {
        notifList.push({ id: doc.id, ...doc.data() } as Notification)
      })
      notifList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setNotifications(notifList)
    })

    return () => unsubscribe()
  }, [user])

  const markAsRead = async (notifId: string) => {
    await updateDoc(doc(db, "notifications", notifId), { read: true })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return <Package className="w-5 h-5 text-orange-500" />
      case "order_update":
        return <Package className="w-5 h-5 text-blue-500" />
      case "message":
        return <MessageCircle className="w-5 h-5 text-green-500" />
      case "follow":
        return <UserPlus className="w-5 h-5 text-purple-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
        </h1>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markAsRead(notif.id)
                  if (notif.orderId) {
                    router.push("/orders")
                  }
                }}
                className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition ${
                  !notif.read ? "border-l-4 border-orange-500" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-full">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${!notif.read ? "text-gray-900" : "text-gray-600"}`}>
                      {notif.title}
                    </h3>
                    <p className="text-sm text-gray-500">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                  {!notif.read && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
