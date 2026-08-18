import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, UserPlus, UserCheck, MessageCircle, Share2, Star, CheckCircle, ShieldCheck, Phone, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { Avatar } from '@/components/ui'

export default function ProfileHeaderCard({
  profile,
  shop,
  stats,
  isMe,
  isFollowing,
  onToggleFollow,
  onOpenFollowers,
  onOpenFollowing,
  onNavigateBack
}) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  if (!profile) return null

  const isOnline = profile.last_seen_at
    ? (new Date() - new Date(profile.last_seen_at)) < 180000
    : false

  const locationText = shop?.city || profile.city || 'Cotonou, Bénin'
  const whatsappNumber = shop?.phone || profile.phone || ''

  const handleWhatsApp = () => {
    if (!whatsappNumber) {
      toast.error('Numéro WhatsApp non renseigné')
      return
    }
    const cleanNum = whatsappNumber.replace(/[^0-9]/g, '')
    const fullNum = cleanNum.startsWith('229') ? cleanNum : `229${cleanNum}`
    const text = encodeURIComponent(`Bonjour @${profile.username}, je vous contacte depuis votre profil MANG.`)
    window.open(`https://wa.me/${fullNum}?text=${text}`, '_blank')
  }

  const handleShare = () => {
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: `@${profile.username} sur MANG`, url }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Lien du profil copié !')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative bg-white dark:bg-dark-900 border-b border-surface-200 dark:border-dark-800 shadow-sm">
      {/* 1. COVER BANNER (Hauteur optimisée mobile 140px) */}
      <div className="relative h-36 sm:h-44 bg-gradient-to-r from-emerald-900 via-primary-900 to-dark-900 overflow-hidden">
        {shop?.cover_url ? (
          <img src={shop.cover_url} alt={profile.username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Bouton Partage Top Right */}
        <button
          onClick={handleShare}
          className="absolute top-3 right-3 w-9 h-9 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-transform"
        >
          {copied ? <CheckCircle size={18} className="text-emerald-400" /> : <Share2 size={17} />}
        </button>
      </div>

      {/* 2. AVATAR OVERLAP & INFOS PRINCIPALES */}
      <div className="px-4 pb-5">
        <div className="flex justify-between items-end -mt-12 mb-3">
          {/* Avatar avec contour ring et badge en ligne */}
          <div className="relative flex-shrink-0">
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name || profile.username}
              size="2xl"
              className="ring-4 ring-white dark:ring-dark-900 shadow-xl bg-white"
            />
            {isOnline && (
              <span className="absolute bottom-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-emerald-500 rounded-full border-2 border-white dark:border-dark-900">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-white text-[9px] font-black">En ligne</span>
              </span>
            )}
          </div>

          {/* Badges de Confiance Terroire Bénin */}
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Vendeur Vérifié {locationText.split(',')[0]}</span>
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              ⚡ Répond en &lt; 15 min
            </span>
          </div>
        </div>

        {/* Nom & Métriques */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-black text-2xl text-gray-900 dark:text-white tracking-tight">
              {profile.full_name || profile.username}
            </h1>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              @{profile.username}
            </span>
          </div>

          {/* Note moyenne et Localisation */}
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 pt-0.5">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span>{stats.avg_rating ? Number(stats.avg_rating).toFixed(1) : '5.0'}</span>
              <span className="text-gray-400 font-normal">({stats.reviews_count || 0} avis)</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <MapPin size={13} className="text-emerald-600" />
              <span>{locationText}</span>
            </div>
          </div>

          {/* Bio Vendeur */}
          {profile.bio && (
            <p className="text-sm text-gray-700 dark:text-gray-200 pt-2 leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* 3. BARRE DE STATISTIQUES INTERACTIVES */}
        <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-surface-100 dark:bg-dark-800/60 rounded-2xl text-center border border-surface-200/60 dark:border-dark-700/50">
          <div className="flex flex-col items-center">
            <span className="font-display font-black text-lg text-gray-900 dark:text-white">
              {stats.products_count || 0}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Produits</span>
          </div>
          <button onClick={onOpenFollowers} className="flex flex-col items-center hover:opacity-80 active:scale-95 transition-transform">
            <span className="font-display font-black text-lg text-gray-900 dark:text-white">
              {stats.followers_count || 0}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Abonnés</span>
          </button>
          <button onClick={onOpenFollowing} className="flex flex-col items-center hover:opacity-80 active:scale-95 transition-transform">
            <span className="font-display font-black text-lg text-gray-900 dark:text-white">
              {stats.following_count || 0}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Abonnements</span>
          </button>
        </div>

        {/* 4. BOUTONS D'ACTION SOCIALE & MESSAGERIE */}
        {!isMe ? (
          <div className="flex gap-2 pt-1">
            {/* Suivre / Désabonner */}
            <button
              onClick={onToggleFollow}
              className={clsx(
                'flex-1 py-3 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm',
                isFollowing
                  ? 'bg-surface-200 dark:bg-dark-800 text-gray-800 dark:text-white border border-gray-300 dark:border-dark-700'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
              )}
            >
              {isFollowing ? <><UserCheck size={15} /> Abonné</> : <><UserPlus size={15} /> Suivre</>}
            </button>

            {/* 💬 Messagerie Chat Direct MANG */}
            <button
              onClick={() => navigate('/messages', { state: { recipientId: profile.id, recipientName: profile.username } })}
              className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
            >
              <MessageCircle size={15} />
              <span>Message</span>
            </button>

            {/* 📲 WhatsApp Direct */}
            {whatsappNumber && (
              <button
                onClick={handleWhatsApp}
                className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                <Phone size={15} />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        ) : (
          <div className="pt-1">
            <button
              onClick={() => navigate('/messages')}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <MessageCircle size={16} />
              <span>Accéder à ma messagerie</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
