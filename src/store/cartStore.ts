import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'react-hot-toast'

export type CartItem = {
  id: string // composite id: productId + optional variant
  product: {
    id: string
    name: string
    price: number
    image?: string
    seller_id: string
    stock: number
    unit: 'kg' | 'sac' | 'tonne'
  }
  quantity: number
  variant?: { name: string; extraPrice?: number }
}

export type CartState = {
  items: CartItem[]
  status: 'idle' | 'loading' | 'error'
  error: string | null
  // derived
  totalQty: number
  subTotal: number
  // actions
  addItem: (product: CartItem['product'], qty?: number, variant?: CartItem['variant']) => Promise<void>
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, qty: number) => void
  clearCart: () => void
  syncWithSupabase: (userId: string) => Promise<void>
}

const calculateTotals = (items: CartItem[]) => {
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
  const subTotal = items.reduce((sum, i) => {
    const variantPrice = i.variant?.extraPrice ?? 0
    return sum + (i.product.price + variantPrice) * i.quantity
  }, 0)
  return { totalQty, subTotal }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      status: 'idle',
      error: null,
      totalQty: 0,
      subTotal: 0,
      addItem: async (product, qty = 1, variant) => {
        set({ status: 'loading' })
        try {
          // Verify stock via Supabase
          const { data, error } = await supabase
            .from('products')
            .select('stock')
            .eq('id', product.id)
            .single()
          if (error) throw error
          if (data.stock < qty) {
            toast.error('Stock insuffisant')
            set({ status: 'idle' })
            return
          }
          const id = product.id + (variant ? '_' + variant.name : '')
          const existing = get().items.find(i => i.id === id)
          const newItems = existing
            ? get().items.map(i =>
                i.id === id ? { ...i, quantity: i.quantity + qty } : i
              )
            : [
                ...get().items,
                { id, product, quantity: qty, variant }
              ]
          const { totalQty, subTotal } = calculateTotals(newItems)
          set({ items: newItems, totalQty, subTotal, status: 'idle' })
          // Persist locally
          localStorage.setItem('mang_cart', JSON.stringify(newItems))
          toast.success('Produit ajouté au panier')
        } catch (e: any) {
          console.error(e)
          set({ error: e.message, status: 'error' })
          toast.error('Erreur lors de l\'ajout au panier')
        }
      },
      removeItem: (itemId) => {
        const newItems = get().items.filter(i => i.id !== itemId)
        const { totalQty, subTotal } = calculateTotals(newItems)
        set({ items: newItems, totalQty, subTotal })
        localStorage.setItem('mang_cart', JSON.stringify(newItems))
      },
      updateQuantity: (itemId, qty) => {
        const newItems = get().items.map(i =>
          i.id === itemId ? { ...i, quantity: Math.max(1, qty) } : i
        )
        const { totalQty, subTotal } = calculateTotals(newItems)
        set({ items: newItems, totalQty, subTotal })
        localStorage.setItem('mang_cart', JSON.stringify(newItems))
      },
      clearCart: () => {
        localStorage.removeItem('mang_cart')
        set({ items: [], totalQty: 0, subTotal: 0 })
      },
      syncWithSupabase: async (userId) => {
        set({ status: 'loading' })
        try {
          // Upsert local cart to Supabase
          const { error } = await supabase.from('carts').upsert([
            { user_id: userId, items: get().items }
          ])
          if (error) throw error
          // Subscribe to realtime updates for this user's cart
          const channel = supabase
            .channel('public:carts')
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'carts', filter: `user_id=eq.${userId}` },
              (payload) => {
                const newItems = payload.new.items as any[]
                const { totalQty, subTotal } = calculateTotals(newItems)
                set({ items: newItems, totalQty, subTotal, status: 'idle' })
                localStorage.setItem('mang_cart', JSON.stringify(newItems))
              }
            )
            .subscribe()
          set({ status: 'idle' })
        } catch (e: any) {
          console.error(e)
          set({ error: e.message, status: 'error' })
        }
      },
    }),
    { name: 'mang_cart' }
  )
)
