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
  // ... colle ici tout ton code Auth existant
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setWallet: (wallet) => set({ wallet }),
  setPieces: (pieces) => set({ pieces }),
  initialize: async () => { /* ton code */ },
  fetchUserData: async (user) => { /* ton code */ },
  heartbeatInterval: null,
  startOnlineHeartbeat: (userId) => { /* ton code */ },
  signOut: async () => { /* ton code */ },
  refreshWallet: async () => { /* ton code */ },
  refreshProfile: async () => { /* ton code */ },
}))

// ============================================================
// NOTIFICATIONS STORE
// ============================================================
export const useNotificationsStore = create((set, get) => ({
  // ... colle ici tout ton code Notifications existant
  notifications: [], unreadCount: 0,
  fetchNotifications: async (userId) => { /* ton code */ },
  markAsRead: async (id) => { /* ton code */ },
  markAllAsRead: async (userId) => { /* ton code */ },
  deleteNotification: async (id) => { /* ton code */ },
  addNotification: (n) => { /* ton code */ },
  subscribeToNotifications: (userId) => { /* ton code */ },
}))

// ============================================================
// MESSAGES STORE
// ============================================================
export const useMessagesStore = create((set, get) => ({
  // ... colle ici tout ton code Messages existant
  conversations: [], unreadCount: 0, activeConversation: null, messages: [],
  setActiveConversation: (conv) => set({ activeConversation: conv, messages: [] }),
  fetchUnreadCount: async (userId) => { /* ton code */ },
  subscribeToUnread: (userId) => { /* ton code */ },
  fetchConversations: async (userId) => { /* ton code */ },
  fetchMessages: async (id) => { /* ton code */ },
  addMessage: (msg) => set(state => ({ messages: [...state.messages, msg] })),
  subscribeToMessages: (id) => { /* ton code */ },
}))

// ============================================================
// UI STORE
// ============================================================
export const useUIStore = create((set) => ({
  // ... colle ici tout ton code UI existant
  activePanel: null, activeModal: null, modalData: null,
  openPanel: (p) => set({ activePanel: p }), closePanel: () => set({ activePanel: null }),
  openModal: (m, d = null) => set({ activeModal: m, modalData: d }), closeModal: () => set({ activeModal: null, modalData: null }),
  bottomSheetOpen: false, bottomSheetContent: null,
  openBottomSheet: (c) => set({ bottomSheetOpen: true, bottomSheetContent: c }), 
  closeBottomSheet: () => set({ bottomSheetOpen: false, bottomSheetContent: null }),
}))

// ============================================================
// CART STORE - VERSION FINALE QUI TUE LE BUG
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
      name: 'mangafrica-cart-v2', // <- NOUVEAU NOM = VIDE L'ANCIEN CACHE
      partialize: (state) => ({ items: state.items })
    }
  )
)
