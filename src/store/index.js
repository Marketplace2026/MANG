import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

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

    set({
      profile: profileRes.data,
      wallet: walletRes.data,
      pieces: piecesRes.data,
    })

    // Mettre à jour last_seen_at toutes les 30 secondes
    get().startOnlineHeartbeat(user.id)
  },

  heartbeatInterval: null,
  startOnlineHeartbeat: (userId) => {
    const { heartbeatInterval } = get()
    if (heartbeatInterval) clearInterval(heartbeatInterval)

    const interval = setInterval(async () => {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
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
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    const unread = data?.filter(n => !n.is_read).length || 0
    set({ notifications: data || [], unreadCount: unread })
  },

  markAsRead: async (notificationId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllAsRead: async (userId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  deleteNotification: async (notificationId) => {
    await supabase.from('notifications').delete().eq('id', notificationId)
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== notificationId),
    }))
  },

  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },

  subscribeToNotifications: (userId) => {
    const { addNotification } = get()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        addNotification(payload.new)
      })
      .subscribe()

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
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    if (!convs?.length) { set({ unreadCount: 0 }); return }
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or('is_read.is.null,is_read.eq.false')
      .neq('sender_id', userId)
      .in('conversation_id', convs.map(c => c.id))
    set({ unreadCount: count || 0 })
  },

  subscribeToUnread: (userId) => {
    const channel = supabase
      .channel(`msg-unread:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id !== userId) {
          set(state => ({ unreadCount: state.unreadCount + 1 }))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        get().fetchUnreadCount(userId)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  fetchConversations: async (userId) => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        shop:shops(id, name, cover_url),
        buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url, last_seen_at),
        seller:profiles!conversations_seller_id_fkey(id, username, avatar_url, last_seen_at),
        last_message:messages(content, type, created_at, sender_id)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    set({ conversations: data || [] })
  },

  fetchMessages: async (conversationId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    set({ messages: data || [] })
  },

  addMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }))
  },

  subscribeToMessages: (conversationId) => {
    const { addMessage } = get()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        // Enrichir avec le profil expéditeur
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', payload.new.sender_id)
          .single()
        addMessage({ ...payload.new, sender })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  },
}))

// ============================================================
// UI STORE (panneaux, modals, navigation)
// ============================================================
export const useUIStore = create((set) => ({
  activePanel: null,    // 'notifications' | 'messages' | 'vendor' | 'profile'
  activeModal: null,    // Nom du modal ouvert
  modalData: null,      // Données passées au modal

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
// CART STORE (Panier avec localStorage)
// ============================================================
export { useCartStore } from './useCartStore'
