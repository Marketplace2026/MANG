import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Heart, Users, MessageCircle, Share2,
  MapPin, Truck, Phone, ChevronRight,
  Send, Trash2, Edit3, CornerDownRight, Copy,
  Check, X, ZoomIn, ShoppingCart, Package,
  MoreHorizontal, ChevronDown, Bell, BellOff, Star
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, PremiumBadge, BottomSheet, Modal, Button } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  const [zoomImage, setZoomImage] = useState(null)
  const [orderModal, setOrderModal] = useState(null)

  const loadShop = useCallback(async () => {
    setLoading(true)
    const isUUID = /^[0-9a-f-]{36}$/.test(slug)
    let query = supabase.from('shops').select(`*, owner:profiles(id, username, full_name, avatar_url, last_seen_at, city)`)
    query = isUUID ? query.eq('id', slug) : query.eq('slug', slug)
    const { data } = await query.single()
    if (!data) { setLoading(false); return }
    setShop(data)

    const { data: prods } = await supabase.from('products').select('*')
      .eq('shop_id', data.id).eq('is_available', true).order('created_at', { ascending: false })
    setProducts(prods || [])

    const { data: likerData } = await supabase.from('shop_likes')
      .select('user:profiles(id, username, avatar_url)').eq('shop_id', data.id)
    setLikers(likerData || [])

    const { data: followerData } = await supabase.from('shop_followers')
      .select('user:profiles(id, username, avatar_url, city)').eq('shop_id', data.id)
    setFollowers(followerData || [])

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
      if (shop.owner_id !== user.id) {
        await supabase.rpc('create_notification', {
          p_user_id: shop.owner_id, p_type: 'shop_follow',
          p_title: '🔔 Nouveau abonné',
          p_body: `@${profile?.username} suit votre boutique "${shop.name}"`,
          p_reference_id: shop.id, p_reference_type: 'shop',
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
      const { error } = await supabase.from('shop_likes').insert({ shop_id: shop.id, user_id: user.id })
      if (error) { toast.error('Erreur'); return }
      setIsLiked(true)
      setShop(s => ({ ...s, likes_count: s.likes_count + 1 }))
      setLikers(prev => [...prev, { user: { id: user.id, username: profile?.username, avatar_url: profile?.avatar_url } }])
      if (shop.owner_id !== user.id) {
        await supabase.rpc('create_notification', {
          p_user_id: shop.owner_id, p_type: 'shop_like',
          p_title: '❤️ Nouveau like',
          p_body: `@${profile?.username} aime votre boutique "${shop.name}"`,
          p_reference_id: shop.id, p_reference_type: 'shop',
        })
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
      <p className="text-5xl">🔍</p>
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

      {/* ══════════════════════════════════════
          HERO COVER — plein écran immersif
      ══════════════════════════════════════ */}
      <div className="relative w-full h-52 overflow-hidden">
        {shop.cover_url ? (
          <img src={shop.cover_url} alt={shop.name}
            className="w-full h-full object-cover"
            onClick={() => setZoomImage(shop.cover_url)}/>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
            <span className="text-8xl opacity-20">🌿</span>
          </div>
        )}
        {/* Gradient dégradé vers le bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>

        {/* Nav bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 border border-white/10">
            <ArrowLeft size={18} className="text-white"/>
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 border border-white/10">
              {linkCopied ? <Check size={16} className="text-emerald-400"/> : <Share2 size={16} className="text-white"/>}
            </button>
            {shop.cover_url && (
              <button onClick={() => setZoomImage(shop.cover_url)}
                className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 border border-white/10">
                <ZoomIn size={16} className="text-white"/>
              </button>
            )}
          </div>
        </div>

        {/* Premium badge */}
        {premiumConfig && (
          <div className={clsx(
            'absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full',
            `bg-gradient-to-r ${premiumConfig.gradient}`,
            'shadow-lg border border-white/20'
          )}>
            {Array.from({length: premiumConfig.stars}).map((_, i) => (
              <Star key={i} size={10} className="text-white fill-white"/>
            ))}
            <span className="text-white text-[11px] font-bold tracking-wide">{premiumConfig.label}</span>
          </div>
        )}

        {/* Nom boutique sur la cover */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="flex items-end gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/60 shadow-xl">
                {shop.owner?.avatar_url
                  ? <img src={shop.owner.avatar_url} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-2xl">
                      {(shop.owner?.username || shop.name || '?')[0].toUpperCase()}
                    </div>}
              </div>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"/>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-0.5">
              <h1 className="text-white font-black text-xl leading-tight truncate drop-shadow-sm">{shop.name}</h1>
              <p className="text-white/60 text-xs font-medium">@{shop.owner?.username}
                {shop.city && <span className="ml-2">📍 {shop.city}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          STATS CARD — flottante
      ══════════════════════════════════════ */}
      <div className="mx-4 -mt-1">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100/50 p-4">

          {/* Stats cliquables */}
          <div className="flex items-center divide-x divide-gray-100 mb-4">
            <button onClick={() => setShowLikers(true)}
              className="flex-1 flex flex-col items-center gap-0.5 active:scale-95 transition-transform">
              <span className="text-xl font-black text-dark-900">{shop.likes_count || 0}</span>
              <span className="text-dark-500/60 text-[11px] font-medium">J'aimes</span>
              {likers.length > 0 && (
                <div className="flex -space-x-1 mt-0.5">
                  {likers.slice(0, 3).map((l, i) => (
                    <Avatar key={i} src={l.user?.avatar_url} name={l.user?.username} size="xs" className="ring-1 ring-white"/>
                  ))}
                </div>
              )}
            </button>
            <button onClick={() => setShowFollowers(true)}
              className="flex-1 flex flex-col items-center gap-0.5 active:scale-95 transition-transform">
              <span className="text-xl font-black text-dark-900">{shop.followers_count || 0}</span>
              <span className="text-dark-500/60 text-[11px] font-medium">Abonnés</span>
              {followers.length > 0 && (
                <div className="flex -space-x-1 mt-0.5">
                  {followers.slice(0, 3).map((f, i) => (
                    <Avatar key={i} src={f.user?.avatar_url} name={f.user?.username} size="xs" className="ring-1 ring-white"/>
                  ))}
                </div>
              )}
            </button>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-xl font-black text-dark-900">{products.length}</span>
              <span className="text-dark-500/60 text-[11px] font-medium">Produits</span>
            </div>
          </div>

          {/* Description */}
          {shop.description && (
            <div className="mb-4 px-3 py-2 bg-gray-50 rounded-2xl overflow-hidden">
              <div className="overflow-hidden whitespace-nowrap">
                <span className="inline-block text-dark-700 text-sm"
                  style={{
                    animation: shop.description.length > 40
                      ? `scrollLoop ${Math.max(12, shop.description.length * 0.35)}s linear infinite` : 'none'
                  }}>
                  {shop.description}
                  {shop.description.length > 40 && <>&nbsp;&nbsp;&nbsp;{shop.description}</>}
                </span>
              </div>
            </div>
          )}

          {/* Badges infos */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {shop.has_delivery && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                <Truck size={11}/> Livraison
              </span>
            )}
            {shop.whatsapp && (
              <a href={`https://wa.me/${shop.whatsapp.replace(/\s+/g, '')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-bold border border-green-100">
                <Phone size={11}/> {shop.whatsapp}
              </a>
            )}
            {isOnline && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[11px] font-bold border border-primary-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"/> En ligne
              </span>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={toggleFollow}
              className={clsx(
                'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]',
                isFollowing
                  ? 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                  : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-200'
              )}>
              {isFollowing
                ? <><BellOff size={15}/> Abonné</>
                : <><Bell size={15}/> Suivre</>}
            </button>
            <button onClick={handleContact}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200 active:scale-[0.97]">
              <MessageCircle size={15}/> Discuter
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ACTIONS SOCIALES
      ══════════════════════════════════════ */}
      <div className="mx-4 mt-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex overflow-hidden">
          {[
            { icon: Heart, label: "J'aime", action: toggleLike, active: isLiked, color: 'text-red-500', bg: 'bg-red-50' },
            { icon: MessageCircle, label: 'Commenter', action: () => document.getElementById('comments-section')?.scrollIntoView({behavior:'smooth'}), active: false, color: 'text-blue-500', bg: '' },
            { icon: Share2, label: 'Partager', action: handleShare, active: linkCopied, color: 'text-primary-600', bg: '' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-all active:scale-95 border-r border-gray-100 last:border-0',
                btn.active ? `${btn.color} ${btn.bg}` : 'text-gray-500'
              )}>
              <btn.icon size={18} className={clsx(btn.active && btn.color, btn.active && 'fill-current')} strokeWidth={btn.active ? 0 : 1.8}/>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          PRODUITS
      ══════════════════════════════════════ */}
      <div className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-dark-900 text-base">
            Produits disponibles
            <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{products.length}</span>
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
            <p className="text-4xl mb-2">📦</p>
            <p className="text-gray-400 text-sm">Aucun produit disponible</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
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

      {/* ══════════════════════════════════════
          COMMENTAIRES
      ══════════════════════════════════════ */}
      <div id="comments-section" className="mt-5 mx-4">
        <CommentsSection shop={shop} user={user} profile={profile}/>
      </div>

      {/* Copier lien */}
      <div className="mx-4 mt-3">
        <button onClick={handleShare}
          className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-600 font-semibold text-sm active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
          {linkCopied ? <><Check size={14} className="text-emerald-500"/> Copié !</> : <><Copy size={14}/> Copier le lien de la boutique</>}
        </button>
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
      <BottomSheet open={showLikers} onClose={() => setShowLikers(false)} title="❤️ J'aimes">
        <div className="px-4 pt-2 pb-8 space-y-3">
          {likers.length === 0
            ? <p className="text-center text-gray-400 py-8">Soyez le premier à aimer !</p>
            : likers.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar src={l.user?.avatar_url} name={l.user?.username} size="md"/>
                <p className="font-semibold text-dark-800 text-sm">@{l.user?.username}</p>
              </div>
            ))}
        </div>
      </BottomSheet>

      {/* ══════ FOLLOWERS SHEET ══════ */}
      <BottomSheet open={showFollowers} onClose={() => setShowFollowers(false)} title="👥 Abonnés">
        <div className="px-4 pt-2 pb-8 space-y-3">
          {followers.length === 0
            ? <p className="text-center text-gray-400 py-8">Aucun abonné pour l'instant</p>
            : followers.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar src={f.user?.avatar_url} name={f.user?.username} size="md"/>
                <div>
                  <p className="font-semibold text-dark-800 text-sm">@{f.user?.username}</p>
                  {f.user?.city && <p className="text-gray-400 text-xs">📍 {f.user.city}</p>}
                </div>
              </div>
            ))}
        </div>
      </BottomSheet>
    </div>
  )
}

// ══════════════════════════════════════
// PRODUCT CARD
// ══════════════════════════════════════
function ProductCard({ product, user, onZoom, onOrder, onFavorite }) {
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('product_favorites').select('id')
      .eq('product_id', product.id).eq('user_id', user.id).single()
      .then(({ data }) => setIsFav(!!data))
  }, [user, product.id])

  const handleFav = async () => { await onFavorite(); setIsFav(v => !v) }
  const isAvailable = product.availability === 'now'

  return (
    <div className="flex-shrink-0 w-48 bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 active:scale-[0.96] transition-all duration-150">
      <div className="relative h-40 overflow-hidden bg-gray-100">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" onClick={onZoom}/>
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🌿</div>}
        <span className={clsx(
          'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold',
          isAvailable ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white'
        )}>
          {isAvailable ? 'Dispo' : 'Bientôt'}
        </span>
        <button onClick={handleFav}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90">
          <Heart size={13} className={isFav ? 'text-red-500 fill-red-500' : 'text-gray-400'}/>
        </button>
      </div>
      <div className="p-3">
        <p className="font-bold text-dark-800 text-sm truncate">{product.name}</p>
        {product.description && (
          <p className="text-gray-400 text-[11px] leading-tight mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <p className="text-[10px] text-primary-600 font-medium mt-1.5">
          {AVAIL_LABELS[product.availability] || '✅ Disponible'}
        </p>
        <div className="flex items-center justify-between mt-2.5">
          <div>
            <span className="font-black text-primary-700 text-base">{product.price?.toLocaleString('fr-FR')}</span>
            <span className="text-[10px] text-gray-400 ml-1">FCFA</span>
          </div>
          <button onClick={onOrder}
            className="w-9 h-9 rounded-2xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-100 active:scale-90">
            <ShoppingCart size={15} className="text-white"/>
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
      await supabase.rpc('create_notification', {
        p_user_id: shop.owner_id, p_type: 'shop_comment',
        p_title: '💬 Nouveau commentaire',
        p_body: `@${profile?.username} a commenté votre boutique "${shop.name}"`,
        p_reference_id: shop.id, p_reference_type: 'shop',
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
            <p className="text-3xl mb-2">💬</p>
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

  return (
    <div className="flex gap-2.5">
      <Avatar src={comment.user?.avatar_url} name={comment.user?.username} size={isReply ? 'xs' : 'sm'} className="flex-shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2.5">
          <p className="font-bold text-dark-800 text-xs">@{comment.user?.username}</p>
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
      const { error } = await supabase.rpc('place_order', {
        p_buyer_id: user.id, p_product_id: product.id,
        p_quantity: form.quantity, p_delivery_address: form.address,
        p_delivery_phone: form.phone, p_note: form.note || null,
      })
      if (error) {
        toast.error(error.message?.includes('insufficient') ? 'Solde insuffisant' : error.message || 'Erreur')
        return
      }
      toast.success('Commande créée ! 📦')
      setForm({ address: '', phone: '', note: '', quantity: 1 })
      onClose()
    } finally { setLoading(false) }
  }

  if (!product) return null

  return (
    <Modal open={open} onClose={onClose} title="🛒 Passer commande">
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
        <p className="text-xs text-gray-400 text-center">🔒 Montant bloqué en escrow jusqu'à l'acceptation</p>
        <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={handleOrder}>
          Créer la commande
        </Button>
      </div>
    </Modal>
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
