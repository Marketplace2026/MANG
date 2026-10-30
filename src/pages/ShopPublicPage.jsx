import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, Users, MessageCircle, Share2,
  MapPin, Truck, Phone, ChevronRight,
  Send, Trash2, Edit3, CornerDownRight, Copy,
  Check, X, ZoomIn, ShoppingCart, Package,
  MoreHorizontal, ChevronDown, Bell, BellOff, Star, Search, Store, ShieldCheck,
  Sparkles, Filter, Calendar, Award, CheckCircle2, SlidersHorizontal
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { useCartStore } from '@/store'
import { Avatar, PremiumBadge, BottomSheet, Modal, Button } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const AVAIL_LABELS = {
  now: 'Disponible maintenant',
  '1w': '⏳ Dans 1 semaine',
  '2w': '⏳ Dans 2 semaines',
  '1m': 'Dans 1 mois',
  '2m': 'Dans 2 mois',
  '3m': 'Dans 3 mois',
  '6m': 'Dans 6 mois',
  '1y': 'Dans 1 an',
}

export default function ShopPublicPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const cartItems = useCartStore(state => state.items)
  const cartCount = cartItems.reduce((acc, item) => acc + (item.qty || 1), 0)

  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likers, setLikers] = useState([])
  const [showLikers, setShowLikers] = useState(false)
  const [showFollowers, setShowFollowers] = useState(false)
  const [followers, setFollowers] = useState([])
  const [linkCopied, setLinkCopied] = useState(false)
  const [zoomImage, setZoomImage] = useState(null)
  const [orderModal, setOrderModal] = useState(null)
  const [reviews, setReviews] = useState([])
  const [showReviews, setShowReviews] = useState(false)
  const [reviewModal, setReviewModal] = useState(false)
  const [myReview, setMyReview] = useState(null)
  const [userHasPurchased, setUserHasPurchased] = useState(false)

  // NOUVEAUX ÉTATS D'ARCHITECTURE : ONGLETS, RECHERCHE & TRI
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'reviews' | 'about'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('all') // 'all' | 'traceable' | 'price_asc' | 'price_desc'

  const filteredProducts = useMemo(() => {
    let list = [...products]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    }
    if (sortBy === 'traceable') {
      list = list.filter(p => p.production_cycles && p.production_cycles.length > 0)
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    }
    return list
  }, [products, searchQuery, sortBy])

  const loadShop = useCallback(async () => {
    setLoading(true)
    const isUUID = /^[0-9a-f-]{36}$/.test(slug)
    let query = supabase.from('shops').select(`*, owner:profiles(id, username, full_name, avatar_url, last_seen_at, city)`)
    query = isUUID ? query.eq('id', slug) : query.eq('slug', slug)
    const { data } = await query.single()
    if (!data) { setLoading(false); return }
    setShop(data)

    const { data: prods } = await supabase.from('products').select('*, production_cycles(id)')
      .eq('shop_id', data.id).eq('is_available', true).order('created_at', { ascending: false })
    setProducts(prods || [])

    const { data: likerData } = await supabase.from('shop_likes')
      .select('user:profiles(id, username, avatar_url)').eq('shop_id', data.id)
    setLikers(likerData || [])

    const { data: followerData } = await supabase.from('shop_followers')
      .select('user:profiles(id, username, avatar_url, city)').eq('shop_id', data.id)
    setFollowers(followerData || [])

    // Reviews
    const { data: reviewData } = await supabase
      .from('shop_reviews')
      .select('*, user:profiles(id, username, avatar_url)')
      .eq('shop_id', data.id)
      .order('created_at', { ascending: false })
    setReviews(reviewData || [])

    if (user) {
      const [fRes, lRes, myRevRes, orderRes] = await Promise.all([
        supabase.from('shop_followers').select('id').eq('shop_id', data.id).eq('user_id', user.id).single(),
        supabase.from('shop_likes').select('id').eq('shop_id', data.id).eq('user_id', user.id).single(),
        supabase.from('shop_reviews').select('*').eq('shop_id', data.id).eq('user_id', user.id).single(),
        supabase.from('orders').select('id').eq('shop_id', data.id).eq('buyer_id', user.id).limit(1),
      ])
      setIsFollowing(!!fRes.data)
      setIsLiked(!!lRes.data)
      setMyReview(myRevRes.data || null)
      setUserHasPurchased(Boolean(orderRes.data && orderRes.data.length > 0))
    }
    setLoading(false)
  }, [slug, user])

  useEffect(() => { loadShop() }, [loadShop])

  const toggleFollow = async () => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    if (isFollowing) {
      const { error } = await supabase.from('shop_followers').delete().eq('shop_id', shop.id).eq('user_id', user.id)
      if (error) { toast.error('Erreur'); return }
      setIsFollowing(false)
      setShop(s => ({ ...s, followers_count: Math.max(0, s.followers_count - 1) }))
      setFollowers(prev => prev.filter(f => f.user?.id !== user.id))
    } else {
      const { error } = await supabase.from('shop_followers').insert({ shop_id: shop.id, user_id: user.id })
      if (error) { toast.error('Erreur'); return }
      setIsFollowing(true)
      setShop(s => ({ ...s, followers_count: s.followers_count + 1 }))
      setFollowers(prev => [...prev, { user: { id: user.id, username: profile?.username, avatar_url: profile?.avatar_url } }])
      if (shop.owner_id !== user.id) {
        const { error: notifErr } = await supabase.rpc('create_notification', {
          p_user_id: shop.owner_id, p_type: 'shop_follow',
          p_title: '🔔 Nouveau abonné',
          p_body: `@${profile?.username} suit votre boutique "${shop.name}"`,
          p_reference_id: shop.id, p_reference_type: 'shop', })
          if (notifErr) { console.error(notifErr); alert('Erreur Notif: ' + notifErr.message); }
      }
      toast.success('Boutique suivie !')
    }
  }

  const toggleLike = async () => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    if (isLiked) {
      const { error } = await supabase.from('shop_likes').delete().eq('shop_id', shop.id).eq('user_id', user.id)
      if (error) { toast.error('Erreur'); return }
      setIsLiked(false)
      setShop(s => ({ ...s, likes_count: Math.max(0, s.likes_count - 1) }))
      setLikers(prev => prev.filter(l => l.user?.id !== user.id))
    } else {
      const { error } = await supabase.from('shop_likes').insert({ shop_id: shop.id, user_id: user.id })
      if (error) { toast.error('Erreur'); return }
      setIsLiked(true)
      setShop(s => ({ ...s, likes_count: s.likes_count + 1 }))
      setLikers(prev => [...prev, { user: { id: user.id, username: profile?.username, avatar_url: profile?.avatar_url } }])
      if (shop.owner_id !== user.id) {
        const { error: notifErr } = await supabase.rpc('create_notification', {
          p_user_id: shop.owner_id, p_type: 'shop_like',
          p_title: '❤️ Nouveau like',
          p_body: `@${profile?.username} aime votre boutique "${shop.name}"`,
          p_reference_id: shop.id, p_reference_type: 'shop', })
          if (notifErr) { console.error(notifErr); alert('Erreur Notif: ' + notifErr.message); }
      }
    }
  }

  const handleContact = async () => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    if (shop.owner_id === user.id) { toast.error('C\'est votre boutique'); return }
    const { data: existing } = await supabase.from('conversations').select('id')
      .eq('shop_id', shop.id).eq('buyer_id', user.id).maybeSingle()
    let convId = existing?.id
    if (!convId) {
      const { data: newConv } = await supabase.from('conversations').insert({
        shop_id: shop.id, buyer_id: user.id, seller_id: shop.owner_id,
      }).select('id').single()
      convId = newConv?.id
    }
    navigate(`/messages?conv=${convId || ''}`)
    toast.success('Conversation ouverte !')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: shop.name, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      toast.success('Lien copié !')
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  if (loading) return <ShopSkeleton/>
  if (!shop) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-2 text-dark-400"><Search size={32} /></div>
      <p className="font-display text-xl font-bold text-dark-800">Boutique introuvable</p>
      <Button variant="primary" onClick={() => navigate('/')}>Retour</Button>
    </div>
  )

  const isOnline = shop.owner?.last_seen_at
    ? (new Date() - new Date(shop.owner.last_seen_at)) < 120000 : false

  const premiumConfig = {
    3: { label: 'Premium Or', gradient: 'from-yellow-400 to-amber-500', stars: 3 },
    2: { label: 'Premium Argent', gradient: 'from-slate-300 to-slate-500', stars: 2 },
    1: { label: 'Premium Bronze', gradient: 'from-amber-600 to-amber-800', stars: 1 },
  }[shop.premium_level] || null

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ══════ HEADER COMPACT ══════ */}
      <div className="relative">
        {/* Cover image */}
        <div className="relative w-full h-44 overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900"
          onClick={() => shop.cover_url && setZoomImage(shop.cover_url)}>
          {shop.cover_url && (
            <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30"/>

          {/* Nav */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-10 pb-2">
            <button onClick={e => { e.stopPropagation(); navigate(-1) }}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90">
              <ArrowLeft size={16} className="text-white"/>
            </button>
            <div className="flex gap-1.5">
              {premiumConfig && (
                <div className={clsx('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white',
                  `bg-gradient-to-r ${premiumConfig.gradient}`)}>
                  {'⭐'.repeat(premiumConfig.stars)} {premiumConfig.label}
                </div>
              )}
              <button onClick={e => { e.stopPropagation(); handleShare() }}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90">
                {linkCopied ? <Check size={14} className="text-emerald-400"/> : <Share2 size={14} className="text-white"/>}
              </button>
            </div>
          </div>
        </div>

        {/* Profil info — overlap sur la cover */}
        <div className="bg-white px-4 pt-3 pb-4 shadow-sm">
          <div className="flex items-center gap-3 -mt-8 mb-3">
            {/* Avatar rond comme les cartes */}
            <div
              onClick={() => {
                const target = shop.owner?.username || shop.owner_id
                if (target) navigate(`/profil/${target}`)
              }}
              title="Voir le profil du propriétaire"
              className="relative flex-shrink-0 cursor-pointer group active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg ring-2 ring-gray-100 group-hover:ring-emerald-400 transition-all">
                {shop.owner?.avatar_url
                  ? <img src={shop.owner.avatar_url} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center font-black text-2xl text-white"
                      style={{ background: `hsl(${(shop.name?.charCodeAt(0) || 0) * 137 % 360}, 60%, 45%)` }}>
                      {(shop.owner?.username || shop.name || '?')[0].toUpperCase()}
                    </div>}
              </div>
              {isOnline && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"/>}
            </div>

            <div className="flex-1 min-w-0 pt-8">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-black text-dark-900 text-lg leading-tight">{shop.name}</h1>
                {shop.is_verified && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 rounded-full flex-shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-blue-600 text-[10px] font-bold">Vérifié</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = shop.owner?.username || shop.owner_id
                    if (target) navigate(`/profil/${target}`)
                  }}
                  className="text-gray-500 hover:text-emerald-700 hover:underline text-xs font-semibold cursor-pointer text-left"
                >
                  @{shop.owner?.username}
                  {shop.city && <span className="text-gray-400 ml-1 inline-flex items-center gap-0.5">· <MapPin size={10} />{shop.city}</span>}
                </button>
                {shop.reviews_count > 0 && (
                  <button onClick={() => setShowReviews(true)}
                    className="flex items-center gap-0.5 active:scale-95">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="10" height="10" viewBox="0 0 24 24"
                          fill={s <= Math.round(shop.rating_avg) ? '#f59e0b' : 'none'}
                          stroke="#f59e0b" strokeWidth="1.5">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                        </svg>
                      ))}
                    </div>
                    <span className="text-amber-600 text-[11px] font-bold">{Number(shop.rating_avg).toFixed(1)}</span>
                    <span className="text-gray-400 text-[10px]">({shop.reviews_count})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {shop.description && (
            <div className="mb-3 overflow-hidden">
              <div className="overflow-hidden whitespace-nowrap">
                <span className="inline-block text-gray-600 text-[13px] leading-relaxed"
                  style={{ animation: shop.description.length > 35 ? `scrollLoop ${Math.max(10, shop.description.length * 0.3)}s linear infinite` : 'none' }}>
                  {shop.description}{shop.description.length > 35 && <>&nbsp;&nbsp;&nbsp;{shop.description}</>}
                </span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => setShowLikers(true)} className="flex items-center gap-1.5 active:scale-95">
              <span className="font-black text-dark-900 text-base">{shop.likes_count || 0}</span>
              <span className="text-gray-400 text-xs">J'aimes</span>
              <div className="flex -space-x-1 ml-0.5">
                {likers.slice(0,3).map((l,i) => <Avatar key={i} src={l.user?.avatar_url} name={l.user?.username} size="xs" className="ring-1 ring-white"/>)}
              </div>
            </button>
            <span className="text-gray-200">|</span>
            <button onClick={() => setShowFollowers(true)} className="flex items-center gap-1.5 active:scale-95">
              <span className="font-black text-dark-900 text-base">{shop.followers_count || 0}</span>
              <span className="text-gray-400 text-xs">Abonnés</span>
              <div className="flex -space-x-1 ml-0.5">
                {followers.slice(0,3).map((f,i) => <Avatar key={i} src={f.user?.avatar_url} name={f.user?.username} size="xs" className="ring-1 ring-white"/>)}
              </div>
            </button>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-dark-900 text-base">{products.length}</span>
              <span className="text-gray-400 text-xs">Produits</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {shop.has_delivery && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                <Truck size={10}/> Livraison
              </span>
            )}
            {isOnline && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[11px] font-bold border border-primary-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"/> En ligne
              </span>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2 mb-3">
            <button onClick={toggleFollow}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]',
                isFollowing ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-primary-600 text-white shadow-md')}>
              {isFollowing ? <><BellOff size={14}/> Abonné</> : <><Bell size={14}/> Suivre</>}
            </button>
            <button onClick={handleContact}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl font-bold text-sm bg-blue-600 text-white shadow-md active:scale-[0.97]">
              <MessageCircle size={14}/> Discuter
            </button>
          </div>

          {/* Actions sociales inline */}
          <div className="flex border-t border-gray-100 -mx-4 px-4 pt-3">
            {[
              { icon: Heart, label: "J'aime", action: toggleLike, active: isLiked, color: 'text-red-500' },
  
              { icon: Share2, label: 'Partager', action: handleShare, active: linkCopied, color: 'text-primary-500' },
            ].map((btn, i) => (
              <button key={i} onClick={btn.action}
                className={clsx('flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold active:scale-95 transition-all',
                  btn.active ? btn.color : 'text-gray-400')}>
                <btn.icon size={16} className={clsx(btn.active && btn.color, btn.active && 'fill-current')} strokeWidth={btn.active ? 0 : 1.8}/>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>



      {/* ══════════════════════════════════════
          SYSTÈME D'ONGLETS STICKY (PRODUITS / AVIS / À PROPOS)
      ══════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-surface-200/80 shadow-xs mt-3">
        <div className="flex px-4">
          {/* Onglet 1 : Produits */}
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={clsx(
              'flex-1 py-3 text-xs font-black transition-all relative flex items-center justify-center gap-1.5',
              activeTab === 'products' ? 'text-primary-700' : 'text-dark-400 hover:text-dark-600'
            )}
          >
            <Package size={15} />
            <span>Produits</span>
            <span className={clsx(
              'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
              activeTab === 'products' ? 'bg-primary-100 text-primary-800' : 'bg-surface-100 text-dark-500'
            )}>
              {products.length}
            </span>
            {activeTab === 'products' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
            )}
          </button>

          {/* Onglet 2 : Avis */}
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={clsx(
              'flex-1 py-3 text-xs font-black transition-all relative flex items-center justify-center gap-1.5',
              activeTab === 'reviews' ? 'text-primary-700' : 'text-dark-400 hover:text-dark-600'
            )}
          >
            <Star size={14} className={clsx(activeTab === 'reviews' ? 'fill-amber-400 text-amber-400' : 'text-dark-400')} />
            <span>Avis</span>
            <span className={clsx(
              'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
              activeTab === 'reviews' ? 'bg-amber-100 text-amber-800' : 'bg-surface-100 text-dark-500'
            )}>
              {shop.reviews_count || 0}
            </span>
            {activeTab === 'reviews' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
            )}
          </button>

          {/* Onglet 3 : À propos */}
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={clsx(
              'flex-1 py-3 text-xs font-black transition-all relative flex items-center justify-center gap-1.5',
              activeTab === 'about' ? 'text-primary-700' : 'text-dark-400 hover:text-dark-600'
            )}
          >
            <Store size={14} />
            <span>À propos</span>
            {activeTab === 'about' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-600 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CONTENU DES ONGLETS
      ══════════════════════════════════════ */}

      {/* ─── ONGLET 1 : PRODUITS (GRILLE 2 COLS + RECHERCHE INTERNE) ─── */}
      {activeTab === 'products' && (
        <div className="px-4 pt-3.5 space-y-3">
          {/* Barre de recherche interne */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Rechercher parmi les ${products.length} produits...`}
                className="w-full bg-white pl-8.5 pr-8 py-2 rounded-xl text-xs font-medium border border-surface-200/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Filtres & Tri */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'traceable', label: '🌿 Traçabilité' },
              { id: 'price_asc', label: 'Prix croissant' },
              { id: 'price_desc', label: 'Prix décroissant' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSortBy(tab.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-all active:scale-95 border flex-shrink-0',
                  sortBy === tab.id
                    ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                    : 'bg-white text-dark-600 border-surface-200 hover:bg-surface-50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grille responsive 2 colonnes */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-surface-200/60 p-6">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-2 text-dark-400">
                <Package size={24} />
              </div>
              <p className="font-bold text-dark-800 text-sm">
                {searchQuery ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit disponible pour le moment'}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSortBy('all'); }}
                  className="mt-3 text-xs text-primary-600 font-bold hover:underline"
                >
                  Réinitialiser la recherche
                </button>
              ) : (
                <p className="text-dark-400 text-xs mt-1">Le vendeur n'a pas encore ajouté de produit actif.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  user={user}
                  onZoom={() => product.image_url && setZoomImage(product.image_url)}
                  onOrder={() => setOrderModal(product)}
                  onFavorite={async () => {
                    if (!user) { toast.error('Connectez-vous d\'abord'); return }
                    const { data: existing } = await supabase.from('product_favorites')
                      .select('id').eq('product_id', product.id).eq('user_id', user.id).single()
                    if (existing) {
                      await supabase.from('product_favorites').delete().eq('id', existing.id)
                      toast.success('Retiré des favoris')
                    } else {
                      await supabase.from('product_favorites').insert({ product_id: product.id, user_id: user.id })
                      toast.success('Ajouté aux favoris')
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ONGLET 2 : AVIS CLIENTS (STYLE AMAZON REHAUSSÉ) ─── */}
      {activeTab === 'reviews' && (
        <div className="mt-3 px-4">
          <div className="bg-white rounded-3xl border border-surface-200/70 shadow-xs overflow-hidden">
            {/* Header Avis */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-surface-100">
              <div>
                <h3 className="font-black text-dark-900 text-base">Avis clients vérifiés</h3>
                <p className="text-dark-400 text-[11px]">Évaluations certifiées par les acheteurs MANG</p>
              </div>
              {user && user.id !== shop.owner_id && (
                <button
                  type="button"
                  onClick={() => setReviewModal(true)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 shadow-xs transition-all',
                    myReview ? 'bg-surface-100 text-dark-700' : 'bg-amber-500 text-white'
                  )}
                >
                  {myReview ? 'Modifier' : 'Écrire un avis'}
                </button>
              )}
            </div>

            {/* Score global */}
            {shop.reviews_count > 0 ? (
              <div className="p-4">
                <div className="flex gap-5 items-center p-4 bg-amber-50/70 rounded-2xl mb-4 border border-amber-100/60">
                  {/* Note globale */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className="text-5xl font-black text-amber-500 leading-none">{Number(shop.rating_avg).toFixed(1)}</span>
                    <div className="flex mt-1.5 gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="13" height="13" viewBox="0 0 24 24"
                          fill={s <= Math.round(shop.rating_avg) ? '#f59e0b' : '#d1d5db'} stroke="none">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                        </svg>
                      ))}
                    </div>
                    <span className="text-dark-400 text-[10px] mt-1 font-semibold">{shop.reviews_count} avis</span>
                  </div>

                  {/* Barres de répartition */}
                  <div className="flex-1 space-y-1">
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => r.rating === star).length
                      const pct = shop.reviews_count > 0 ? (count / shop.reviews_count) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[10px] text-dark-500 w-2 text-right flex-shrink-0 font-bold">{star}</span>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="#f59e0b" stroke="none" className="flex-shrink-0">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                          </svg>
                          <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="text-[10px] text-dark-400 w-4 flex-shrink-0">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Liste des avis */}
                <div className="space-y-4">
                  {reviews.map((review, idx) => (
                    <div key={review.id} className={clsx('pb-4', idx < reviews.length - 1 && 'border-b border-surface-100')}>
                      <div className="flex items-center gap-2.5 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            const target = review.user?.username || review.user_id
                            if (target) navigate(`/profil/${target}`)
                          }}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <Avatar src={review.user?.avatar_url} name={review.user?.username} size="sm" className="flex-shrink-0"/>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-dark-800 text-xs block hover:text-emerald-700">@{review.user?.username}</span>
                            <span className="text-dark-400 text-[10px]">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        </button>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} width="12" height="12" viewBox="0 0 24 24"
                              fill={s <= review.rating ? '#f59e0b' : '#e5e7eb'} stroke="none">
                              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                            </svg>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full',
                          review.rating >= 4 ? 'bg-green-50 text-green-700' :
                          review.rating === 3 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-600')}>
                          {review.rating === 5 ? 'Excellent' :
                           review.rating === 4 ? 'Bien' :
                           review.rating === 3 ? 'Correct' :
                           review.rating === 2 ? 'Mauvais' : 'Très mauvais'}
                        </span>
                        {review.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                            <ShieldCheck size={11} className="text-emerald-600" />
                            Achat vérifié
                          </span>
                        )}
                      </div>

                      {review.comment && (
                        <p className="text-dark-700 text-xs leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="flex justify-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="28" height="28" viewBox="0 0 24 24" fill="#e5e7eb" stroke="none">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                  ))}
                </div>
                <p className="font-bold text-dark-800 text-sm">Pas encore d'avis sur cette boutique</p>
                <p className="text-dark-400 text-xs mt-1">Soyez le premier acheteur à partager votre expérience !</p>
                {user && user.id !== shop.owner_id && (
                  <button
                    type="button"
                    onClick={() => setReviewModal(true)}
                    className="mt-4 px-5 py-2.5 rounded-2xl bg-amber-500 text-white text-xs font-bold active:scale-95 shadow-md"
                  >
                    Écrire un avis
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ONGLET 3 : À PROPOS (INFORMATIONS, COORDONNÉES & SÉCURITÉ) ─── */}
      {activeTab === 'about' && (
        <div className="space-y-3.5 px-4 pt-3.5">
          {/* Présentation */}
          <div className="bg-white rounded-3xl p-4 border border-surface-200/70 shadow-xs">
            <h3 className="font-black text-dark-900 text-sm mb-2 flex items-center gap-2">
              <Store size={16} className="text-primary-600" />
              <span>Présentation de la boutique</span>
            </h3>
            <p className="text-dark-600/80 text-xs leading-relaxed whitespace-pre-line">
              {shop.description || "Bienvenue dans notre boutique sur MANG. Découvrez nos produits agricoles frais, locaux et de qualité supérieure."}
            </p>
          </div>

          {/* Informations clés */}
          <div className="bg-white rounded-3xl p-4 border border-surface-200/70 shadow-xs space-y-3">
            <h3 className="font-black text-dark-900 text-sm mb-2 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary-600" />
              <span>Informations & Coordonnées</span>
            </h3>

            <div className="flex items-center gap-3 text-xs text-dark-700">
              <div className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center text-dark-500 flex-shrink-0">
                <MapPin size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[10px] uppercase tracking-wider text-dark-400">Localisation</p>
                <p className="font-semibold text-xs text-dark-800">{shop.city || 'Bénin'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-dark-700">
              <div className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center text-dark-500 flex-shrink-0">
                <Truck size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[10px] uppercase tracking-wider text-dark-400">Livraison</p>
                <p className="font-semibold text-xs text-dark-800">
                  {shop.has_delivery ? 'Livraison disponible à domicile et en point relais' : 'Retrait direct chez le producteur'}
                </p>
              </div>
            </div>

            {shop.created_at && (
              <div className="flex items-center gap-3 text-xs text-dark-700">
                <div className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center text-dark-500 flex-shrink-0">
                  <Calendar size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[10px] uppercase tracking-wider text-dark-400">Membre depuis</p>
                  <p className="font-semibold text-xs text-dark-800">
                    {new Date(shop.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Garanties MANG */}
          <div className="bg-gradient-to-br from-primary-50 to-emerald-50 rounded-3xl p-4 border border-primary-100 shadow-xs">
            <h3 className="font-black text-primary-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary-600" />
              <span>Garanties Sécurité MANG</span>
            </h3>
            <ul className="space-y-2 text-[11px] text-primary-950 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <span>Paiements Mobile Money sécurisés avec séquestre jusqu'à livraison</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <span>Produits vérifiés & contrôle qualité agricole</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                <span>Support et médiation en cas de litige</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          STICKY BOTTOM BAR (ACTIONS RAPIDES AU POUCE)
      ══════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-surface-200/80 px-4 py-2.5 shadow-lg flex items-center gap-2 max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleContact}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all"
        >
          <MessageCircle size={16} />
          <span>Contacter le vendeur</span>
        </button>

        {cartCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/panier')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-dark-900 text-white font-bold text-xs shadow-md active:scale-95 transition-all relative"
          >
            <ShoppingCart size={15} />
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">
              {cartCount}
            </span>
          </button>
        )}
      </div>





      {/* ══════ ZOOM IMAGE ══════ */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={() => setZoomImage(null)}>
          <button className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X size={20} className="text-white"/>
          </button>
          <img src={zoomImage} alt="" className="max-w-[95vw] max-h-[95vh] rounded-2xl object-contain"/>
        </div>
      )}

      {/* ══════ MODAL COMMANDE ══════ */}
      <OrderModal open={!!orderModal} product={orderModal} shop={shop} user={user} onClose={() => setOrderModal(null)}/>

      {/* ══════ LIKERS SHEET ══════ */}
      <BottomSheet open={showLikers} onClose={() => setShowLikers(false)} title="Mentions J'aime">
        <div className="px-4 pt-2 pb-8 space-y-1">
          {likers.length === 0
            ? <p className="text-center text-gray-400 py-8">Soyez le premier à aimer !</p>
            : likers.map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const target = l.user?.username || l.user?.id
                  if (target) {
                    setShowLikers(false)
                    navigate(`/profil/${target}`)
                  }
                }}
                className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 text-left transition-colors cursor-pointer"
              >
                <Avatar src={l.user?.avatar_url} name={l.user?.username} size="md"/>
                <p className="font-semibold text-dark-800 text-sm">@{l.user?.username}</p>
              </button>
            ))}
        </div>
      </BottomSheet>

      {/* ══════ FOLLOWERS SHEET ══════ */}
      <BottomSheet open={showFollowers} onClose={() => setShowFollowers(false)} title="Abonnés">
        <div className="px-4 pt-2 pb-8 space-y-1">
          {followers.length === 0
            ? <p className="text-center text-gray-400 py-8">Aucun abonné pour l'instant</p>
            : followers.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const target = f.user?.username || f.user?.id
                  if (target) {
                    setShowFollowers(false)
                    navigate(`/profil/${target}`)
                  }
                }}
                className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 text-left transition-colors cursor-pointer"
              >
                <Avatar src={f.user?.avatar_url} name={f.user?.username} size="md"/>
                <div>
                  <p className="font-semibold text-dark-800 text-sm">@{f.user?.username}</p>
                  {f.user?.city && <p className="text-gray-400 text-xs flex items-center gap-0.5"><MapPin size={10} />{f.user.city}</p>}
                </div>
              </button>
            ))}
        </div>
      </BottomSheet>

      {/* ══════ REVIEW MODAL ══════ */}
      <ReviewModal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        shop={shop}
        user={user}
        myReview={myReview}
        userHasPurchased={userHasPurchased}
        onSaved={(rev) => {
          setMyReview(rev)
          setReviewModal(false)
          loadShop()
          toast.success(rev ? 'Avis mis à jour !' : 'Avis publié ⭐')
        }}
      />
    </div>
  )
}

// ══════════════════════════════════════
// PRODUCT CARD
// ══════════════════════════════════════
function ProductCard({ product, user, onZoom, onOrder, onFavorite }) {
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(false)
  const addItem = useCartStore(state => state.addItem)

  useEffect(() => {
    if (!user) return
    supabase.from('product_favorites').select('id')
      .eq('product_id', product.id).eq('user_id', user.id).single()
      .then(({ data }) => setIsFav(!!data))
  }, [user, product.id])

  const handleFav = async (e) => {
    e.stopPropagation()
    await onFavorite()
    setIsFav(v => !v)
  }
  const isAvailable = product.availability === 'now'

  return (
    <div
      className="group w-full bg-white rounded-2xl overflow-hidden shadow-card border border-surface-200/70 active:scale-[0.97] hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between"
      onClick={() => navigate(`/produit/${product.id}`)}
    >
      <div className="relative h-36 overflow-hidden bg-surface-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-600/30 bg-primary-50">
            <Store size={36} />
          </div>
        )}

        {/* Badge Disponibilité */}
        <span
          className={clsx(
            'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider shadow-xs backdrop-blur-sm',
            isAvailable ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
          )}
        >
          {isAvailable ? 'Dispo' : 'Bientôt'}
        </span>

        {/* Badge Traçabilité Bio */}
        {product.production_cycles && product.production_cycles.length > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-700/90 text-white backdrop-blur-sm shadow-xs">
            <ShieldCheck size={9} />
            <span className="text-[8px] font-black uppercase tracking-wider">Bio</span>
          </div>
        )}

        {/* Bouton Like flottant */}
        <button
          onClick={handleFav}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xs active:scale-75 transition-all"
          title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart size={13} className={clsx('transition-transform', isFav ? 'text-red-500 fill-red-500 scale-110' : 'text-dark-400')} />
        </button>
      </div>

      <div className="p-2.5 flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-extrabold text-dark-900 text-xs truncate leading-snug">{product.name}</h4>
          {product.description && (
            <p className="text-dark-600/50 text-[10px] leading-tight mt-0.5 line-clamp-1">{product.description}</p>
          )}
          <p className="text-[9.5px] text-primary-600 font-bold mt-1">
            {AVAIL_LABELS[product.availability] || 'Disponible'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-surface-100">
          <div>
            <span className="font-black text-primary-700 text-sm">{Number(product.price || 0).toLocaleString('fr-FR')}</span>
            <span className="text-[9px] text-dark-400 ml-0.5 font-bold">F</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              addItem(product, 1)
              toast.success('Ajouté au panier !')
            }}
            className="px-2.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-90 text-[10px] font-black text-white flex items-center gap-1 shadow-xs transition-all"
            title="Ajouter au panier"
          >
            <ShoppingCart size={11} className="text-white" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// COMMENTS SECTION
// ══════════════════════════════════════
function CommentsSection({ shop, user, profile }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState(new Set())
  const [replyTo, setReplyTo] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef()

  const loadComments = useCallback(async () => {
    if (!shop) return
    const { data } = await supabase.from('shop_comments')
      .select('*, user:profiles(id, username, avatar_url), replies:shop_comments(*, user:profiles(id, username, avatar_url))')
      .eq('shop_id', shop.id).is('parent_id', null).order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }, [shop])

  useEffect(() => { loadComments() }, [loadComments])

  const sendComment = async () => {
    if (!text.trim() || sending) return
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    setSending(true)
    await supabase.from('shop_comments').insert({
      shop_id: shop.id, user_id: user.id,
      content: text.trim(), parent_id: replyTo?.id || null,
    })
    if (shop.owner_id !== user.id && !replyTo) {
      const { error: notifErr } = await supabase.rpc('create_notification', {
        p_user_id: shop.owner_id, p_type: 'shop_comment',
        p_title: '💬 Nouveau commentaire',
        p_body: `@${profile?.username} a commenté votre boutique "${shop.name}"`,
        p_reference_id: shop.id, p_reference_type: 'shop', })
          if (notifErr) { console.error(notifErr); alert('Erreur Notif: ' + notifErr.message); }
    }
    setText(''); setReplyTo(null); setSending(false)
    loadComments()
  }

  const deleteComment = async (id) => {
    if (!confirm('Supprimer ce commentaire ?')) return
    await supabase.from('shop_comments').delete().eq('id', id)
    loadComments()
    toast.success('Commentaire supprimé')
  }

  const saveEdit = async (id) => {
    if (!editText.trim()) return
    await supabase.from('shop_comments').update({ content: editText.trim() }).eq('id', id)
    setEditingId(null); setEditText('')
    loadComments()
  }

  const total = comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0)

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50">
        <h3 className="font-black text-dark-900 text-base flex items-center gap-2">
          <MessageCircle size={16} className="text-primary-500"/>
          Commentaires
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{total}</span>
        </h3>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-b border-gray-50">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-primary-50 rounded-xl">
            <CornerDownRight size={12} className="text-primary-500"/>
            <span className="text-primary-700 text-xs font-semibold flex-1">Répondre à @{replyTo.username}</span>
            <button onClick={() => setReplyTo(null)}><X size={12} className="text-primary-400"/></button>
          </div>
        )}
        <div className="flex gap-2 items-center">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="sm" className="flex-shrink-0"/>
          <div className="flex-1 relative">
            <input ref={inputRef} type="text" value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendComment()}
              placeholder={replyTo ? `Répondre à @${replyTo.username}...` : 'Écrire un commentaire...'}
              className="w-full bg-gray-50 rounded-2xl px-4 py-2.5 pr-12 text-sm text-dark-800 placeholder-gray-400 outline-none border border-gray-200 focus:border-primary-300 transition-colors"/>
            <button onClick={sendComment} disabled={!text.trim() || sending}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center disabled:opacity-30 active:scale-90">
              {sending
                ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <Send size={13} className="text-white ml-0.5"/>}
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 py-3 space-y-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mx-auto mb-2 text-dark-400"><MessageCircle size={24} /></div>
            <p className="text-gray-400 text-sm">Soyez le premier à commenter !</p>
          </div>
        ) : comments.map(comment => (
          <div key={comment.id}>
            <CommentItem comment={comment} userId={user?.id}
              onReply={() => { setReplyTo({ id: comment.id, username: comment.user?.username }); inputRef.current?.focus() }}
              onDelete={() => deleteComment(comment.id)}
              onEdit={() => { setEditingId(comment.id); setEditText(comment.content) }}
              editingId={editingId} editText={editText}
              setEditText={setEditText} onSaveEdit={() => saveEdit(comment.id)}
              onCancelEdit={() => setEditingId(null)}/>
            {comment.replies?.length > 0 && (
              <div className="ml-9 mt-2">
                <button onClick={() => setExpandedReplies(prev => { const s = new Set(prev); s.has(comment.id) ? s.delete(comment.id) : s.add(comment.id); return s })}
                  className="flex items-center gap-1 text-xs text-primary-600 font-semibold mb-2 active:scale-95">
                  <ChevronDown size={12} className={clsx('transition-transform', expandedReplies.has(comment.id) && 'rotate-180')}/>
                  {expandedReplies.has(comment.id) ? 'Masquer' : `${comment.replies.length} réponse${comment.replies.length > 1 ? 's' : ''}`}
                </button>
                {expandedReplies.has(comment.id) && (
                  <div className="space-y-3 border-l-2 border-gray-100 pl-3">
                    {comment.replies.map(reply => (
                      <CommentItem key={reply.id} comment={reply} userId={user?.id} isReply
                        onReply={() => { setReplyTo({ id: comment.id, username: reply.user?.username }); inputRef.current?.focus() }}
                        onDelete={() => deleteComment(reply.id)}
                        onEdit={() => { setEditingId(reply.id); setEditText(reply.content) }}
                        editingId={editingId} editText={editText}
                        setEditText={setEditText} onSaveEdit={() => saveEdit(reply.id)}
                        onCancelEdit={() => setEditingId(null)}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CommentItem({ comment, userId, isReply, onReply, onDelete, onEdit, editingId, editText, setEditText, onSaveEdit, onCancelEdit }) {
  const isOwner = comment.user_id === userId
  const isEditing = editingId === comment.id
  const navigate = useNavigate()
  const authorTarget = comment.user?.username || comment.user_id

  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        onClick={() => authorTarget && navigate(`/profil/${authorTarget}`)}
        className="cursor-pointer hover:opacity-80 transition-opacity self-start flex-shrink-0"
      >
        <Avatar src={comment.user?.avatar_url} name={comment.user?.username} size={isReply ? 'xs' : 'sm'} className="mt-0.5"/>
      </button>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2.5">
          <button
            type="button"
            onClick={() => authorTarget && navigate(`/profil/${authorTarget}`)}
            className="text-left cursor-pointer hover:underline"
          >
            <p className="font-bold text-dark-800 text-xs">@{comment.user?.username}</p>
          </button>
          {isEditing ? (
            <div className="mt-1.5 space-y-1.5">
              <input type="text" value={editText} onChange={e => setEditText(e.target.value)}
                className="w-full text-sm bg-white rounded-xl px-3 py-1.5 border border-gray-200 outline-none focus:border-primary-300"/>
              <div className="flex gap-2">
                <button onClick={onSaveEdit} className="text-xs text-primary-600 font-bold">Sauvegarder</button>
                <button onClick={onCancelEdit} className="text-xs text-gray-400">Annuler</button>
              </div>
            </div>
          ) : (
            <p className="text-dark-700 text-sm mt-0.5 leading-relaxed">{comment.content}</p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-gray-400 text-[10px]">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
          </span>
          <button onClick={onReply} className="text-primary-500 text-[10px] font-bold active:scale-95">Répondre</button>
          {isOwner && (
            <>
              <button onClick={onEdit} className="text-blue-400 text-[10px] font-bold active:scale-95">Modifier</button>
              <button onClick={onDelete} className="text-red-400 text-[10px] font-bold active:scale-95">Supprimer</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// ORDER MODAL
// ══════════════════════════════════════
function OrderModal({ open, product, shop, user, onClose }) {
  const [form, setForm] = useState({ address: '', phone: '', note: '', quantity: 1 })
  const [loading, setLoading] = useState(false)

  const handleOrder = async () => {
    if (!form.address.trim() || !form.phone.trim()) { toast.error('Adresse et téléphone requis'); return }
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('place_order', {
        p_buyer_id: user.id, p_product_id: product.id,
        p_quantity: form.quantity, p_delivery_address: form.address,
        p_delivery_phone: form.phone, p_note: form.note || null,
      })

      // Erreur réseau Supabase
      if (error) {
        toast.error(error.message || 'Erreur lors de la commande')
        return
      }

      // Erreur métier (solde insuffisant, produit indispo, etc.)
      if (!data?.success) {
        toast.error(data?.error || 'Erreur lors de la commande')
        return
      }

      toast.success(data?.message || 'Commande créée ! Le vendeur a été notifié.')
      setForm({ address: '', phone: '', note: '', quantity: 1 })
      onClose()
    } finally { setLoading(false) }
  }

  if (!product) return null

  return (
    <Modal open={open} onClose={onClose} title="Passer commande">
      <div className="p-5 space-y-4">
        <div className="flex gap-3 p-3 bg-gray-50 rounded-2xl">
          {product.image_url && <img src={product.image_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>}
          <div>
            <p className="font-bold text-dark-800 text-sm">{product.name}</p>
            <p className="font-black text-primary-700 text-base">{product.price?.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>
        {[
          { label: 'Adresse de livraison *', key: 'address', type: 'text', placeholder: 'Votre adresse complète' },
          { label: 'Téléphone *', key: 'phone', type: 'tel', placeholder: '+229 XX XX XX XX' },
          { label: 'Quantité *', key: 'quantity', type: 'number', placeholder: '1' },
        ].map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-sm font-bold text-dark-700">{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} min={f.type === 'number' ? 1 : undefined}
              value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: f.type === 'number' ? parseInt(e.target.value)||1 : e.target.value}))}
              className="w-full bg-gray-50 rounded-2xl px-4 py-2.5 text-sm border border-gray-200 outline-none focus:border-primary-300"/>
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-sm font-bold text-dark-700">Note (optionnel)</label>
          <textarea placeholder="Instructions particulières..." value={form.note}
            onChange={e => setForm(p => ({...p, note: e.target.value}))}
            className="w-full bg-gray-50 rounded-2xl px-4 py-2.5 text-sm border border-gray-200 outline-none focus:border-primary-300 resize-none" rows={2}/>
        </div>
        <div className="p-3.5 bg-dark-900 rounded-2xl flex justify-between items-center">
          <span className="text-white/50 text-sm">Total</span>
          <span className="font-black text-white text-lg">{((product.price||0)*form.quantity).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <p className="text-xs text-gray-400 text-center">Montant bloqué en escrow jusqu'à l'acceptation</p>
        <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleOrder}>
          Créer la commande
        </Button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════
// REVIEW MODAL
// ══════════════════════════════════════
function ReviewModal({ open, onClose, shop, user, myReview, userHasPurchased, onSaved }) {
  const [rating, setRating] = useState(myReview?.rating || 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(myReview?.comment || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setRating(myReview?.rating || 0)
      setComment(myReview?.comment || '')
    }
  }, [open, myReview])

  const save = async () => {
    if (rating === 0) { toast.error('Choisissez une note'); return }
    setSaving(true)
    if (myReview?.id) {
      const { error } = await supabase.from('shop_reviews')
        .update({
          rating,
          comment: comment.trim() || null,
          is_verified_purchase: userHasPurchased || myReview.is_verified_purchase
        })
        .eq('id', myReview.id)
      setSaving(false)
      if (error) { toast.error('Erreur'); return }
    } else {
      const { error } = await supabase.from('shop_reviews')
        .insert({
          shop_id: shop.id,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
          is_verified_purchase: userHasPurchased
        })
      setSaving(false)
      if (error) { toast.error('Vous avez déjà laissé un avis'); return }
    }
    onSaved(myReview)
  }

  const labels = ['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent !']

  return (
    <BottomSheet open={open} onClose={onClose} title={myReview ? 'Modifier votre avis' : 'Donner un avis'}>
      <div className="px-5 pt-2 pb-8 space-y-5">
        {/* Badge Achat Vérifié notice */}
        {userHasPurchased ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Achat vérifié dans cette boutique</p>
              <p className="text-[11px] text-emerald-700/85">Comme vous avez déjà commandé dans cette boutique, votre avis portera le badge officiel "Achat vérifié".</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2 text-xs text-gray-600">
            <p className="text-[11px]">Partagez votre avis sur l'accueil, la qualité de service et les produits de cette boutique.</p>
          </div>
        )}

        {/* Stars */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {[1,2,3,4,5].map(s => (
              <button key={s}
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="active:scale-90 transition-transform">
                <svg width="40" height="40" viewBox="0 0 24 24"
                  fill={(hovered || rating) >= s ? '#f59e0b' : 'none'}
                  stroke={(hovered || rating) >= s ? '#f59e0b' : '#d1d5db'}
                  strokeWidth="1.5" className="transition-colors">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <span className="text-amber-600 font-bold text-sm">{labels[hovered || rating]}</span>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm font-bold text-dark-700 mb-1.5 block">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Partagez votre expérience avec cette boutique..."
            rows={3}
            className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-amber-300 resize-none transition-colors"
          />
        </div>

        <button onClick={save} disabled={rating === 0 || saving}
          className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-black text-sm shadow-md active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
          {saving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
              {myReview ? 'Mettre à jour' : 'Publier mon avis'}</>}
        </button>
      </div>
    </BottomSheet>
  )
}

// ══════════════════════════════════════
// SKELETON
// ══════════════════════════════════════
function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-72 skeleton"/>
      <div className="mx-4 -mt-1 space-y-3">
        <div className="h-52 skeleton rounded-3xl"/>
        <div className="h-14 skeleton rounded-2xl"/>
        <div className="flex gap-3">
          {[1,2,3].map(i => <div key={i} className="w-48 h-64 skeleton rounded-3xl flex-shrink-0"/>)}
        </div>
      </div>
    </div>
  )
}
