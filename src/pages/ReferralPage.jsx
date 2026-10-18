import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Copy, Check, Share2, Gift, Users, Trophy,
  ArrowLeft, Coins, Star, Zap, Store, UserPlus,
  CheckCircle2, AlertTriangle, ShoppingBag, Award,
  Sparkles, ShieldCheck, ArrowRight, Info
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
  const [tier, setTier] = useState('Bronze')
  const [activeCount, setActiveCount] = useState(0)

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

    const refs = data || []
    setReferrals(refs)

    // Filleuls actifs (non frauduleux)
    const actRefs = refs.filter(r => !r.suspicious)
    const actCount = actRefs.length
    setActiveCount(actCount)

    // Calcul du Palier (Tier)
    let currentTier = 'Bronze'
    if (actCount >= 15) currentTier = 'Gold'
    else if (actCount >= 5) currentTier = 'Silver'
    setTier(currentTier)

    setStats({
      total: refs.length,
      shops: refs.filter(r => (r.status === 'shop_created' || r.status === 'rewarded') && !r.suspicious).length,
      pieces: refs.reduce((s, r) => s + (r.pieces_given || 0), 0),
    })
    setLoading(false)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCodeCopied(true)
    toast.success('Code de parrainage copié !')
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setLinkCopied(true)
    toast.success('Lien d\'inscription copié !')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleShare = async () => {
    const text = `Rejoignez-moi sur MANG, la plateforme agricole de référence au Bénin !\n\nUtilisez mon code de parrainage : ${referralCode}\n\nVous recevrez 10 pièces offertes à votre inscription pour booster vos produits !\n\nLien direct d'inscription :\n${referralLink}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MANG — Parrainage', text })
      } catch {
        // Annulé par l'utilisateur
      }
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Message copié ! Vous pouvez le coller sur WhatsApp.')
    }
  }

  const STATUS_CONFIG = {
    registered:   { label: 'Inscrit', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300', icon: CheckCircle2 },
    shop_created: { label: 'Boutique créée', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', icon: Store },
    rewarded:     { label: 'Boutique créée', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', icon: Store },
    suspicious:   { label: 'Suspect / Gelé', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', icon: AlertTriangle },
    cash_paid:    { label: 'Acheteur Actif', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', icon: ShoppingBag },
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-950 pb-28 transition-colors duration-300">
      {/* HEADER PROFESSIONNEL */}
      <div
        className="relative overflow-hidden pt-10 pb-20 px-4 md:px-8"
        style={{ background: 'linear-gradient(135deg, #062b20 0%, #0d4a34 50%, #176b4a 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        {/* Barre du haut */}
        <div className="relative flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all"
              aria-label="Retour"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-gold-400/20 border border-gold-300/30 text-gold-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} /> Programme Ambassadeur
                </span>
              </div>
              <h1 className="font-display text-2xl text-white font-bold tracking-tight">Parrainage MANG</h1>
            </div>
          </div>
        </div>

        <p className="text-white/80 text-xs md:text-sm max-w-lg mb-6 leading-relaxed">
          Partagez votre code exclusif. Chaque fois qu'un ami s'inscrit ou lance sa boutique sur MANG, vous gagnez des pièces gratuites pour promouvoir vos annonces.
        </p>

        {/* 3 Cartes de Récompenses Claires */}
        <div className="relative grid grid-cols-3 gap-2.5">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-1.5 text-white">
              <UserPlus size={16} />
            </div>
            <p className="font-black text-white text-base md:text-lg">+10 pièces</p>
            <p className="text-white/80 text-[11px] font-semibold leading-tight">Pour votre ami</p>
            <p className="text-white/50 text-[10px] mt-0.5">Dès l'inscription</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center ring-1 ring-gold-400/40">
            <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center mx-auto mb-1.5 text-gold-300">
              <Coins size={16} />
            </div>
            <p className="font-black text-gold-300 text-base md:text-lg">+20 pièces</p>
            <p className="text-white/80 text-[11px] font-semibold leading-tight">Pour vous</p>
            <p className="text-white/50 text-[10px] mt-0.5">Par filleul inscrit</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-1.5 text-emerald-300">
              <Store size={16} />
            </div>
            <p className="font-black text-emerald-300 text-base md:text-lg">+20 pièces</p>
            <p className="text-white/80 text-[11px] font-semibold leading-tight">Boutique créée</p>
            <p className="text-white/50 text-[10px] mt-0.5">Bonus par boutique</p>
          </div>
        </div>
      </div>

      <div className="relative -mt-10 px-4 md:px-8 space-y-4 max-w-4xl mx-auto">
        {/* CARTE MON CODE DE PARRAINAGE */}
        <div className="bg-white dark:bg-dark-900 rounded-3xl shadow-card border border-surface-200 dark:border-dark-800 p-5 md:p-6 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Gift size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-dark-800 dark:text-white">Votre code personnel</h2>
                <p className="text-[11px] text-dark-500 dark:text-dark-400">À saisir manuellement ou via votre lien direct</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-[11px] font-bold border border-primary-200 dark:border-primary-900">
              Actif & Illimité
            </span>
          </div>

          {/* Bloc Affichage Code */}
          <div className="flex items-center gap-3 p-3.5 bg-primary-50/70 dark:bg-dark-950 border-2 border-primary-200 dark:border-primary-900/60 rounded-2xl mb-3">
            <div className="flex-1 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 block mb-0.5">
                Code Parrain
              </span>
              <p className="font-mono font-black text-primary-800 dark:text-primary-200 text-2xl md:text-3xl tracking-[0.25em]">
                {referralCode}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0"
            >
              {codeCopied ? <Check size={16} /> : <Copy size={16} />}
              <span>{codeCopied ? 'Copié' : 'Copier'}</span>
            </button>
          </div>

          {/* Lien direct */}
          <div className="flex items-center gap-2 p-2.5 bg-surface-100 dark:bg-dark-800 rounded-xl mb-4 border border-surface-200 dark:border-dark-750">
            <span className="text-[11px] font-bold text-dark-500 dark:text-dark-400 shrink-0 pl-1">Lien :</span>
            <p className="flex-1 text-xs text-dark-700 dark:text-dark-300 truncate font-mono">{referralLink}</p>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg bg-surface-200 dark:bg-dark-700 hover:bg-surface-300 text-dark-700 dark:text-dark-200 text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-90 transition-all"
            >
              {linkCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{linkCopied ? 'Lien copié' : 'Copier lien'}</span>
            </button>
          </div>

          {/* Bouton Partager WhatsApp */}
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-emerald active:scale-98 transition-all"
          >
            <Share2 size={18} />
            <span>Partager mon lien et mon code</span>
          </button>
        </div>

        {/* NIVEAU AMBASSADEUR (PALIERS) */}
        <div className="bg-white dark:bg-dark-900 rounded-3xl shadow-card border border-surface-200 dark:border-dark-800 p-5 md:p-6 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gold-50 dark:bg-gold-950/60 text-gold-600 dark:text-gold-400 flex items-center justify-center">
                <Trophy size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-dark-800 dark:text-white">Palier d'Ambassadeur</h3>
                <p className="text-[11px] text-dark-500 dark:text-dark-400">Plus vous invitez de filleuls, plus vos gains augmentent</p>
              </div>
            </div>
            <span
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1',
                tier === 'Gold'
                  ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-white shadow-sm'
                  : tier === 'Silver'
                  ? 'bg-slate-200 dark:bg-dark-700 text-slate-800 dark:text-slate-200'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
              )}
            >
              <Award size={13} /> Palier {tier === 'Gold' ? 'Or' : tier === 'Silver' ? 'Argent' : 'Bronze'}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-xs font-semibold text-dark-600 dark:text-dark-300">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-primary-600" />
                {activeCount} filleul{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
              </span>
              <span>
                {tier === 'Gold'
                  ? 'Palier maximum atteint'
                  : `Objectif prochain palier : ${activeCount < 5 ? 5 : 15} filleuls`}
              </span>
            </div>

            {/* Barre de progression */}
            <div className="w-full h-3 bg-surface-100 dark:bg-dark-800 rounded-full overflow-hidden border border-surface-200 dark:border-dark-700">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((activeCount / (activeCount < 5 ? 5 : 15)) * 100, 100)}%` }}
              />
            </div>

            {/* Détails du palier actif */}
            <div className="p-3.5 bg-surface-50 dark:bg-dark-950 rounded-2xl text-xs font-medium text-dark-700 dark:text-dark-300 leading-relaxed border border-surface-200 dark:border-dark-800">
              {tier === 'Gold' ? (
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-gold-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gold-700 dark:text-gold-400 font-bold block mb-0.5">Avantages Palier Or :</strong>
                    Vous bénéficiez du barème maximal : 50 pièces par inscription, 20 pièces par boutique créée, et 10% de commission cash sur le premier achat de vos filleuls.
                  </div>
                </div>
              ) : tier === 'Silver' ? (
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Avantages Palier Argent :</strong>
                    Vous gagnez 30 pièces par inscription et 20 pièces par boutique créée. Invitez encore {15 - activeCount} filleul(s) pour passer au Palier Or.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-800 dark:text-amber-300 font-bold block mb-0.5">Avantages Palier Bronze :</strong>
                    Vous gagnez 20 pièces par inscription et 20 pièces par boutique créée. Invitez encore {5 - activeCount} filleul(s) pour débloquer le Palier Argent.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATISTIQUES EN TEMPS RÉEL */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-800 rounded-2xl shadow-card p-3.5 text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
              <Users size={18} />
            </div>
            <p className="font-display font-bold text-dark-800 dark:text-white text-xl">{stats.total}</p>
            <p className="text-dark-500 dark:text-dark-400 text-[11px] font-medium">Filleuls</p>
          </div>

          <div className="bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-800 rounded-2xl shadow-card p-3.5 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Store size={18} />
            </div>
            <p className="font-display font-bold text-dark-800 dark:text-white text-xl">{stats.shops}</p>
            <p className="text-dark-500 dark:text-dark-400 text-[11px] font-medium">Boutiques</p>
          </div>

          <div className="bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-800 rounded-2xl shadow-card p-3.5 text-center">
            <div className="w-10 h-10 rounded-xl bg-gold-50 dark:bg-gold-950/60 text-gold-600 dark:text-gold-400 flex items-center justify-center mx-auto mb-2">
              <Coins size={18} />
            </div>
            <p className="font-display font-bold text-dark-800 dark:text-white text-xl">{stats.pieces}</p>
            <p className="text-dark-500 dark:text-dark-400 text-[11px] font-medium">Pièces gagnées</p>
          </div>
        </div>

        {/* SOLDE PIÈCES ACTUEL */}
        <div className="bg-gradient-to-r from-gold-500 to-gold-600 rounded-3xl p-5 flex items-center justify-between shadow-card text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Coins size={24} />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold">Solde disponible</p>
              <p className="font-display font-black text-2xl tracking-tight">{pieces?.balance || 0} pièces</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/pieces')}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold active:scale-95 transition-all flex items-center gap-1"
          >
            <span>Détails</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* GUIDE ÉTAPE PAR ÉTAPE (COMMENT ÇA MARCHE) */}
        <div className="bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-800 rounded-3xl shadow-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Info size={15} />
            </div>
            <h3 className="font-display font-bold text-dark-800 dark:text-white text-sm md:text-base">
              Fonctionnement du programme
            </h3>
          </div>

          <div className="space-y-3.5">
            {[
              {
                num: '1',
                title: 'Partagez votre code ou votre lien',
                desc: 'Envoyez votre code ou le lien direct à des producteurs, commerçants ou acheteurs.',
                icon: Share2,
                color: 'bg-blue-600',
              },
              {
                num: '2',
                title: 'Votre ami s\'inscrit',
                desc: 'Il reçoit immédiatement 10 pièces offertes pour tester la plateforme.',
                icon: UserPlus,
                color: 'bg-emerald-600',
              },
              {
                num: '3',
                title: 'Vous recevez 20 pièces',
                desc: 'Vos pièces sont créditées automatiquement dès que son inscription est enregistrée.',
                icon: Coins,
                color: 'bg-primary-600',
              },
              {
                num: '4',
                title: 'Il ouvre une boutique = +20 pièces pour vous',
                desc: 'Dès que votre filleul lance sa boutique, vous gagnez 20 pièces supplémentaires.',
                icon: Store,
                color: 'bg-gold-500',
              },
              {
                num: '5',
                title: 'Premier achat d\'au moins 5 000 FCFA',
                desc: 'Un bonus financier est crédité dans votre portefeuille MANG Wallet.',
                icon: ShoppingBag,
                color: 'bg-violet-600',
              },
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-surface-50 dark:bg-dark-950 border border-surface-100 dark:border-dark-850">
                <div className={clsx('w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5', step.color)}>
                  {step.num}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-dark-800 dark:text-white mb-0.5">{step.title}</p>
                  <p className="text-[11px] text-dark-600 dark:text-dark-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LISTE DES FILLEULS */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-display font-bold text-dark-800 dark:text-white flex items-center gap-2 text-sm md:text-base">
              <Users size={16} className="text-primary-600" />
              Mes filleuls ({referrals.length})
            </h3>
            <span className="text-xs font-semibold text-dark-500 dark:text-dark-400">
              {stats.shops} boutique{stats.shops > 1 ? 's' : ''} créée{stats.shops > 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-800 rounded-3xl shadow-card">
              <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-dark-800 text-dark-400 dark:text-dark-500 flex items-center justify-center mx-auto mb-3">
                <Users size={24} />
              </div>
              <p className="font-bold text-dark-800 dark:text-white text-sm">Aucun filleul enregistré pour le moment</p>
              <p className="text-dark-500 dark:text-dark-400 text-xs mt-1 max-w-sm mx-auto">
                Partagez votre code ou votre lien d'invitation à vos connaissances pour commencer à accumuler des pièces.
              </p>
              <button
                onClick={handleShare}
                className="mt-4 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <Share2 size={14} />
                <span>Inviter maintenant</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {referrals.map(ref => {
                let statusKey = ref.status
                if (ref.suspicious) {
                  statusKey = 'suspicious'
                } else if (ref.commission_paid) {
                  statusKey = 'cash_paid'
                }
                const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.registered
                const StatusIcon = cfg.icon

                return (
                  <div
                    key={ref.id}
                    className="bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-800 rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const target = ref.referred?.username || ref.referred?.id
                        if (target) navigate(`/profil/${target}`)
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-85 transition-opacity"
                    >
                      <Avatar src={ref.referred?.avatar_url} name={ref.referred?.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-dark-800 dark:text-white text-sm truncate hover:text-primary-600 transition-colors">
                          @{ref.referred?.username || 'utilisateur'}
                        </p>
                        <p className="text-dark-500 dark:text-dark-400 text-xs">
                          Inscrit le {new Date(ref.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </button>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold', cfg.color)}>
                        <StatusIcon size={11} />
                        <span>{cfg.label}</span>
                      </span>
                      {ref.pieces_given > 0 && !ref.suspicious && (
                        <p className="text-gold-600 dark:text-gold-400 text-xs font-bold">
                          +{ref.pieces_given} pièces
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MESSAGE TYPE PRÊT À TRANSMETTRE */}
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Share2 size={16} className="text-emerald-700 dark:text-emerald-400" />
            <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wider">
              Message d'invitation prêt à envoyer
            </h4>
          </div>

          <div className="text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed bg-white dark:bg-dark-900 rounded-2xl p-4 font-mono border border-emerald-100 dark:border-emerald-950 whitespace-pre-line select-all">
            {`Rejoignez-moi sur MANG, la marketplace agricole nouvelle génération au Bénin !

Entrez mon code parrain : ${referralCode}
Ou inscrivez-vous directement via ce lien :
${referralLink}

Vous recevrez immédiatement 10 pièces gratuites à l'inscription pour vos annonces !`}
          </div>

          <button
            onClick={handleShare}
            className="w-full mt-3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 shadow-emerald"
          >
            <Share2 size={15} />
            <span>Transmettre sur WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
