"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { ImageUpload } from "@/components/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import Link from "next/link"
import { Bell, Package, Settings, Facebook, Phone } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  image: string
  stock?: number
  category?: string
}

interface Order {
  id: string
  buyerName: string
  items: any[]
  total: number
  status: string
  createdAt: string
}

export default function SellerDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [userData, setUserData] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Product form state
  const [productName, setProductName] = useState("")
  const [productCategory, setProductCategory] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productStock, setProductStock] = useState("")
  const [productDiscount, setProductDiscount] = useState("0")
  const [productImage, setProductImage] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Contact settings
  const [facebookUrl, setFacebookUrl] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    // Load seller's products
    async function loadProducts() {
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid))
      const snapshot = await getDocs(q)
      const productList: Product[] = []
      snapshot.forEach((doc) => {
        productList.push({ id: doc.id, ...doc.data() } as Product)
      })
      setProducts(productList)
    }

    // Load user data
    async function loadUserData() {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData(data)
        setFacebookUrl(data.facebookUrl || "")
        setPhoneNumber(data.phoneNumber || "")
      }
    }

    loadProducts()
    loadUserData()

    // Real-time order notifications
    const ordersQuery = query(collection(db, "orders"), where("sellerId", "==", user.uid))
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orderList: Order[] = []
      let newCount = 0
      snapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() } as Order
        orderList.push(order)
        if (order.status === "To Ship") {
          newCount++
        }
      })
      orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setOrders(orderList)
      setNewOrderCount(newCount)
    })

    return () => unsubscribe()
  }, [user])

  const handleUploadProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !productImage) {
      toast.error("Please upload a product image")
      return
    }

    setSubmitting(true)

    try {
      const price = Number.parseFloat(productPrice)
      const discount = Number.parseInt(productDiscount)
      const originalPrice = discount > 0 ? Math.round(price / (1 - discount / 100)) : price

      await addDoc(collection(db, "products"), {
        name: productName,
        category: productCategory,
        price,
        stock: Number.parseInt(productStock),
        discount,
        originalPrice,
        image: productImage,
        description: productDescription,
        rating: 4.5,
        sold: 0,
        sellerId: user.uid,
        sellerName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
      })

      toast.success("Product uploaded successfully!")

      // Reset form
      setProductName("")
      setProductCategory("")
      setProductPrice("")
      setProductStock("")
      setProductDiscount("0")
      setProductImage("")
      setProductDescription("")

      // Reload products
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid))
      const snapshot = await getDocs(q)
      const productList: Product[] = []
      snapshot.forEach((doc) => {
        productList.push({ id: doc.id, ...doc.data() } as Product)
      })
      setProducts(productList)
    } catch (error: any) {
      toast.error("Failed to upload product: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateContact = async () => {
    if (!user) return

    try {
      await updateDoc(doc(db, "users", user.uid), {
        facebookUrl,
        phoneNumber,
      })
      toast.success("Contact info updated!")
      setShowSettings(false)
    } catch (error) {
      toast.error("Failed to update contact info")
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Seller Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {(user.displayName || user.email || "S")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user.displayName || "My Shop"}</h1>
                <p className="text-gray-600">
                  {userData?.followers?.length || 0} Followers | {products.length} Products
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
          </div>

          {/* Contact Settings */}
          {showSettings && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Facebook className="w-4 h-4 inline mr-1" /> Facebook URL
                  </label>
                  <Input
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" /> Phone Number
                  </label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
              </div>
              <Button onClick={handleUpdateContact} className="mt-4">
                Save Contact Info
              </Button>
            </div>
          )}
        </div>

        {/* New Orders Alert */}
        {newOrderCount > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-yellow-500 mr-2" />
              <p className="text-yellow-700 font-medium">
                You have {newOrderCount} new order(s) waiting to be shipped!
              </p>
              <Link href="/orders" className="ml-auto text-orange-500 hover:underline">
                View Orders →
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Upload Product Form */}
          <div className="col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" /> Upload New Product
            </h2>

            <form onSubmit={handleUploadProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion & Apparel</option>
                    <option value="Home">Home & Living</option>
                    <option value="Beauty">Beauty & Personal Care</option>
                    <option value="Sports">Sports & Outdoors</option>
                    <option value="Food">Food & Beverages</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₱) *</label>
                  <Input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock *</label>
                  <Input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discount (%)</label>
                  <Input
                    type="number"
                    value={productDiscount}
                    onChange={(e) => setProductDiscount(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="99"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image *</label>
                <ImageUpload onUpload={setProductImage} currentImage={productImage} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Describe your product..."
                  rows={3}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                disabled={submitting}
              >
                {submitting ? "Uploading..." : "Upload Product"}
              </Button>
            </form>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{order.buyerName}</p>
                        <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-500">₱{order.total?.toFixed(2)}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            order.status === "To Ship"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "Completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/orders" className="block text-center text-orange-500 hover:underline mt-4">
                  View All Orders →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* My Products */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Products ({products.length})</h2>
          {products.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-500">No products uploaded yet. Upload your first product above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="bg-white rounded overflow-hidden shadow hover:shadow-lg transition"
                >
                  <img
                    src={product.image || "/placeholder.svg?height=128&width=200&query=product"}
                    alt={product.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs text-gray-800 mb-1 line-clamp-2">{product.name}</p>
                    <p className="text-orange-500 font-bold text-sm">₱{product.price}</p>
                    <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
