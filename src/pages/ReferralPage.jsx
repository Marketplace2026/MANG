import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Copy, Check, Share2, Gift, Users, Trophy,
  ChevronRight, ArrowLeft, Coins, Star, Zap
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar } from '@/components/ui'

export default function ReferralPage() {
  const { user, profile, pieces } = useAuthStore()
  const navigate = useNavigate()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [stats, setStats] = useState({ total: 0, shops: 0, pieces: 0 })

  const referralCode = profile?.referral_code || '...'
  const referralLink = `${window.location.origin}/inscription?ref=${referralCode}`

  useEffect(() => {
    if (user) loadReferrals()
  }, [user])

  const loadReferrals = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:profiles!referrals_referred_id_fkey(id, username, avatar_url, created_at)
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })

    setReferrals(data || [])
    setStats({
      total:  (data || []).length,
      // CORRECTIF : inclure 'rewarded' dans le compte boutiques
      shops:  (data || []).filter(r => r.status === 'shop_created' || r.status === 'rewarded').length,
      // CORRECTIF : pieces_given = pièces reçues par le parrain uniquement (20 inscription + 50 boutique)
      pieces: (data || []).reduce((s, r) => s + (r.pieces_given || 0), 0),
    })
    setLoading(false)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCodeCopied(true)
    toast.success('Code copié !')
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setLinkCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleShare = async () => {
    const text = `🌿 Rejoins-moi sur MANG — le marché agricole du Bénin !\n\nUtilise mon code de parrainage : *${referralCode}*\n\nTu reçois 10 pièces 🪙 à l'inscription !\n\n👉 ${referralLink}`
    if (navigator.share) {
      await navigator.share({ title: 'MANG — Parrainage', text })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Message copié ! Partagez-le sur WhatsApp')
    }
  }

  // CORRECTIF : statut 'rewarded' ajouté et correctement configuré
  const STATUS_CONFIG = {
    registered:   { label: 'Inscrit',         color: 'bg-blue-100 text-blue-700',       icon: '✅' },
    shop_created: { label: 'Boutique créée',  color: 'bg-emerald-100 text-emerald-700', icon: '🏪' },
    rewarded:     { label: 'Récompensé',      color: 'bg-amber-100 text-amber-700',     icon: '⭐' },
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-28">
      {/* HEADER */}
      <div className="relative overflow-hidden pt-12 pb-24 px-4"
        style={{ background: 'linear-gradient(135deg, #0b3d2e, #1a5c2e 60%, #2d8a3e)' }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '24px 24px' }}/>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gold-400/10 blur-2xl pointer-events-none"/>

        <div className="relative flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} className="text-white"/>
          </button>
          <div>
            <h1 className="font-display text-2xl text-white font-bold">Parrainage</h1>
            <p className="text-primary-300 text-sm">Invitez des amis et gagnez des pièces</p>
          </div>
        </div>

        {/* Récompenses */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { icon: '🎁', amount: '+10 🪙', label: 'Filleul inscrit',  sub: 'Pour votre ami' },
            { icon: '💎', amount: '+20 🪙', label: 'Vous recevez',     sub: 'Par inscription' },
            { icon: '🏪', amount: '+50 🪙', label: 'Boutique créée',   sub: 'Bonus extra' },
          ].map((r, i) => (
            <div key={i} className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{r.icon}</div>
              <p className="font-black text-white text-base">{r.amount}</p>
              <p className="text-white/70 text-[10px] font-semibold leading-tight">{r.label}</p>
              <p className="text-white/40 text-[9px]">{r.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative -mt-12 px-4 space-y-4">
        {/* CODE DE PARRAINAGE */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <p className="text-sm font-bold text-dark-700 mb-3 flex items-center gap-2">
            <Gift size={16} className="text-primary-600"/> Mon code de parrainage
          </p>

          {/* Code */}
          <div className="flex items-center gap-3 p-4 bg-primary-50 border-2 border-primary-200 rounded-2xl mb-3">
            <p className="flex-1 font-black text-primary-700 text-2xl tracking-[0.3em] text-center">
              {referralCode}
            </p>
            <button onClick={handleCopyCode}
              className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 active:scale-90 shadow-green">
              {codeCopied ? <Check size={18} className="text-white"/> : <Copy size={18} className="text-white"/>}
            </button>
          </div>

          {/* Lien */}
          <div className="flex items-center gap-2 p-3 bg-surface-100 rounded-xl mb-4">
            <p className="flex-1 text-xs text-dark-600/60 truncate font-mono">{referralLink}</p>
            <button onClick={handleCopyLink}
              className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center flex-shrink-0 active:scale-90">
              {linkCopied ? <Check size={13} className="text-emerald-600"/> : <Copy size={13} className="text-dark-600"/>}
            </button>
          </div>

          {/* Bouton partager */}
          <button onClick={handleShare}
            className="w-full py-3.5 rounded-2xl bg-primary-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-green">
            <Share2 size={18}/> Partager sur WhatsApp
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users,  label: 'Filleuls',       value: stats.total,  color: 'bg-blue-50 text-blue-600' },
            { icon: Trophy, label: 'Boutiques',       value: stats.shops,  color: 'bg-emerald-50 text-emerald-600' },
            // CORRECTIF : label clarifié — ce sont les pièces reçues PAR LE PARRAIN
            { icon: Coins,  label: 'Pièces reçues',  value: stats.pieces, color: 'bg-gold-50 text-gold-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-3.5 text-center">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2', s.color)}>
                <s.icon size={18}/>
              </div>
              <p className="font-display font-bold text-dark-800 text-xl">{s.value}</p>
              <p className="text-dark-600/50 text-[10px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* SOLDE PIÈCES */}
        <div className="bg-gradient-to-r from-gold-500 to-gold-600 rounded-2xl p-4 flex items-center gap-3 shadow-gold">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🪙</div>
          <div className="flex-1">
            <p className="text-white/80 text-sm">Mes pièces MANG</p>
            <p className="font-display font-black text-white text-2xl">{pieces?.balance || 0} pièces</p>
          </div>
          <Zap size={24} className="text-white/60"/>
        </div>

        {/* COMMENT ÇA MARCHE */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <h3 className="font-display font-bold text-dark-800 mb-4 flex items-center gap-2">
            <Star size={16} className="text-gold-500"/> Comment ça marche
          </h3>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Copiez votre code et partagez-le à vos amis', color: 'bg-blue-600' },
              { step: '2', text: 'Votre ami s\'inscrit avec votre code → il reçoit 10 🪙', color: 'bg-emerald-600' },
              { step: '3', text: 'Vous recevez automatiquement 20 🪙 pièces', color: 'bg-primary-600' },
              { step: '4', text: 'Si votre ami crée une boutique → +50 🪙 bonus !', color: 'bg-gold-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={clsx('w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5', item.color)}>
                  {item.step}
                </div>
                <p className="text-dark-700 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* LISTE FILLEULS */}
        <div>
          <h3 className="font-display font-bold text-dark-800 mb-3 flex items-center gap-2">
            <Users size={16} className="text-primary-600"/>
            Mes filleuls ({referrals.length})
          </h3>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-2xl"/>)}
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl shadow-card">
              <p className="text-4xl mb-2">👥</p>
              <p className="font-bold text-dark-800">Aucun filleul pour l'instant</p>
              <p className="text-dark-600/50 text-sm mt-1">Partagez votre code pour commencer !</p>
              <button onClick={handleShare}
                className="mt-4 px-5 py-2.5 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-green active:scale-95 transition-transform">
                Partager maintenant
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map(ref => {
                const cfg = STATUS_CONFIG[ref.status] || STATUS_CONFIG.registered
                return (
                  <div key={ref.id} className="bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3">
                    <Avatar src={ref.referred?.avatar_url} name={ref.referred?.username} size="md"/>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-dark-800 text-sm">@{ref.referred?.username}</p>
                      <p className="text-dark-600/40 text-xs">
                        Inscrit le {new Date(ref.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold', cfg.color)}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {/* CORRECTIF : afficher seulement si des pièces ont été données */}
                      {ref.pieces_given > 0 && (
                        <p className="text-gold-600 text-xs font-bold">+{ref.pieces_given} 🪙 reçus</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MESSAGE WHATSAPP PRÊT */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="font-bold text-emerald-800 text-sm mb-2">💬 Message prêt à envoyer</p>
          <p className="text-emerald-700 text-xs leading-relaxed bg-white rounded-xl p-3 font-mono">
            🌿 Rejoins-moi sur MANG — le marché agricole du Bénin !{'\n\n'}
            Utilise mon code : <strong>{referralCode}</strong>{'\n\n'}
            Tu reçois 10 pièces 🪙 à l'inscription !{'\n'}
            👉 {referralLink}
          </p>
          <button onClick={handleShare}
            className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Share2 size={14}/> Envoyer sur WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
