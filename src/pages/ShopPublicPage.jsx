import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, Users, MessageCircle, Share2,
  MapPin, Truck, Phone, Star, ChevronRight,
  Send, Trash2, Edit3, CornerDownRight, Copy,
  Check, X, ZoomIn, ShoppingCart, Package,
  MoreHorizontal, ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, PremiumBadge, BottomSheet, Modal, Button } from '@/components/ui'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ============================================================
// DISPONIBILITÉ
// ============================================================
const AVAIL_LABELS = {
  now: '✅ Disponible maintenant',
  '1w': '⏳ Dans 1 semaine',
  '2w': '⏳ Dans 2 semaines',
  '1m': '📅 Dans 1 mois',
  '2m': '📅 Dans 2 mois',
  '3m': '📅 Dans 3 mois',
  '6m': '📅 Dans 6 mois',
  '1y': '📆 Dans 1 an',
}

// ============================================================
// PAGE BOUTIQUE PUBLIQUE
// ============================================================
export default function ShopPublicPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()

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

  // Modals
  const [zoomImage, setZoomImage] = useState(null)
  const [orderModal, setOrderModal] = useState(null) // product
  const [chatOpen, setChatOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)

  const loadShop = useCallback(async () => {
    setLoading(true)
    const isUUID = /^[0-9a-f-]{36}$/.test(slug)
    let query = supabase.from('shops').select(`
      *,
      owner:profiles(id, username, full_name, avatar_url, last_seen_at, city)
    `)
    query = isUUID ? query.eq('id', slug) : query.eq('slug', slug)
    const { data } = await query.single()
    if (!data) { setLoading(false); return }
    setShop(data)

    // Produits
    const { data: prods } = await supabase
      .from('products').select('*').eq('shop_id', data.id)
      .eq('is_available', true).order('created_at', { ascending: false })
    setProducts(prods || [])

    // Likes
    const { data: likerData } = await supabase
      .from('shop_likes')
      .select('user:profiles(id, username, avatar_url)')
      .eq('shop_id', data.id)
    setLikers(likerData || [])

    // Followers
    const { data: followerData } = await supabase
      .from('shop_followers')
      .select('user:profiles(id, username, avatar_url, city)')
      .eq('shop_id', data.id)
    setFollowers(followerData || [])

    // Mon état follow/like
    if (user) {
      const [fRes, lRes] = await Promise.all([
        supabase.from('shop_followers').select('id').eq('shop_id', data.id).eq('user_id', user.id).single(),
        supabase.from('shop_likes').select('id').eq('shop_id', data.id).eq('user_id', user.id).single(),
      ])
      setIsFollowing(!!fRes.data)
      setIsLiked(!!lRes.data)
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
      // Notification
      if (shop.owner_id !== user.id) {
        await supabase.rpc('create_notification', {
          p_user_id: shop.owner_id,
          p_type: 'shop_follow',
          p_title: '👥 Nouvelle boutique suivie',
          p_body: `@${profile?.username} suit maintenant votre boutique "${shop.name}"`,
          p_reference_id: shop.id,
          p_reference_type: 'shop',
        })
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
      await supabase.from('shop_likes').insert({ shop_id: shop.id, user_id: user.id })
      setIsLiked(true)
      setShop(s => ({ ...s, likes_count: s.likes_count + 1 }))
      setLikers(prev => [...prev, { user: { id: user.id, username: profile?.username, avatar_url: profile?.avatar_url } }])
      if (shop.owner_id !== user.id) {
        await supabase.rpc('create_notification', {
          p_user_id: shop.owner_id,
          p_type: 'shop_like',
          p_title: '❤️ Nouveau like sur votre boutique',
          p_body: `@${profile?.username} aime votre boutique "${shop.name}"`,
          p_reference_id: shop.id,
          p_reference_type: 'shop',
        })
      }
    }
  }

  const handleContact = async () => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    if (shop.owner_id === user.id) { toast.error('C\'est votre boutique'); return }

    // Créer ou récupérer la conversation
    const { data: existing } = await supabase
      .from('conversations').select('id')
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (loading) return <ShopSkeleton/>
  if (!shop) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p className="text-5xl">🔍</p>
      <p className="font-display text-xl font-bold text-dark-800">Boutique introuvable</p>
      <Button variant="primary" onClick={() => navigate('/')}>Retour à l'accueil</Button>
    </div>
  )

  const isOnline = shop.owner?.last_seen_at
    ? (new Date() - new Date(shop.owner.last_seen_at)) < 120000 : false

  const premiumConfig = {
    3: { label: 'Premium Or', class: 'gold', stars: '⭐⭐⭐' },
    2: { label: 'Premium Argent', class: 'silver', stars: '⭐⭐' },
    1: { label: 'Premium Bronze', class: 'bronze', stars: '⭐' },
  }[shop.premium_level] || null

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      {/* ===== IMAGE COVER + HEADER ===== */}
      <div className="relative w-full h-64 overflow-hidden bg-primary-100">
        {shop.cover_url ? (
          <img
            src={shop.cover_url}
            alt={shop.name}
            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 hover:scale-105"
            onClick={() => setZoomImage(shop.cover_url)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">🌿</div>
        )}

        {/* Gradient bas */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent"/>

        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} className="text-white"/>
        </button>

        {/* Boutons actions en haut à droite */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={handleCopyLink}
            className="w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90">
            {linkCopied ? <Check size={18} className="text-emerald-400"/> : <Share2 size={18} className="text-white"/>}
          </button>
          {shop.cover_url && (
            <button onClick={() => setZoomImage(shop.cover_url)}
              className="w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90">
              <ZoomIn size={18} className="text-white"/>
            </button>
          )}
        </div>

        {/* Badge premium flottant */}
        {premiumConfig && (
          <div className={clsx(
            'absolute top-4 left-1/2 -translate-x-1/2 premium-badge-float',
            premiumConfig.class === 'gold' && 'bg-gradient-to-r from-gold-500 to-gold-600 animate-badge-glow',
            premiumConfig.class === 'silver' && 'bg-gradient-to-r from-slate-400 to-slate-500',
            premiumConfig.class === 'bronze' && 'bg-gradient-to-r from-amber-700 to-amber-800',
            'px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg'
          )}>
            {premiumConfig.stars} {premiumConfig.label}
          </div>
        )}
      </div>

      {/* ===== HEADER BOUTIQUE (SUPERPOSÉ) ===== */}
      <div className="relative -mt-10 px-4">
        <div className="flex items-end gap-3 mb-3">
          {/* Avatar shop */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg cursor-zoom-in"
              onClick={() => shop.cover_url && setZoomImage(shop.cover_url)}
            >
              {shop.cover_url
                ? <img src={shop.cover_url} className="w-full h-full object-cover"/>
                : <div className="w-full h-full bg-primary-100 flex items-center justify-center text-3xl">🌿</div>}
            </div>
            {isOnline && <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white animate-pulse-dot"/>}
          </div>

          {/* Nom + meta */}
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-display text-xl font-black text-dark-900 leading-tight truncate">{shop.name}</h1>
            <p className="text-dark-600/60 text-sm">@{shop.owner?.username}</p>
            {shop.city && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-dark-600/40"/>
                <span className="text-dark-600/50 text-xs">{shop.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <button onClick={() => setShowLikers(true)} className="flex items-center gap-1.5 active:scale-95">
            <div className="flex -space-x-1.5">
              {likers.slice(0, 3).map((l, i) => (
                <Avatar key={i} src={l.user?.avatar_url} name={l.user?.username} size="xs"
                  className="ring-2 ring-white"/>
              ))}
            </div>
            <span className="text-dark-600/60 text-sm font-semibold">{shop.likes_count || 0} J'aimes</span>
          </button>
          <span className="text-dark-600/30">·</span>
          <button onClick={() => setShowFollowers(true)} className="flex items-center gap-1.5 active:scale-95">
            <Users size={13} className="text-primary-500"/>
            <span className="text-dark-600/60 text-sm font-semibold">{shop.followers_count || 0} abonnés</span>
          </button>
        </div>

        {/* Description avec texte défilant */}
        {shop.description && (
          <div className="mb-4 overflow-hidden relative bg-white rounded-2xl px-4 py-3 shadow-card">
            <div className="overflow-hidden whitespace-nowrap">
              <span
                className="inline-block text-dark-700 text-sm font-medium"
                style={{
                  animation: shop.description.length > 40
                    ? `scrollLoop ${Math.max(12, shop.description.length * 0.35)}s linear infinite`
                    : 'none'
                }}
              >
                {shop.description}
                {shop.description.length > 40 && <>&nbsp;&nbsp;&nbsp;&nbsp;{shop.description}</>}
              </span>
            </div>
          </div>
        )}

        {/* Infos badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {shop.has_delivery ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Truck size={12}/> Livraison disponible
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-200">
              <Package size={12}/> Pas de livraison
            </span>
          )}
          {shop.whatsapp && (
            <a href={`https://wa.me/${shop.whatsapp.replace(/\s+/g, '')}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold border border-green-200">
              <Phone size={12}/> {shop.whatsapp}
            </a>
          )}
          {isOnline && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 text-xs font-bold border border-primary-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot"/>
              En ligne
            </span>
          )}
        </div>

        {/* BOUTONS ACTIONS PRINCIPAUX */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={toggleFollow}
            className={clsx(
              'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border-2',
              isFollowing
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-transparent bg-primary-600 text-white shadow-green'
            )}>
            {isFollowing ? <><Check size={15}/> Abonné</> : <><Users size={15}/> Suivre</>}
          </button>
          <button onClick={handleContact}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-blue-600 text-white shadow-md active:scale-95 transition-all">
            <MessageCircle size={15}/> Discuter
          </button>
        </div>

        {/* Like + Commenter + Partager (style Facebook) */}
        <div className="flex bg-white rounded-2xl shadow-card overflow-hidden mb-4">
          {[
            { icon: Heart, label: "J'aime", action: toggleLike, active: isLiked, activeClass: 'text-red-500' },
            { icon: MessageCircle, label: 'Commenter', action: () => setCommentsOpen(true), active: false, activeClass: '' },
            { icon: Share2, label: 'Partager', action: handleCopyLink, active: linkCopied, activeClass: 'text-primary-600' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all active:scale-95 border-r border-surface-100 last:border-0',
                btn.active ? btn.activeClass + ' bg-red-50' : 'text-dark-600/60'
              )}>
              <btn.icon size={16} className={clsx(btn.active && btn.activeClass, btn.active && 'fill-current')} strokeWidth={btn.active ? 0 : 1.8}/>
              {btn.label}
            </button>
          ))}
        </div>

        {/* ===== PRODUITS ===== */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-dark-800">
              Produits disponibles <span className="text-dark-600/40 text-sm font-normal">({products.length})</span>
            </h2>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl shadow-card">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-dark-600/50 text-sm">Aucun produit disponible</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {products.map(product => (
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
                      toast.success('Ajouté aux favoris ❤️')
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ===== COMMENTAIRES ===== */}
        <CommentsSection shop={shop} user={user} profile={profile}/>

        {/* Copier lien */}
        <button onClick={handleCopyLink}
          className="w-full mt-4 py-3 rounded-2xl bg-surface-100 text-dark-700 font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
          {linkCopied ? <><Check size={15} className="text-emerald-500"/> Copié !</> : <><Copy size={15}/> Copier le lien de la boutique</>}
        </button>
      </div>

      {/* ===== MODAL ZOOM IMAGE ===== */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in"
          onClick={() => setZoomImage(null)}
        >
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <X size={20} className="text-white"/>
          </button>
          <img src={zoomImage} alt="" className="max-w-[95vw] max-h-[95vh] rounded-xl object-contain animate-scale-in"/>
        </div>
      )}

      {/* ===== MODAL COMMANDE ===== */}
      <OrderModal
        open={!!orderModal}
        product={orderModal}
        shop={shop}
        user={user}
        wallet={null}
        onClose={() => setOrderModal(null)}
      />

      {/* ===== MODAL LIKERS ===== */}
      <BottomSheet open={showLikers} onClose={() => setShowLikers(false)} title="❤️ Personnes qui aiment">
        <div className="px-4 pt-2 pb-8 space-y-3">
          {likers.length === 0 ? (
            <p className="text-center text-dark-600/50 py-8">Soyez le premier à aimer !</p>
          ) : likers.map((l, i) => (
            <div key={i} className="flex items-center gap-3">
              <Avatar src={l.user?.avatar_url} name={l.user?.username} size="md"/>
              <p className="font-semibold text-dark-800 text-sm">@{l.user?.username}</p>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* ===== MODAL FOLLOWERS ===== */}
      <BottomSheet open={showFollowers} onClose={() => setShowFollowers(false)} title="👥 Abonnés">
        <div className="px-4 pt-2 pb-8 space-y-3">
          {followers.length === 0 ? (
            <p className="text-center text-dark-600/50 py-8">Aucun abonné pour l'instant</p>
          ) : followers.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <Avatar src={f.user?.avatar_url} name={f.user?.username} size="md"/>
              <div>
                <p className="font-semibold text-dark-800 text-sm">@{f.user?.username}</p>
                {f.user?.city && <p className="text-dark-600/40 text-xs">📍 {f.user.city}</p>}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

// ============================================================
// PRODUCT CARD (horizontal scroll)
// ============================================================
function ProductCard({ product, user, onZoom, onOrder, onFavorite }) {
  const [isFav, setIsFav] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('product_favorites').select('id')
      .eq('product_id', product.id).eq('user_id', user.id).single()
      .then(({ data }) => setIsFav(!!data))
  }, [user, product.id])

  const handleFav = async () => {
    await onFavorite()
    setIsFav(v => !v)
  }

  const isAvailable = product.availability === 'now'

  return (
    <div className="flex-shrink-0 w-44 bg-white rounded-2xl shadow-card overflow-hidden transition-transform duration-200 active:scale-[0.97]">
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-surface-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 hover:scale-110"
            onClick={onZoom}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🌿</div>
        )}
        {/* Badge dispo */}
        <span className={clsx(
          'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold',
          isAvailable ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
        )}>
          {isAvailable ? 'Dispo' : 'Bientôt'}
        </span>
        {/* Favori */}
        <button onClick={handleFav}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90">
          <Heart size={13} className={clsx(isFav ? 'text-red-500 fill-red-500' : 'text-dark-600/50')}/>
        </button>
      </div>

      {/* Infos */}
      <div className="p-2.5">
        <p className="font-bold text-dark-800 text-xs leading-tight truncate">{product.name}</p>

        {product.description && (
          <div className="mt-1">
            <p className={clsx('text-dark-600/50 text-[10px] leading-tight', !expanded && 'line-clamp-2')}>
              {product.description}
            </p>
            {product.description.length > 60 && (
              <button onClick={() => setExpanded(v => !v)} className="text-primary-600 text-[10px] font-semibold">
                {expanded ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        <p className="text-[10px] text-primary-600 font-medium mt-1">
          {AVAIL_LABELS[product.availability] || '✅ Disponible'}
        </p>

        <div className="flex items-center justify-between mt-2">
          <span className="font-display font-bold text-primary-700 text-sm">
            {product.price?.toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-dark-600/40">FCFA</span>
          </span>
          <button onClick={onOrder}
            className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-green active:scale-90 transition-transform">
            <ShoppingCart size={14} className="text-white"/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMMENTAIRES SECTION
// ============================================================
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
    const { data } = await supabase
      .from('shop_comments')
      .select(`
        *, user:profiles(id, username, avatar_url),
        replies:shop_comments(*, user:profiles(id, username, avatar_url))
      `)
      .eq('shop_id', shop.id).is('parent_id', null)
      .order('created_at', { ascending: true })
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
    // Notification
    if (shop.owner_id !== user.id && !replyTo) {
      await supabase.rpc('create_notification', {
        p_user_id: shop.owner_id,
        p_type: 'shop_comment',
        p_title: '💬 Nouveau commentaire',
        p_body: `@${profile?.username} a commenté votre boutique "${shop.name}"`,
        p_reference_id: shop.id,
        p_reference_type: 'shop',
      })
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
    toast.success('Commentaire modifié')
  }

  const toggleReplies = (id) => {
    setExpandedReplies(prev => {
      const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
    })
  }

  return (
    <div className="bg-surface-100 rounded-3xl p-4">
      <h3 className="font-display font-bold text-dark-800 mb-3">
        💬 Commentaires ({comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0)})
      </h3>

      {/* Zone saisie */}
      <div className="bg-white rounded-2xl p-3 mb-4 shadow-card">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-primary-50 rounded-xl">
            <CornerDownRight size={12} className="text-primary-600"/>
            <span className="text-primary-700 text-xs font-semibold flex-1">Répondre à @{replyTo.username}</span>
            <button onClick={() => setReplyTo(null)}><X size={12} className="text-primary-500"/></button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="sm" className="flex-shrink-0"/>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text" value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendComment()}
              placeholder={replyTo ? `Répondre à @${replyTo.username}...` : 'Écrire un commentaire...'}
              className="w-full bg-surface-50 rounded-xl px-4 py-2.5 pr-12 text-sm text-dark-800 placeholder-dark-600/40 outline-none border border-surface-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
            <button onClick={sendComment} disabled={!text.trim() || sending}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center disabled:opacity-30 active:scale-90">
              {sending
                ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <Send size={13} className="text-white ml-0.5"/>}
            </button>
          </div>
        </div>
      </div>

      {/* Liste commentaires */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto"/>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-dark-600/50 text-sm py-6">Soyez le premier à commenter !</p>
        ) : comments.map(comment => (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              userId={user?.id}
              onReply={() => {
                setReplyTo({ id: comment.id, username: comment.user?.username })
                inputRef.current?.focus()
              }}
              onDelete={() => deleteComment(comment.id)}
              onEdit={() => { setEditingId(comment.id); setEditText(comment.content) }}
              editingId={editingId}
              editText={editText}
              setEditText={setEditText}
              onSaveEdit={() => saveEdit(comment.id)}
              onCancelEdit={() => setEditingId(null)}
            />
            {/* Réponses */}
            {comment.replies?.length > 0 && (
              <div className="ml-8 mt-2">
                <button onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-1 text-xs text-primary-600 font-bold mb-2 active:scale-95">
                  <ChevronDown size={12} className={clsx('transition-transform', expandedReplies.has(comment.id) && 'rotate-180')}/>
                  {expandedReplies.has(comment.id) ? 'Masquer' : `Voir ${comment.replies.length} réponse${comment.replies.length > 1 ? 's' : ''}`}
                </button>
                {expandedReplies.has(comment.id) && (
                  <div className="space-y-2 border-l-2 border-surface-200 pl-3">
                    {comment.replies.map(reply => (
                      <CommentItem
                        key={reply.id} comment={reply} userId={user?.id} isReply
                        onReply={() => { setReplyTo({ id: comment.id, username: reply.user?.username }); inputRef.current?.focus() }}
                        onDelete={() => deleteComment(reply.id)}
                        onEdit={() => { setEditingId(reply.id); setEditText(reply.content) }}
                        editingId={editingId} editText={editText}
                        setEditText={setEditText}
                        onSaveEdit={() => saveEdit(reply.id)}
                        onCancelEdit={() => setEditingId(null)}
                      />
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

  return (
    <div className="flex gap-2">
      <Avatar src={comment.user?.avatar_url} name={comment.user?.username} size={isReply ? 'xs' : 'sm'} className="flex-shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-card">
          <p className="font-bold text-dark-800 text-xs">@{comment.user?.username}</p>
          {isEditing ? (
            <div className="mt-1 space-y-1.5">
              <input type="text" value={editText} onChange={e => setEditText(e.target.value)}
                className="w-full text-sm text-dark-800 bg-surface-50 rounded-lg px-2 py-1 border border-surface-200 outline-none focus:border-primary-400"/>
              <div className="flex gap-2">
                <button onClick={onSaveEdit} className="text-xs text-primary-600 font-bold">Sauvegarder</button>
                <button onClick={onCancelEdit} className="text-xs text-dark-600/50">Annuler</button>
              </div>
            </div>
          ) : (
            <p className="text-dark-700 text-sm mt-0.5 leading-relaxed">{comment.content}</p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-dark-600/40 text-[10px]">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
          </span>
          <button onClick={onReply} className="text-primary-600 text-[10px] font-bold active:scale-95">Répondre</button>
          {isOwner && (
            <>
              <button onClick={onEdit} className="text-blue-500 text-[10px] font-bold active:scale-95">
                <Edit3 size={10} className="inline"/> Modifier
              </button>
              <button onClick={onDelete} className="text-red-500 text-[10px] font-bold active:scale-95">
                <Trash2 size={10} className="inline"/> Suppr.
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MODAL COMMANDE
// ============================================================
function OrderModal({ open, product, shop, user, onClose }) {
  const [form, setForm] = useState({ address: '', phone: '', note: '', quantity: 1 })
  const [loading, setLoading] = useState(false)

  const handleOrder = async () => {
    if (!form.address.trim() || !form.phone.trim()) { toast.error('Adresse et téléphone requis'); return }
    if (form.quantity < 1) { toast.error('Quantité invalide'); return }
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('place_order', {
        p_buyer_id: user.id,
        p_product_id: product.id,
        p_quantity: form.quantity,
        p_delivery_address: form.address,
        p_delivery_phone: form.phone,
        p_note: form.note || null,
      })

      if (error) {
        if (error.message?.includes('insufficient')) toast.error('Solde insuffisant. Rechargez votre wallet.')
        else toast.error(error.message || 'Erreur lors de la commande')
        return
      }

      toast.success('Commande créée avec succès ! 📦')
      setForm({ address: '', phone: '', note: '', quantity: 1 })
      onClose()
    } catch (err) {
      toast.error('Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  if (!product) return null

  return (
    <Modal open={open} onClose={onClose} title="🛒 Passer commande">
      <div className="p-5 space-y-4">
        {/* Produit recap */}
        <div className="flex gap-3 p-3 bg-surface-50 rounded-2xl">
          {product.image_url && <img src={product.image_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0"/>}
          <div>
            <p className="font-bold text-dark-800 text-sm">{product.name}</p>
            <p className="font-display font-bold text-primary-700">{product.price?.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-dark-700">Adresse de livraison *</label>
          <input type="text" placeholder="Votre adresse complète" value={form.address}
            onChange={e => setForm(p => ({...p, address: e.target.value}))} className="input-field"/>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-dark-700">Téléphone *</label>
          <input type="tel" placeholder="+229 XX XX XX XX" value={form.phone}
            onChange={e => setForm(p => ({...p, phone: e.target.value}))} className="input-field"/>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-dark-700">Quantité *</label>
          <input type="number" min="1" value={form.quantity}
            onChange={e => setForm(p => ({...p, quantity: parseInt(e.target.value) || 1}))} className="input-field"/>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-dark-700">Note (optionnel)</label>
          <textarea placeholder="Instructions particulières..." value={form.note}
            onChange={e => setForm(p => ({...p, note: e.target.value}))} className="input-field resize-none" rows={2}/>
        </div>

        {/* Total */}
        <div className="p-3 bg-dark-800 rounded-2xl flex justify-between items-center">
          <span className="text-white/60 text-sm">Total</span>
          <span className="font-display font-bold text-white text-lg">
            {((product.price || 0) * form.quantity).toLocaleString('fr-FR')} FCFA
          </span>
        </div>

        <p className="text-xs text-dark-600/50 text-center">
          🔒 Le montant sera bloqué (escrow) jusqu'à l'acceptation du vendeur
        </p>

        <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleOrder}>
          Créer la commande
        </Button>
      </div>
    </Modal>
  )
}

// ============================================================
// SKELETON
// ============================================================
function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50">
      <div className="h-64 skeleton"/>
      <div className="px-4 -mt-10 space-y-4">
        <div className="flex gap-3 items-end">
          <div className="w-20 h-20 skeleton rounded-2xl"/>
          <div className="flex-1 space-y-2">
            <div className="h-5 skeleton rounded-lg w-2/3"/>
            <div className="h-3.5 skeleton rounded-lg w-1/3"/>
          </div>
        </div>
        <div className="h-12 skeleton rounded-2xl"/>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 skeleton rounded-2xl"/>
          <div className="h-12 skeleton rounded-2xl"/>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1,2,3].map(i => <div key={i} className="w-44 h-56 skeleton rounded-2xl flex-shrink-0"/>)}
        </div>
      </div>
    </div>
  )
}
