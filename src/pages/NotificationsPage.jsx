import { useState, useEffect, useCallback } from 'react'
import {
  Bell, Check, CheckCheck, Trash2, RefreshCw,
  Heart, MessageCircle, UserPlus, Package,
  CreditCard, Store, Star, ChevronRight, X
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useNotificationsStore } from '@/store'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

// ============================================================
// CONFIG NOTIFICATIONS
// ============================================================
const NOTIF_CONFIG = {
  shop_follow:       { icon: '👥', color: 'bg-blue-100 text-blue-600',     label: 'Abonnement boutique' },
  product_favorite:  { icon: '❤️', color: 'bg-red-100 text-red-600',       label: 'Produit favori' },
  shop_comment:      { icon: '💬', color: 'bg-primary-100 text-primary-600',label: 'Commentaire boutique' },
  comment_reply:     { icon: '↩️', color: 'bg-primary-100 text-primary-600',label: 'Réponse commentaire' },
  post_like:         { icon: '❤️', color: 'bg-red-100 text-red-600',       label: 'Like publication' },
  shop_like:         { icon: '❤️', color: 'bg-red-100 text-red-600',       label: 'Like boutique' },
  comment_like:      { icon: '👍', color: 'bg-blue-100 text-blue-600',     label: 'Like commentaire' },
  user_follow:       { icon: '👤', color: 'bg-violet-100 text-violet-600', label: 'Nouvel abonné' },
  new_message:       { icon: '💬', color: 'bg-emerald-100 text-emerald-600',label: 'Nouveau message' },
  order_new:         { icon: '📦', color: 'bg-orange-100 text-orange-600', label: 'Nouvelle commande' },
  order_accepted:    { icon: '✅', color: 'bg-emerald-100 text-emerald-600',label: 'Commande acceptée' },
  order_refused:     { icon: '❌', color: 'bg-red-100 text-red-600',       label: 'Commande refusée' },
  order_paid:        { icon: '💰', color: 'bg-gold-100 text-gold-700',     label: 'Commande payée' },
  wallet_credit:     { icon: '💵', color: 'bg-emerald-100 text-emerald-600',label: 'Crédit wallet' },
  wallet_debit:      { icon: '💸', color: 'bg-red-100 text-red-600',       label: 'Débit wallet' },
}

const FILTER_TABS = [
  { key: 'all',     label: 'Toutes' },
  { key: 'unread',  label: '🔵 Non lues' },
  { key: 'orders',  label: '📦 Commandes' },
  { key: 'social',  label: '❤️ Social' },
  { key: 'wallet',  label: '💰 Wallet' },
]

const ORDER_TYPES   = ['order_new','order_accepted','order_refused','order_paid']
const SOCIAL_TYPES  = ['shop_follow','product_favorite','shop_comment','comment_reply','post_like','shop_like','comment_like','user_follow']
const WALLET_TYPES  = ['wallet_credit','wallet_debit']

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function NotificationsPage() {
  const { user }     = useAuthStore()
  const navigate     = useNavigate()
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationsStore()

  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id).finally(() => setLoading(false))
    }
  }, [user])

  // Filtrage
  const filtered = notifications.filter(n => {
    if (filter === 'unread')  return !n.is_read
    if (filter === 'orders')  return ORDER_TYPES.includes(n.type)
    if (filter === 'social')  return SOCIAL_TYPES.includes(n.type)
    if (filter === 'wallet')  return WALLET_TYPES.includes(n.type)
    return true
  })

  const handleClick = async (notif) => {
    if (!notif.is_read) await markAsRead(notif.id)
    // Navigation selon type
    if (ORDER_TYPES.includes(notif.type))              navigate('/commandes')
    else if (WALLET_TYPES.includes(notif.type))        navigate('/portefeuille')
    else if (notif.type === 'new_message')             navigate('/messages')
    else if (notif.type === 'user_follow' && notif.reference_id)
      navigate('/profil/' + notif.reference_id)
    else if (notif.type === 'post_like')
      navigate('/communaute', { state: { openPostId: notif.reference_id } })
    else if (notif.type === 'shop_comment')
      navigate('/communaute', { state: { openPostId: notif.reference_id } })
    else if (notif.type === 'comment_like')
      navigate('/communaute', { state: { openPostId: notif.reference_id } })
    else if (notif.type === 'shop_follow' && notif.reference_id)
      navigate('/boutique/' + notif.reference_id)
  }

  const handleDelete = async (e, notifId) => {
    e.stopPropagation()
    setDeleting(notifId)
    await deleteNotification(notifId)
    setDeleting(null)
  }

  const handleMarkAll = async () => {
    if (!unreadCount) { toast('Toutes les notifications sont déjà lues'); return }
    await markAllAsRead(user.id)
    toast.success('Toutes marquées comme lues ✅')
  }

  const handleClearAll = async () => {
    if (!confirm('Supprimer toutes les notifications ?')) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    await fetchNotifications(user.id)
    toast.success('Notifications supprimées')
  }

  // Grouper par date
  const groups = groupByDate(filtered)

  return (
    <div className="min-h-screen bg-surface-50">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-12 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl text-white font-bold">Notifications</h1>
              <p className="text-primary-300 text-sm">
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour ✅'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleMarkAll}
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
                <CheckCheck size={16} className="text-white"/>
              </button>
              <button onClick={handleClearAll}
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
                <Trash2 size={16} className="text-white"/>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total',     value: notifications.length,                        color: 'text-white' },
              { label: 'Non lues',  value: unreadCount,                                  color: 'text-orange-300' },
              { label: 'Commandes', value: notifications.filter(n => ORDER_TYPES.includes(n.type)).length,  color: 'text-blue-300' },
              { label: 'Social',    value: notifications.filter(n => SOCIAL_TYPES.includes(n.type)).length, color: 'text-pink-300' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-2.5 text-center">
                <p className={clsx('font-display font-bold text-xl leading-none', s.color)}>{s.value}</p>
                <p className="text-white/50 text-[9px] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative -mt-10 px-4 pb-28 space-y-3">
        {/* FILTRE TABS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={clsx(
                'flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border-2',
                filter === t.key
                  ? 'border-primary-600 bg-primary-600 text-white shadow-green'
                  : 'border-surface-200 bg-white text-dark-600'
              )}>
              {t.label}
              {t.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* LISTE */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <NotifSkeleton key={i}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyNotifications filter={filter}/>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-xs font-bold text-dark-600/40 uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="bg-white rounded-3xl shadow-card overflow-hidden divide-y divide-surface-100">
                  {group.items.map(notif => (
                    <NotifItem
                      key={notif.id}
                      notif={notif}
                      onClick={() => handleClick(notif)}
                      onDelete={e => handleDelete(e, notif.id)}
                      isDeleting={deleting === notif.id}
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

// ============================================================
// NOTIFICATION ITEM
// ============================================================
function NotifItem({ notif, onClick, onDelete, isDeleting }) {
  const cfg = NOTIF_CONFIG[notif.type] || { icon: '🔔', color: 'bg-surface-100 text-dark-600' }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-surface-50',
        !notif.is_read && 'bg-primary-50/50'
      )}
    >
      {/* Icône */}
      <div className={clsx('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl', cfg.color)}>
        {cfg.icon}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx('text-sm leading-tight', notif.is_read ? 'text-dark-700 font-medium' : 'text-dark-800 font-bold')}>
            {notif.title}
          </p>
          {/* Point non lu */}
          {!notif.is_read && (
            <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 mt-1"/>
          )}
        </div>
        {notif.body && (
          <p className="text-dark-600/60 text-xs mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-dark-600/40 text-[10px] mt-1">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="w-7 h-7 rounded-xl bg-surface-100 flex items-center justify-center active:scale-90 transition-transform"
        >
          {isDeleting
            ? <div className="w-3 h-3 border-2 border-dark-300 border-t-dark-600 rounded-full animate-spin"/>
            : <X size={13} className="text-dark-600/50"/>}
        </button>
        <ChevronRight size={15} className="text-dark-600/30"/>
      </div>
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyNotifications({ filter }) {
  const config = {
    all:     { emoji: '🔔', title: 'Aucune notification', sub: 'Vos notifications apparaîtront ici' },
    unread:  { emoji: '✅', title: 'Tout est lu !',        sub: 'Vous êtes à jour sur toutes vos notifications' },
    orders:  { emoji: '📦', title: 'Aucune commande',     sub: 'Vos notifications de commandes apparaîtront ici' },
    social:  { emoji: '❤️', title: 'Aucune interaction',  sub: 'Likes, commentaires et abonnements apparaîtront ici' },
    wallet:  { emoji: '💰', title: 'Aucune transaction',  sub: 'Vos mouvements wallet apparaîtront ici' },
  }
  const { emoji, title, sub } = config[filter] || config.all

  return (
    <div className="text-center py-16 bg-white rounded-3xl shadow-card px-6">
      <p className="text-5xl mb-3">{emoji}</p>
      <p className="font-display text-lg font-bold text-dark-800">{title}</p>
      <p className="text-dark-600/50 text-sm mt-2">{sub}</p>
    </div>
  )
}

// ============================================================
// SKELETON
// ============================================================
function NotifSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex gap-3">
      <div className="w-11 h-11 rounded-2xl skeleton flex-shrink-0"/>
      <div className="flex-1 space-y-2">
        <div className="h-3.5 skeleton rounded-lg w-3/4"/>
        <div className="h-3 skeleton rounded-lg w-full"/>
        <div className="h-2.5 skeleton rounded-lg w-1/4"/>
      </div>
    </div>
  )
}

// ============================================================
// HELPER — Grouper par date
// ============================================================
function groupByDate(notifs) {
  const groups = {}
  notifs.forEach(n => {
    const d = new Date(n.created_at)
    const now = new Date()
    let label
    const diff = (now - d) / 86400000
    if (diff < 1)       label = "Aujourd'hui"
    else if (diff < 2)  label = 'Hier'
    else if (diff < 7)  label = 'Cette semaine'
    else if (diff < 30) label = 'Ce mois'
    else                label = 'Plus ancien'

    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  })
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}
