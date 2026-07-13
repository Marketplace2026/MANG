import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

// ============================================================
// AUTH STORE
// ============================================================
export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  wallet: null,
  pieces: null,
  loading: true,
  initialized: false,
  // ... colle ici tout ton code Auth que tu m'as envoyé
}))

// ============================================================
// NOTIFICATIONS STORE
// ============================================================
export const useNotificationsStore = create((set, get) => ({
  // ... colle ici ton code notifications
}))

// ============================================================
// MESSAGES STORE  
// ============================================================
export const useMessagesStore = create((set, get) => ({
  // ... colle ici ton code messages
}))

// ============================================================
// UI STORE
// ============================================================
export const useUIStore = create((set) => ({
  // ... colle ici ton code UI
}))

// ============================================================
// CART STORE - VERSION FINALE QUI MARCHE
// ============================================================
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) => {
        const existing = get().items.find(i => i.id === item.id)
        const newItems = existing
          ? get().items.map(i => i.id === item.id ? { ...i, qty: i.qty + qty } : i)
          : [...get().items, { ...item, qty }]
        set({ items: newItems })
        toast.success('Produit ajouté au panier')
      },
      removeItem: (itemId) => set({ items: get().items.filter(i => i.id !== itemId) }),
      updateQuantity: (itemId, qty) => set({ items: get().items.map(i => i.id === itemId ? { ...i, qty: Math.max(1, qty) } : i) }),
      clearCart: () => set({ items: [] }),
      get totalQty() { return get().items.reduce((sum, i) => sum + i.qty, 0) },
      get subTotal() { return get().items.reduce((sum, i) => sum + i.price * i.qty, 0) },
    }),
    { 
      name: 'mangafrica-cart-v2', // <- NOUVEAU NOM = VIDE LE CACHE
      partialize: (state) => ({ items: state.items })
    }
  )
)
