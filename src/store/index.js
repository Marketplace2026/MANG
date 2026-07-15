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

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setWallet: (wallet) => set({ wallet }),
  setPieces: (pieces) => set({ pieces }),

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchUserData(session.user)
    }
    set({ loading: false, initialized: true })
    
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().fetchUserData(session.user)
      } else {
        set({ user: null, profile: null, wallet: null, pieces: null })
      }
    })
  },

  fetchUserData: async (user) => {
    set({ user })
    const [profileRes, walletRes, piecesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('pieces').select('*').eq('user_id', user.id).single(),
    ])
    set({ profile: profileRes.data, wallet: walletRes.data, pieces: piecesRes.data })
    get().startOnlineHeartbeat(user.id)
  },

  heartbeatInterval: null,
  startOnlineHeartbeat: (userId) => {
    const { heartbeatInterval } = get()
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    const interval = setInterval(async () => {
      await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
    }, 30000)
    set({ heartbeatInterval: interval })
  },

  signOut: async () => {
    const { heartbeatInterval } = get()
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    await supabase.auth.signOut()
    set({ user: null, profile: null, wallet: null, pieces: null, heartbeatInterval: null })
  },

  refreshWallet: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase.from('wallets').select('*').eq('user_id', user.id).single()
    set({ wallet: data })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    set({ profile: data })
  },
}))

// ============================================================
// NOTIFICATIONS STORE
// ============================================================
export const useNotificationsStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  fetchNotifications: async (userId) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    const unread = data?.filter(n => !n.is_read).length || 0
    set({ notifications: data || [], unreadCount: unread })
  },
  markAsRead: async (notificationId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
    set(state => ({ notifications: state.notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n), unreadCount: Math.max(0, state.unreadCount - 1) }))
  },
  markAllAsRead: async (userId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    set(state => ({ notifications: state.notifications.map(n => ({ ...n, is_read: true })), unreadCount: 0 }))
  },
  deleteNotification: async (notificationId) => {
    await supabase.from('notifications').delete().eq('id', notificationId)
    set(state => ({ notifications: state.notifications.filter(n => n.id !== notificationId) }))
  },
  addNotification: (notification) => {
    set(state => ({ notifications: [notification, ...state.notifications], unreadCount: state.unreadCount + 1 }))
  },
  subscribeToNotifications: (userId) => {
    const { addNotification } = get()
    const channel = supabase.channel(`notifications:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => { addNotification(payload.new) }).subscribe()
    return () => supabase.removeChannel(channel)
  },
}))

// ============================================================
// MESSAGES STORE
// ============================================================
export const useMessagesStore = create((set, get) => ({
  conversations: [],
  unreadCount: 0,
  activeConversation: null,
  messages: [],
  setActiveConversation: (conv) => set({ activeConversation: conv, messages: [] }),
  fetchUnreadCount: async (userId) => {
    const { data: convs } = await supabase.from('conversations').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    if (!convs?.length) { set({ unreadCount: 0 }); return }
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).or('is_read.is.null,is_read.eq.false').neq('sender_id', userId).in('conversation_id', convs.map(c => c.id))
    set({ unreadCount: count || 0 })
  },
  subscribeToUnread: (userId) => {
    const channel = supabase.channel(`msg-unread:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => { if (payload.new.sender_id !== userId) { set(state => ({ unreadCount: state.unreadCount + 1 })) } }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => { get().fetchUnreadCount(userId) }).subscribe()
    return () => supabase.removeChannel(channel)
  },
  fetchConversations: async (userId) => {
    const { data } = await supabase.from('conversations').select(`*, shop:shops(id, name, cover_url), buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url, last_seen_at), seller:profiles!conversations_seller_id_fkey(id, username, avatar_url, last_seen_at), last_message:messages(content, type, created_at, sender_id)`).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('last_message_at', { ascending: false })
    set({ conversations: data || [] })
  },
  fetchMessages: async (conversationId) => {
    const { data } = await supabase.from('messages').select('*, sender:profiles(id, username, avatar_url)').eq('conversation_id', conversationId).order('created_at', { ascending: true })
    set({ messages: data || [] })
  },
  addMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }))
  },
  subscribeToMessages: (conversationId) => {
    const { addMessage } = get()
    const channel = supabase.channel(`messages:${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
      const { data: sender } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', payload.new.sender_id).single()
      addMessage({ ...payload.new, sender })
    }).subscribe()
    return () => supabase.removeChannel(channel)
  },
}))

// ============================================================
// UI STORE
// ============================================================
export const useUIStore = create((set) => ({
  activePanel: null,
  activeModal: null,
  modalData: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  openModal: (modal, data = null) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  bottomSheetOpen: false,
  bottomSheetContent: null,
  openBottomSheet: (content) => set({ bottomSheetOpen: true, bottomSheetContent: content }),
  closeBottomSheet: () => set({ bottomSheetOpen: false, bottomSheetContent: null }),
}))

// ============================================================
// CART STORE - AVEC PERSISTENCE UNIFIÉE (cart-storage)
// ============================================================
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      status: 'idle',
      error: null,

      addItem: (product, qty = 1, variant = null) => {
        set({ status: 'loading' })
        try {
          const id = product.id + (variant ? '_' + variant.name : '')
          const existing = get().items.find(i => i.id === id)

          // Déterminer le prix unitaire
          let price = variant ? variant.price : product.price

          // Total qty après ajout
          const totalQtyAfterAdd = existing ? existing.qty + qty : qty

          // Appliquer le prix dégressif si présent
          if (product.wholesale_tiers?.length > 0) {
            const applicableTier = product.wholesale_tiers
              .filter(t => totalQtyAfterAdd >= parseInt(t.min_qty))
              .reduce((max, t) => (parseInt(t.min_qty) > parseInt(max.min_qty) ? t : max), { min_qty: 0, price })
            if (applicableTier.min_qty > 0) {
              price = applicableTier.price
            }
          }

          const image_url = product.image_url || product.image || ''
          const seller_id = product.shop?.owner_id || product.seller_id || ''
          const shop_id = product.shop_id || product.shop?.id || ''
          const shop_name = product.shop?.name || 'Boutique'

          const newItem = {
            id,
            product_id: product.id,
            name: product.name,
            price,
            image_url,
            qty: totalQtyAfterAdd,
            variant_name: variant ? variant.name : null,
            seller_id,
            shop_id,
            shop_name,
            unit: product.unit || 'unité',
            stock_quantity: product.stock_quantity ?? 99999,
            wholesale_tiers: product.wholesale_tiers || [],
            base_price: variant ? variant.price : product.price
          }

          let newItems
          if (existing) {
            newItems = get().items.map(i => i.id === id ? newItem : i)
          } else {
            newItems = [...get().items, newItem]
          }

          set({ items: newItems, status: 'idle' })
        } catch (e) {
          console.error(e)
          set({ error: e.message, status: 'error' })
          toast.error('Erreur lors de l\'ajout au panier')
        }
      },

      removeItem: (itemId) => {
        const newItems = get().items.filter(i => i.id !== itemId)
        set({ items: newItems })
      },

      updateQuantity: (itemId, qty) => {
        const newItems = get().items.map(i => {
          if (i.id !== itemId) return i
          const targetQty = Math.max(1, qty)

          // Re-évaluer le prix dégressif
          let price = i.base_price
          if (i.wholesale_tiers?.length > 0) {
            const applicableTier = i.wholesale_tiers
              .filter(t => targetQty >= parseInt(t.min_qty))
              .reduce((max, t) => (parseInt(t.min_qty) > parseInt(max.min_qty) ? t : max), { min_qty: 0, price })
            if (applicableTier.min_qty > 0) {
              price = applicableTier.price
            }
          }
          return { ...i, qty: targetQty, price }
        })
        set({ items: newItems })
      },

      clearCart: () => set({ items: [] }),

      checkoutWithWallet: async (userId, walletBalance, deliveryAddress, deliveryPhone) => {
        set({ status: 'loading' })
        try {
          const { subTotal } = get()
          if (walletBalance < subTotal) {
            toast.error('Solde insuffisant')
            set({ status: 'idle' })
            return false
          }

          // Préparer les articles pour le RPC
          const formattedItems = get().items.map(i => ({
            product_id: i.product_id,
            qty: i.qty,
            variant_name: i.variant_name
          }))

          const { data, error } = await supabase.rpc('place_cart_orders', {
            p_buyer_id: userId,
            p_items: formattedItems,
            p_delivery_address: deliveryAddress,
            p_delivery_phone: deliveryPhone
          })

          if (error) throw error

          if (!data?.success) {
            toast.error(data?.error || 'Erreur lors du paiement')
            set({ status: 'idle' })
            return false
          }

          get().clearCart()
          toast.success('Commande(s) créée(s) avec succès !')
          set({ status: 'idle' })
          return true
        } catch (e) {
          console.error(e)
          set({ error: e.message, status: 'error' })
          toast.error('Erreur technique lors du paiement')
          return false
        }
      },

      // GETTERS DYNAMIQUES
      get totalQty() {
        return get().items.reduce((sum, i) => sum + i.qty, 0)
      },
      get subTotal() {
        return get().items.reduce((sum, i) => sum + i.price * i.qty, 0)
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items })
    }
  )
)
