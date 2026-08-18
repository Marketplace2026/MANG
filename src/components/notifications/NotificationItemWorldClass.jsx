import { useState } from 'react'
import {
  Heart, MessageCircle, UserPlus, UserCheck, Package,
  CreditCard, Store, Star, ChevronRight, X, Check, CheckCircle2,
  Clock, ShieldCheck, ShoppingBag, ArrowRight
} from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, UserLink } from '@/components/ui'

// Configuration visuelle par type de notification
const NOTIF_VISUALS = {
  user_follow:       { icon: UserPlus,    color: 'bg-violet-500 text-white', label: 'Abonné' },
  shop_follow:       { icon: Store,       color: 'bg-blue-500 text-white',   label: 'Abonnement boutique' },
  post_like:         { icon: Heart,       color: 'bg-rose-500 text-white',   label: 'Like' },
  shop_like:         { icon: Heart,       color: 'bg-rose-500 text-white',   label: 'Like boutique' },
  comment_like:      { icon: Heart,       color: 'bg-rose-500 text-white',   label: 'Like commentaire' },
  shop_comment:      { icon: MessageCircle, color: 'bg-emerald-500 text-white', label: 'Commentaire' },
  comment_reply:     { icon: MessageCircle, color: 'bg-emerald-500 text-white', label: 'Réponse' },
  new_message:       { icon: MessageCircle, color: 'bg-emerald-500 text-white', label: 'Message' },
  order_new:         { icon: Package,     color: 'bg-orange-500 text-white', label: 'Commande' },
  order_accepted:    { icon: CheckCircle2, color: 'bg-emerald-500 text-white', label: 'Acceptée' },
  order_refused:     { icon: X,           color: 'bg-red-500 text-white',     label: 'Refusée' },
  order_paid:        { icon: CreditCard,  color: 'bg-amber-500 text-white',   label: 'Paiement' },
  wallet_credit:     { icon: CreditCard,  color: 'bg-emerald-500 text-white', label: 'Crédit' },
  wallet_debit:      { icon: CreditCard,  color: 'bg-red-500 text-white',     label: 'Débit' },
}

export default function NotificationItemWorldClass({
  notif,
  onClick,
  onDelete,
  onMarkRead,
  isDeleting = false
}) {
  const { user } = useAuthStore()
  const [followingBack, setFollowingBack] = useState(false)
  const [isFollowed, setIsFollowed] = useState(false)
  const [orderActionDone, setOrderActionDone] = useState(null) // null | 'accepted' | 'refused'

  const sender = notif.sender
  const visual = NOTIF_VISUALS[notif.type] || { icon: ShoppingBag, color: 'bg-gray-500 text-white', label: 'Notification' }
  const IconComponent = visual.icon

  // Action rapide : Suivre en retour
  const handleFollowBack = async (e) => {
    e.stopPropagation()
    if (!user || !sender?.id) return
    setFollowingBack(true)
    try {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: user.id,
        following_id: sender.id
      })
      if (error && error.code !== '23505') throw error
      setIsFollowed(true)
      toast.success(`Vous suivez désormais @${sender.username} !`)
    } catch (err) {
      toast.error('Erreur lors de l\'abonnement')
    } finally {
      setFollowingBack(false)
    }
  }

  // Action rapide Vendeur : Accepter / Refuser commande
  const handleOrderAction = async (e, action) => {
    e.stopPropagation()
    if (!notif.reference_id) return
    try {
      const newStatus = action === 'accept' ? 'accepted' : 'refused'
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', notif.reference_id)

      if (error) throw error
      setOrderActionDone(action)
      toast.success(action === 'accept' ? 'Commande acceptée ! ✅' : 'Commande refusée')
    } catch (err) {
      toast.error('Impossible de modifier le statut de la commande')
    }
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative flex items-start gap-3.5 px-4 py-3.5 cursor-pointer transition-all duration-200 border-b border-surface-100 dark:border-dark-800/60 active:bg-surface-100 dark:active:bg-dark-800',
        !notif.is_read
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'bg-white dark:bg-dark-900 hover:bg-surface-50 dark:hover:bg-dark-850'
      )}
    >
      {/* 1. VISUEL AVATAR EXPÉDITEUR AVEC BADGE EN SUPERPOSITION */}
      <div className="relative flex-shrink-0 mt-0.5">
        {sender ? (
          <UserLink user={sender} size="md" showName={false} showAvatar={true} />
        ) : (
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center text-lg shadow-xs">
            🌿
          </div>
        )}

        {/* Mini Badge Icône d'Action superposé */}
        <span
          className={clsx(
            'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-dark-900 shadow-xs text-[10px]',
            visual.color
          )}
        >
          <IconComponent size={11} />
        </span>
      </div>

      {/* 2. CONTENU PRINCIPAL */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          {/* Titre enrichi avec clustering */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={clsx('text-xs leading-tight', !notif.is_read ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-700 dark:text-gray-200')}>
              {notif.title}
            </p>
            {notif.cluster_count > 1 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-[9px]">
                +{notif.cluster_count - 1} autre{notif.cluster_count > 2 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Horodatage */}
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
          </span>
        </div>

        {/* Corps du message */}
        {notif.body && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed line-clamp-2">
            {notif.body}
          </p>
        )}

        {/* 3. QUICK INLINE ACTIONS (ACTIONS RAPIDES EN 1 CLIC) */}
        {/* Action A: Suivre en retour pour new follower */}
        {notif.type === 'user_follow' && sender && !isFollowed && (
          <div className="mt-2.5">
            <button
              onClick={handleFollowBack}
              disabled={followingBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs active:scale-95 transition-transform shadow-xs disabled:opacity-50"
            >
              <UserPlus size={13} />
              <span>Suivre en retour</span>
            </button>
          </div>
        )}

        {/* Action B: Traitement rapide de commande par le vendeur */}
        {notif.type === 'order_new' && !orderActionDone && (
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={(e) => handleOrderAction(e, 'accept')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform shadow-xs"
            >
              <Check size={13} /> Accepter
            </button>
            <button
              onClick={(e) => handleOrderAction(e, 'refuse')}
              className="px-3 py-1.5 rounded-xl bg-surface-200 dark:bg-dark-800 text-gray-700 dark:text-gray-200 hover:bg-surface-300 font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform"
            >
              <X size={13} /> Refuser
            </button>
          </div>
        )}

        {orderActionDone && (
          <span className="inline-block mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {orderActionDone === 'accept' ? '✓ Commande acceptée' : '✕ Commande refusée'}
          </span>
        )}
      </div>

      {/* 4. ACTIONS SECONDAIRES & INDICATEUR NON LU */}
      <div className="flex items-center gap-2 flex-shrink-0 self-center">
        {!notif.is_read && (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse flex-shrink-0" />
        )}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="w-7 h-7 rounded-xl bg-surface-100 dark:bg-dark-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 flex items-center justify-center active:scale-90 transition-all opacity-80 group-hover:opacity-100"
          title="Supprimer la notification"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
