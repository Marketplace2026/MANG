import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, UserPlus, UserCheck,
  Store, MessageCircle, Share2, Grid, BookOpen,
  ChevronRight, Heart, Users, UserX, CheckCircle2,
  Phone, Calendar, Sparkles, ShieldCheck, ExternalLink,
  X, Eye, Info, MessageSquare, Award, Clock, Edit3, Briefcase
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useCacheStore } from '@/store'
import { Avatar, BottomSheet } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// Icône officielle WhatsApp SVG inline
function WhatsAppIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  )
}

// Image de couverture par défaut (nature agricole luxuriante)
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80'

export default function PublicProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuthStore()

  const cachedProfile = useCacheStore.getState().membersCache[username] || null
  const cachedPosts = useCacheStore.getState().postsCache["profile_" + username] || []
  const cachedShops = useCacheStore.getState().shopsCache["profile_" + username] || []

  const [profile, setProfile]         = useState(cachedProfile)
  const [posts, setPosts]             = useState(cachedPosts)
  const [shops, setShops]             = useState(cachedShops)
  const [loading, setLoading]         = useState(!cachedProfile)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [tab, setTab]                 = useState('posts') // 'posts' | 'shops' | 'about'
  const [stats, setStats]             = useState({ posts: 0, followers: 0, following: 0 })
  const [followersSheet, setFollowersSheet] = useState(false)
  const [followingSheet, setFollowingSheet] = useState(false)
  const [avatarLightbox, setAvatarLightbox] = useState(false)
  const [isScrolled, setIsScrolled]   = useState(false)

  const isMe = myProfile?.username === username || myProfile?.id === username || (profile && myProfile?.id === profile.id)

  // Effet de défilement pour faire apparaître le header sticky Facebook/Twitter style
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Chargement des données du profil
  const load = useCallback(async () => {
    if (!useCacheStore.getState().membersCache[username]) {
      setLoading(true)
    }

    // Supporte soit l'ID UUID (depuis une notification), soit le pseudo username
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)
    let query = supabase.from('profiles').select('*')
    if (isUuid) {
      query = query.eq('id', username)
    } else {
      query = query.eq('username', username.toLowerCase())
    }
    const { data: prof } = await query.maybeSingle()

    if (!prof) {
      setLoading(false)
      return
    }

    setProfile(prof)
    useCacheStore.getState().setMembers(username, prof)
    if (prof.username) {
      useCacheStore.getState().setMembers(prof.username, prof)
    }

    // Publications du profil
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, user:profiles!posts_user_id_fkey(id, username, avatar_url), shop:shops(id, name, slug, cover_url)')
      .eq('user_id', prof.id)
      .order('created_at', { ascending: false })
      .limit(30)

    setPosts(postsData || [])
    useCacheStore.getState().setPosts("profile_" + (prof.username || prof.id), postsData || [])

    // Boutiques actives du profil
    const { data: shopsData } = await supabase
      .from('shops')
      .select('id, name, slug, cover_url, city, followers_count, premium_level, is_active, is_verified, category, description')
      .eq('owner_id', prof.id)
      .eq('is_active', true)
      .order('followers_count', { ascending: false })

    setShops(shopsData || [])
    useCacheStore.getState().setShops("profile_" + (prof.username || prof.id), shopsData || [])

    // Statistiques abonnés / abonnements
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
    ])

    setStats({
      posts: postsData?.length || 0,
      followers: followersCount || 0,
      following: followingCount || 0,
    })

    // État d'abonnement (si l'utilisateur connecté suit ce profil)
    if (user && user.id !== prof.id) {
      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', prof.id)
        .maybeSingle()
      setIsFollowing(!!followData)
    }

    setLoading(false)
  }, [username, user])

  useEffect(() => { load() }, [load])

  // Suivre / Ne plus suivre avec mise à jour optimiste
  const toggleFollow = async () => {
    if (!user) {
      toast.error('Connectez-vous pour suivre ce profil')
      navigate('/connexion')
      return
    }
    if (followLoading) return
    setFollowLoading(true)

    const prevFollowing = isFollowing
    setIsFollowing(!prevFollowing)
    setStats(s => ({ ...s, followers: s.followers + (prevFollowing ? -1 : 1) }))

    try {
      if (prevFollowing) {
        const { error } = await supabase.from('user_follows')
          .delete().eq('follower_id', user.id).eq('following_id', profile.id)
        if (error) throw error
        toast('Abonnement retiré', { icon: '👋' })
      } else {
        const { error } = await supabase.from('user_follows')
          .insert({ follower_id: user.id, following_id: profile.id })
        if (error) throw error

        // Notification envoyée au profil suivi
        await supabase.rpc('create_notification', {
          p_user_id: profile.id,
          p_type: 'user_follow',
          p_title: '🔔 Nouveau follower',
          p_body: `@${myProfile?.username || 'Un utilisateur'} vous suit maintenant`,
          p_reference_id: user.id,
          p_reference_type: 'profile',
        })
        toast.success(`Vous suivez désormais @${profile.username} !`)
      }
    } catch (err) {
      console.error(err)
      setIsFollowing(prevFollowing)
      setStats(s => ({ ...s, followers: s.followers + (prevFollowing ? 1 : -1) }))
      toast.error("Une erreur est survenue")
    } finally {
      setFollowLoading(false)
    }
  }

  // Partager le profil
  const handleShare = () => {
    const url = `${window.location.origin}/profil/${profile?.username || profile?.id}`
    const shareData = {
      title: `${profile?.full_name || profile?.username} sur MANG Africa`,
      text: `Découvrez le profil agricole de ${profile?.full_name || profile?.username} sur MANG :`,
      url
    }
    if (navigator.share) {
      navigator.share(shareData).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Lien du profil copié ! Prêt à partager.')
    }
  }

  // Ouvrir ou créer une conversation directe
  const handleMessage = async () => {
    if (!user) {
      toast.error('Connectez-vous pour envoyer un message')
      navigate('/connexion')
      return
    }
    if (user.id === profile?.id) {
      toast('C’est votre propre profil', { icon: 'ℹ️' })
      return
    }
    const toastId = toast.loading('Ouverture de la discussion...')
    try {
      // 1. Vérifier si une conversation existe déjà
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(buyer_id.eq.${user.id},seller_id.eq.${profile.id}),and(buyer_id.eq.${profile.id},seller_id.eq.${user.id})`)
        .maybeSingle()

      if (conv) {
        toast.dismiss(toastId)
        navigate(`/messages?conv=${conv.id}`)
        return
      }

      // 2. Trouver si l'un ou l'autre a une boutique (optionnel)
      const { data: targetShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', profile.id)
        .maybeSingle()

      // 3. Créer la conversation avec buyer_id et seller_id
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          buyer_id: user.id,
          seller_id: profile.id,
          shop_id: targetShop?.id || null
        })
        .select('id')
        .single()

      if (error) throw error
      toast.dismiss(toastId)
      navigate(`/messages?conv=${newConv.id}`)
    } catch (e) {
      toast.dismiss(toastId)
      console.warn('[Profile] Redirection messagerie:', e)
      navigate('/messages')
    }
  }

  // Ouvrir WhatsApp en direct avec message d'accroche pré-rempli
  const handleWhatsApp = () => {
    if (!profile?.phone) {
      toast('Ce membre n’a pas encore renseigné de numéro WhatsApp', { icon: 'ℹ️' })
      return
    }
    let raw = profile.phone.replace(/[^0-9]/g, '')
    // Si numéro local sans indicatif (Bénin 8 chiffres), ajouter 229
    if (raw.length === 8) raw = '229' + raw
    const msg = encodeURIComponent(`Bonjour @${profile.username}, je vous contacte depuis votre profil sur la plateforme MANG Africa !`)
    window.open(`https://wa.me/${raw}?text=${msg}`, '_blank')
  }

  // Lancer un appel téléphonique classique
  const handleCall = () => {
    if (!profile?.phone) {
      toast('Aucun numéro de téléphone disponible', { icon: 'ℹ️' })
      return
    }
    window.location.href = `tel:${profile.phone}`
  }

  if (loading) return <PublicProfileSkeleton/>

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500 shadow-sm">
          <UserX size={42} strokeWidth={1.8} />
        </div>
        <h2 className="font-display font-black text-dark-900 text-2xl mb-1">Profil introuvable</h2>
        <p className="text-dark-600/70 text-sm max-w-xs mb-6">
          Ce profil n'existe pas ou a peut-être changé de nom d'utilisateur.
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-green active:scale-95 transition"
        >
          Retour au Marché
        </button>
      </div>
    )
  }

  // Calcul statut En Ligne (dernière activité < 3 minutes)
  const isOnline = profile.last_seen_at
    ? (Date.now() - new Date(profile.last_seen_at).getTime()) < 180000
    : false

  // Formatage date d'adhésion
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null

  const isVerifiedProducer = profile.badges?.includes('Producteur Vérifié') || shops.some(s => s.is_verified)

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24 text-dark-900">

      {/* ── 1. HEADER STICKY AU SCROLL (Style Facebook / Twitter) ── */}
      <header
        className={clsx(
          "fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-200 px-4 h-14 flex items-center justify-between transition-all duration-300 max-w-[var(--content-max-width)] mx-auto",
          isScrolled ? "opacity-100 translate-y-0 shadow-sm" : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-surface-100 active:scale-90 transition">
            <ArrowLeft size={20} className="text-dark-800" />
          </button>
          <div className="flex items-center gap-2">
            <Avatar src={profile.avatar_url} name={profile.username} size="sm" />
            <div className="leading-tight">
              <p className="font-bold text-dark-900 text-sm truncate max-w-[150px]">
                {profile.full_name || profile.username}
              </p>
              <p className="text-[11px] text-dark-500">@{profile.username}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isMe && (
            <button
              onClick={toggleFollow}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 flex items-center gap-1.5 shadow-sm",
                isFollowing ? "bg-surface-200 text-dark-800" : "bg-primary-600 text-white"
              )}
            >
              {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
              <span>{isFollowing ? 'Abonné' : 'Suivre'}</span>
            </button>
          )}
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-surface-100 active:scale-90 transition text-dark-700">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* ── 2. HERO COVER (Photo de Couverture Facebook Style) ── */}
      <div className="relative w-full h-48 md:h-64 bg-primary-950 overflow-hidden">
        <img
          src={DEFAULT_COVER}
          alt="Couverture"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Boutons de navigation en haut de la couverture */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition shadow-md"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition shadow-md"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* ── 3. CARTE PRINCIPALE DU PROFIL (Style Facebook / WhatsApp) ── */}
      <div className="max-w-[var(--content-max-width)] mx-auto px-4 -mt-16 relative z-20">
        <div className="bg-white rounded-3xl shadow-sm border border-surface-200/80 p-5">

          {/* Avatar avec halo et indicateur WhatsApp en direct */}
          <div className="flex flex-col items-center -mt-16 text-center">
            <div
              className="relative cursor-pointer group"
              onClick={() => setAvatarLightbox(true)}
              title="Voir la photo en grand"
            >
              <div className="w-28 h-28 rounded-full ring-4 ring-white shadow-xl overflow-hidden bg-white">
                <Avatar src={profile.avatar_url} name={profile.username} size="2xl" className="w-full h-full object-cover" />
              </div>
              {/* Badge En ligne / WhatsApp Status */}
              <div
                className={clsx(
                  "absolute bottom-1 right-2 px-2 py-0.5 rounded-full border-2 border-white flex items-center gap-1 shadow-md text-[10px] font-bold text-white",
                  isOnline ? "bg-emerald-500" : "bg-dark-500/80 backdrop-blur-sm"
                )}
              >
                <span className={clsx("w-2 h-2 rounded-full bg-white", isOnline && "animate-pulse")} />
                <span>{isOnline ? 'En ligne' : 'Vu réc.'}</span>
              </div>
            </div>

            {/* Nom, Vérification et Pseudo */}
            <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
              <h1 className="font-display font-black text-2xl text-dark-900 tracking-tight">
                {profile.full_name || profile.username}
              </h1>
              {isVerifiedProducer && (
                <span title="Producteur vérifié MANG" className="inline-flex text-emerald-600">
                  <CheckCircle2 size={20} className="fill-emerald-600 text-white" />
                </span>
              )}
            </div>
            <p className="text-primary-700 font-bold text-sm mt-0.5">@{profile.username}</p>

            {/* Badges honorifiques MANG */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5 justify-center">
                {profile.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-800 border border-primary-200/60"
                  >
                    <Sparkles size={11} className="text-gold-500" />
                    <span>{badge}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bio / Actu (Style WhatsApp "About") */}
            {profile.bio ? (
              <div className="mt-3 max-w-md bg-surface-50 border border-surface-200/60 rounded-2xl p-3 text-dark-700 text-sm leading-relaxed text-center">
                <span className="text-primary-600 font-bold mr-1">“</span>
                {profile.bio}
                <span className="text-primary-600 font-bold ml-1">”</span>
              </div>
            ) : (
              <p className="text-xs text-dark-400 mt-2 italic">Aucune biographie rédigée pour le moment.</p>
            )}

            {/* Puces d'informations rapides (Facebook Intro) */}
            <div className="flex flex-wrap items-center justify-center gap-y-1.5 gap-x-4 mt-3 text-xs text-dark-600">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-primary-600" />
                  <span>{profile.city}</span>
                </span>
              )}
              {memberSince && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-dark-400" />
                  <span>Membre depuis {memberSince}</span>
                </span>
              )}
              {shops.length > 0 && (
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Store size={13} />
                  <span>{shops.length} boutique{shops.length > 1 ? 's' : ''} officielle{shops.length > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>

            {/* ── BARRE D'ACTIONS CALL-TO-ACTION (Facebook / WhatsApp Action Buttons) ── */}
            <div className="w-full mt-5 pt-4 border-t border-surface-100 flex flex-wrap gap-2.5 justify-center">
              {isMe ? (
                <button
                  onClick={() => navigate('/profil')}
                  className="w-full py-3 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-green active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Edit3 size={16} />
                  <span>Modifier mes informations</span>
                </button>
              ) : (
                <>
                  {/* Bouton Suivre */}
                  <button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    className={clsx(
                      "flex-1 min-w-[130px] py-3 px-4 rounded-2xl font-bold text-sm shadow-sm active:scale-95 transition flex items-center justify-center gap-2",
                      isFollowing
                        ? "bg-surface-100 text-dark-800 border border-surface-200 hover:bg-surface-200"
                        : "bg-primary-600 hover:bg-primary-700 text-white shadow-green"
                    )}
                  >
                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    <span>{isFollowing ? 'Abonné' : 'Suivre'}</span>
                  </button>

                  {/* Bouton Message MANG */}
                  <button
                    onClick={handleMessage}
                    className="flex-1 min-w-[120px] py-3 px-4 rounded-2xl bg-surface-100 hover:bg-surface-200 text-dark-800 font-bold text-sm active:scale-95 transition flex items-center justify-center gap-2 border border-surface-200/80"
                  >
                    <MessageCircle size={16} className="text-primary-700" />
                    <span>Message</span>
                  </button>

                  {/* Bouton WhatsApp officiel en direct */}
                  {profile.phone && (
                    <button
                      onClick={handleWhatsApp}
                      className="py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-sm active:scale-95 transition flex items-center justify-center gap-2"
                      title="Discuter directement sur WhatsApp"
                    >
                      <WhatsAppIcon size={18} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  )}

                  {/* Bouton Appel téléphonique direct */}
                  {profile.phone && (
                    <button
                      onClick={handleCall}
                      className="py-3 px-3.5 rounded-2xl bg-surface-100 hover:bg-surface-200 text-dark-700 font-bold active:scale-95 transition border border-surface-200/80"
                      title="Appeler au téléphone"
                    >
                      <Phone size={16} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ── COMPTEURS SOCIAUX INTERACTIFS (Instagram / TikTok Style) ── */}
            <div className="grid grid-cols-3 w-full gap-2 mt-5 pt-4 border-t border-surface-100 text-center">
              <button
                onClick={() => setTab('posts')}
                className="p-2 rounded-2xl hover:bg-surface-50 transition active:scale-95"
              >
                <p className="font-display font-black text-xl text-dark-900">{stats.posts}</p>
                <p className="text-[11px] font-semibold text-dark-500 uppercase tracking-wide mt-0.5">Publications</p>
              </button>

              <button
                onClick={() => setFollowersSheet(true)}
                className="p-2 rounded-2xl hover:bg-surface-50 transition active:scale-95 border-x border-surface-100"
              >
                <p className="font-display font-black text-xl text-dark-900">{stats.followers}</p>
                <p className="text-[11px] font-semibold text-dark-500 uppercase tracking-wide mt-0.5">Abonnés</p>
              </button>

              <button
                onClick={() => setFollowingSheet(true)}
                className="p-2 rounded-2xl hover:bg-surface-50 transition active:scale-95"
              >
                <p className="font-display font-black text-xl text-dark-900">{stats.following}</p>
                <p className="text-[11px] font-semibold text-dark-500 uppercase tracking-wide mt-0.5">Abonnements</p>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── 4. ONGLETS DE NAVIGATION (Style Facebook & Instagram) ── */}
      <div className="max-w-[var(--content-max-width)] mx-auto px-4 mt-4">
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-surface-200/80 flex gap-1">
          <button
            onClick={() => setTab('posts')}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
              tab === 'posts' ? "bg-primary-600 text-white shadow-sm" : "text-dark-600 hover:bg-surface-100"
            )}
          >
            <BookOpen size={14} />
            <span>Publications ({stats.posts})</span>
          </button>

          <button
            onClick={() => setTab('shops')}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
              tab === 'shops' ? "bg-primary-600 text-white shadow-sm" : "text-dark-600 hover:bg-surface-100"
            )}
          >
            <Store size={14} />
            <span>Boutiques ({shops.length})</span>
          </button>

          <button
            onClick={() => setTab('about')}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
              tab === 'about' ? "bg-primary-600 text-white shadow-sm" : "text-dark-600 hover:bg-surface-100"
            )}
          >
            <Info size={14} />
            <span>À propos</span>
          </button>
        </div>
      </div>

      {/* ── 5. CONTENU DES ONGLETS ── */}
      <div className="max-w-[var(--content-max-width)] mx-auto px-4 mt-4">

        {/* ── ONGLET 1 : PUBLICATIONS DU PROFIL ── */}
        {tab === 'posts' && (
          <div className="space-y-3.5">
            {posts.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-3xl border border-surface-200/80 p-6">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3 text-dark-400">
                  <BookOpen size={30} />
                </div>
                <h3 className="font-display font-bold text-dark-900 text-base">Aucune publication pour le moment</h3>
                <p className="text-dark-500 text-xs mt-1 max-w-xs mx-auto">
                  {isMe ? 'Partagez vos actualités, récoltes ou conseils sur la communauté !' : `@${profile.username} n'a pas encore partagé d'article sur MANG.`}
                </p>
                {isMe && (
                  <button
                    onClick={() => navigate('/communaute')}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                  >
                    Publier sur la communauté
                  </button>
                )}
              </div>
            ) : (
              posts.map(post => (
                <MiniPostCard key={post.id} post={post} />
              ))
            )}
          </div>
        )}

        {/* ── ONGLET 2 : BOUTIQUES DU PROFIL ── */}
        {tab === 'shops' && (
          <div className="space-y-3.5">
            {shops.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-3xl border border-surface-200/80 p-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <Store size={30} />
                </div>
                <h3 className="font-display font-bold text-dark-900 text-base">Aucune boutique active</h3>
                <p className="text-dark-500 text-xs mt-1 max-w-xs mx-auto">
                  {isMe ? 'Créez votre première boutique en quelques minutes et commencez à vendre directement !' : `@${profile.username} n'a pas encore ouvert de boutique sur MANG.`}
                </p>
                {isMe && (
                  <button
                    onClick={() => navigate('/vendeur')}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                  >
                    Ouvrir une boutique
                  </button>
                )}
              </div>
            ) : (
              shops.map(shop => (
                <MiniShopCard key={shop.id} shop={shop} />
              ))
            )}
          </div>
        )}

        {/* ── ONGLET 3 : À PROPOS DÉTAILLÉ & CONTACT ── */}
        {tab === 'about' && (
          <div className="bg-white rounded-3xl border border-surface-200/80 p-5 space-y-4">
            <h3 className="font-display font-bold text-dark-900 text-base border-b border-surface-100 pb-3 flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-600" />
              <span>Informations Générales & Confiance</span>
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-50 border border-surface-100">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-xs text-dark-400 font-medium">Nom complet</p>
                  <p className="font-bold text-dark-900">{profile.full_name || 'Non renseigné'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-50 border border-surface-100">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-xs text-dark-400 font-medium">Localisation</p>
                  <p className="font-bold text-dark-900">{profile.city || 'Bénin'}</p>
                </div>
              </div>

              {profile.phone && (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-50 border border-surface-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Phone size={16} />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-dark-400 font-medium">Ligne directe & WhatsApp</p>
                      <p className="font-bold text-dark-900">{profile.phone}</p>
                    </div>
                    <button
                      onClick={handleWhatsApp}
                      className="px-3 py-1 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#20bd5a] transition"
                    >
                      Écrire
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-50 border border-surface-100">
                <div className="w-8 h-8 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center shrink-0">
                  <Award size={16} />
                </div>
                <div>
                  <p className="text-xs text-dark-400 font-medium">Statut du compte</p>
                  <p className="font-bold text-dark-900 flex items-center gap-1">
                    <span>Membre vérifié MANG</span>
                    <CheckCircle2 size={14} className="text-emerald-500 fill-emerald-500 text-white" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL LIGHTBOX AVATAR (Plein écran au clic comme WhatsApp) ── */}
      {avatarLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setAvatarLightbox(false)}
        >
          <button
            onClick={() => setAvatarLightbox(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X size={22} />
          </button>
          <div className="max-w-md w-full p-2 text-center" onClick={e => e.stopPropagation()}>
            <img
              src={profile.avatar_url || '/logo-mang.png'}
              alt={profile.username}
              className="w-72 h-72 md:w-80 md:h-80 rounded-3xl object-cover mx-auto shadow-2xl ring-4 ring-white/20"
            />
            <h3 className="font-display font-bold text-white text-xl mt-4">
              {profile.full_name || profile.username}
            </h3>
            <p className="text-primary-300 text-sm">@{profile.username}</p>
          </div>
        </div>
      )}

      {/* Feuillets abonnés / abonnements */}
      <FollowSheet
        open={followersSheet}
        onClose={() => setFollowersSheet(false)}
        profileId={profile.id}
        type="followers"
        title="Abonnés"
      />
      <FollowSheet
        open={followingSheet}
        onClose={() => setFollowingSheet(false)}
        profileId={profile.id}
        type="following"
        title="Abonnements"
      />
    </div>
  )
}

// ── MINI CARTE DE PUBLICATION COMMUNAUTAIRE ──
function MiniPostCard({ post }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate('/communaute', { state: { openPostId: post.id } })}
      className="bg-white rounded-3xl shadow-sm border border-surface-200/80 p-4 cursor-pointer hover:border-primary-300 transition active:scale-[0.99]"
    >
      {post.image_url && (
        <div className="mb-3 rounded-2xl overflow-hidden bg-surface-100 max-h-64">
          <img src={post.image_url} alt="post" className="w-full h-full object-cover" />
        </div>
      )}
      {post.content && (
        <p className="text-dark-800 text-sm leading-relaxed line-clamp-3">{post.content}</p>
      )}
      {post.shop && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-800 rounded-xl text-xs font-semibold">
          <Store size={12} className="text-primary-600" />
          <span>{post.shop.name}</span>
        </div>
      )}
      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-surface-100 text-xs text-dark-500">
        <span className="flex items-center gap-1">
          <Heart size={14} className="text-red-500 fill-red-500" />
          <span>{post.likes_count || 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={14} className="text-primary-600" />
          <span>{post.comments_count || 0} avis</span>
        </span>
        <span className="ml-auto text-[11px] text-dark-400">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
    </div>
  )
}

// ── MINI CARTE DE BOUTIQUE PRO ──
function MiniShopCard({ shop }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/boutique/${shop.slug}`)}
      className="bg-white rounded-3xl shadow-sm border border-surface-200/80 p-3.5 flex items-center gap-3.5 cursor-pointer hover:border-emerald-300 transition active:scale-[0.99]"
    >
      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-100 shrink-0 border border-surface-200/60 shadow-inner">
        {shop.cover_url ? (
          <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🌾</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-bold text-dark-900 text-sm truncate">{shop.name}</h4>
          {shop.is_verified && (
            <CheckCircle2 size={14} className="text-emerald-600 fill-emerald-600 text-white shrink-0" />
          )}
        </div>
        {shop.city && (
          <p className="text-dark-500 text-xs mt-0.5 flex items-center gap-1">
            <MapPin size={11} className="text-primary-600" />
            <span>{shop.city}</span>
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-dark-600 font-semibold bg-surface-100 px-2 py-0.5 rounded-lg">
            {shop.followers_count || 0} abonnés
          </span>
          {shop.category && (
            <span className="text-[11px] text-primary-700 bg-primary-50 px-2 py-0.5 rounded-lg font-medium">
              {shop.category}
            </span>
          )}
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-dark-400 shrink-0">
        <ChevronRight size={18} />
      </div>
    </div>
  )
}

// ── FEUILLE LATÉRALE ABONNÉS / ABONNEMENTS ──
function FollowSheet({ open, onClose, profileId, type, title }) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const query = type === 'followers'
      ? supabase.from('user_follows').select('user:profiles!follower_id(id, username, avatar_url, city, full_name)').eq('following_id', profileId)
      : supabase.from('user_follows').select('user:profiles!following_id(id, username, avatar_url, city, full_name)').eq('follower_id', profileId)

    query.then(({ data }) => {
      setPeople((data || []).map(d => d.user).filter(Boolean))
      setLoading(false)
    })
  }, [open, profileId, type])

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="px-4 py-2 pb-8 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-1/3" />
                  <div className="h-3 skeleton rounded-lg w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <div className="text-center py-10 text-dark-500">
            <Users size={36} className="mx-auto mb-2 text-dark-300" />
            <p className="font-semibold text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {people.map(person => (
              <button
                key={person.id}
                onClick={() => {
                  navigate(`/profil/${person.username}`)
                  onClose()
                }}
                className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-surface-50 active:scale-98 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={person.avatar_url} name={person.username} size="md" />
                  <div>
                    <p className="font-bold text-dark-900 text-sm">
                      {person.full_name || `@${person.username}`}
                    </p>
                    <p className="text-dark-500 text-xs">@{person.username}</p>
                  </div>
                </div>
                {person.city && (
                  <span className="text-[11px] text-dark-400 bg-surface-100 px-2 py-1 rounded-lg">
                    {person.city}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ── SKELETON LOADER MODERNE ──
function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="h-48 bg-primary-900/60 skeleton" />
      <div className="max-w-[var(--content-max-width)] mx-auto px-4 -mt-16">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-200/80 space-y-4">
          <div className="w-24 h-24 rounded-full skeleton mx-auto -mt-16 ring-4 ring-white" />
          <div className="h-6 skeleton rounded-xl w-1/3 mx-auto" />
          <div className="h-4 skeleton rounded-lg w-1/4 mx-auto" />
          <div className="h-12 skeleton rounded-2xl w-full" />
        </div>
      </div>
    </div>
  )
}
