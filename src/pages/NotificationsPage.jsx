import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, ArrowLeft, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useNotificationsStore } from '@/store'

import NotificationItemWorldClass from '@/components/notifications/NotificationItemWorldClass'
import NotificationFiltersNav from '@/components/notifications/NotificationFiltersNav'

const ORDER_TYPES  = ['order_new', 'order_accepted', 'order_refused', 'order_paid']
const SOCIAL_TYPES = ['shop_follow', 'product_favorite', 'shop_comment', 'comment_reply', 'post_like', 'shop_like', 'comment_like', 'user_follow']
const WALLET_TYPES = ['wallet_credit', 'wallet_debit']

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationsStore()

  const [enrichedNotifs, setEnrichedNotifs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      // 1. Tenter RPC v3.0 avec Profil Expéditeur Enrichi
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_user_notifications_v30', {
        p_user_id: user.id,
        p_limit: 60
      })

      if (!rpcErr && Array.isArray(rpcData)) {
        setEnrichedNotifs(rpcData)
      } else {
        // Fallback Supabase REST si RPC non déployé
        const { data: restData } = await supabase
          .from('notifications')
          .select('*, sender:profiles!notifications_sender_id_fkey(id, username, full_name, avatar_url, city)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(60)

        setEnrichedNotifs(restData || notifications)
      }

      await fetchNotifications(user.id)
    } catch (err) {
      console.error('Erreur chargement notifications v3.0:', err)
      setEnrichedNotifs(notifications)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime update pour les nouvelles notifications
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`notifs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, async (payload) => {
        // Recharger les notifications enrichies
        const { data: senderProf } = await supabase.from('profiles').select('id, username, full_name, avatar_url, city').eq('id', payload.new.sender_id).maybeSingle()
        const newNotif = { ...payload.new, sender: senderProf }
        setEnrichedNotifs(prev => [newNotif, ...prev])
        fetchNotifications(user.id)
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [user])

  // Filtrage
  const filtered = enrichedNotifs.filter((n) => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'orders') return ORDER_TYPES.includes(n.type)
    if (filter === 'social') return SOCIAL_TYPES.includes(n.type)
    if (filter === 'wallet') return WALLET_TYPES.includes(n.type)
    return true
  })

  // Clic sur notification -> Navigation intelligente
  const handleClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
      setEnrichedNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }

    // Redirection selon le type
    if (ORDER_TYPES.includes(notif.type)) {
      navigate('/commandes')
    } else if (WALLET_TYPES.includes(notif.type)) {
      navigate('/portefeuille')
    } else if (notif.type === 'new_message') {
      navigate('/messages')
    } else if (notif.type === 'user_follow' && (notif.sender?.username || notif.reference_id)) {
      navigate(`/profile/${notif.sender?.username || notif.reference_id}`)
    } else if (notif.type === 'post_like' || notif.type === 'shop_comment' || notif.type === 'comment_like') {
      navigate('/communaute', { state: { openPostId: notif.reference_id } })
    } else if (notif.type === 'shop_follow' && notif.reference_id) {
      navigate(`/boutique/${notif.reference_id}`)
    } else {
      navigate('/marketplace')
    }
  }

  const handleDelete = async (e, notifId) => {
    e.stopPropagation()
    setDeletingId(notifId)
    await deleteNotification(notifId)
    setEnrichedNotifs(prev => prev.filter(n => n.id !== notifId))
    setDeletingId(null)
    toast.success('Notification supprimée')
  }

  const handleMarkAll = async () => {
    if (!unreadCount) {
      toast('Toutes les notifications sont déjà lues')
      return
    }
    await markAllAsRead(user.id)
    setEnrichedNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('Toutes les notifications ont été marquées comme lues ✅')
  }

  const handleClearAll = async () => {
    if (!confirm('Supprimer définitivement toutes les notifications ?')) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setEnrichedNotifs([])
    await fetchNotifications(user.id)
    toast.success('Historique des notifications effacé')
  }

  // Grouper par date
  const groups = groupByDate(filtered)

  // Compteurs par filtre
  const counts = {
    all: enrichedNotifs.length,
    orders: enrichedNotifs.filter(n => ORDER_TYPES.includes(n.type)).length,
    social: enrichedNotifs.filter(n => SOCIAL_TYPES.includes(n.type)).length,
    wallet: enrichedNotifs.filter(n => WALLET_TYPES.includes(n.type)).length,
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-950 pb-24">
      {/* 1. HEADER VERT MANG */}
      <header className="bg-emerald-900 dark:bg-dark-900 pt-4 pb-4 px-4 sticky top-0 z-50 border-b border-emerald-800 dark:border-dark-800 shadow-sm text-white">
        <div className="flex items-center justify-between max-w-[var(--content-max-width)] mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-display font-black leading-tight">Notifications</h1>
              <p className="text-emerald-200 dark:text-gray-400 text-xs">
                {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour ✅'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAll}
              className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
              title="Tout marquer comme lu"
            >
              <CheckCheck size={18} />
            </button>
            <button
              onClick={handleClearAll}
              className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-transform text-red-300 hover:text-red-100"
              title="Tout effacer"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. ZONE DE FILTRES ET DE CONTENU */}
      <div className="p-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
        {/* Navigation des Filtres */}
        <NotificationFiltersNav
          activeFilter={filter}
          onFilterChange={setFilter}
          unreadCount={unreadCount}
          counts={counts}
        />

        {/* LISTE ET GROUPES DE NOTIFICATIONS */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <NotifSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyNotifications filter={filter} />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-1">
                  {group.label}
                </p>
                <div className="bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 shadow-xs overflow-hidden divide-y divide-surface-100 dark:divide-dark-800">
                  {group.items.map((notif) => (
                    <NotificationItemWorldClass
                      key={notif.id}
                      notif={notif}
                      onClick={() => handleClick(notif)}
                      onDelete={(e) => handleDelete(e, notif.id)}
                      isDeleting={deletingId === notif.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyNotifications({ filter }) {
  const configs = {
    all:    { emoji: '🔔', title: 'Aucune notification', sub: 'Vos notifications d\'activités apparaîtront ici.' },
    unread: { emoji: '✅', title: 'Tout est lu !', sub: 'Vous êtes parfaitement à jour sur vos notifications.' },
    orders: { emoji: '📦', title: 'Aucune commande', sub: 'Vos notifications de suivi de commandes apparaîtront ici.' },
    social: { emoji: '❤️', title: 'Aucune interaction', sub: 'Nouveaux abonnés, likes et commentaires apparaîtront ici.' },
    wallet: { emoji: '💰', title: 'Aucune transaction', sub: 'Vos mouvements de crédit et débit wallet apparaîtront ici.' },
  }
  const { emoji, title, sub } = configs[filter] || configs.all

  return (
    <div className="py-16 px-6 text-center bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 shadow-xs">
      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-3">
        {emoji}
      </div>
      <h3 className="font-display font-bold text-gray-900 dark:text-white text-base mb-1">{title}</h3>
      <p className="text-gray-500 text-xs max-w-xs mx-auto leading-relaxed">{sub}</p>
    </div>
  )
}

function NotifSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 flex gap-3 animate-pulse">
      <div className="w-11 h-11 rounded-2xl bg-surface-200 dark:bg-dark-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-surface-200 dark:bg-dark-800 rounded-lg w-1/2" />
        <div className="h-3 bg-surface-200 dark:bg-dark-800 rounded-lg w-3/4" />
        <div className="h-2.5 bg-surface-200 dark:bg-dark-800 rounded-lg w-1/4" />
      </div>
    </div>
  )
}

function groupByDate(notifs) {
  const groups = {}
  notifs.forEach((n) => {
    const d = new Date(n.created_at)
    const now = new Date()
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))

    let label = 'Plus ancien'
    if (diffDays === 0)       label = "Aujourd'hui"
    else if (diffDays === 1)  label = 'Hier'
    else if (diffDays < 7)   label = 'Cette semaine'
    else if (diffDays < 30)  label = 'Ce mois'

    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  })

  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}
