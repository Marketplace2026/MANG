import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, SlidersHorizontal, Truck, MapPin,
  Flame, LayoutGrid, ChevronDown, Mic, Camera
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, PremiumBadge, BottomSheet } from '@/components/ui'

// ============================================================
// DISPONIBILITÉ
// ============================================================
const AVAIL = {
  now:  { label: 'Dispo maintenant', color: 'bg-emerald-100 text-emerald-700' },
  '1w': { label: 'Dans 1 semaine',   color: 'bg-blue-100 text-blue-700' },
  '2w': { label: 'Dans 2 semaines',  color: 'bg-blue-100 text-blue-700' },
  '1m': { label: 'Dans 1 mois',      color: 'bg-orange-100 text-orange-700' },
  '2m': { label: 'Dans 2 mois',      color: 'bg-orange-100 text-orange-700' },
  '3m': { label: 'Dans 3 mois',      color: 'bg-red-100 text-red-700' },
  '6m': { label: 'Dans 6 mois',      color: 'bg-red-100 text-red-700' },
  '1y': { label: 'Dans 1 an',        color: 'bg-red-100 text-red-700' },
}

// CATÉGORIES (identiques à votre ancien fichier)
const CATEGORIES = [
  { name: 'Production végétale', icon: '🌱', items: ['Céréales & grains','Légumes','Fruits','Racines & tubercules','Plantes industrielles','Plantes aromatiques & médicinales'] },
  { name: 'Production animale', icon: '🐄', items: ['Bovins','Ovins & caprins','Porcins','Aviculture','Apiculture','Pisciculture & aquaculture'] },
  { name: 'Transformation agricole', icon: '🍯', items: ['Produits céréaliers transformés','Produits fruitiers transformés','Produits tubercules transformés','Produits animaux transformés'] },
  { name: 'Machines & équipements', icon: '🚜', items: ['Machines lourdes','Équipements motorisés','Outils agricoles','Irrigation & énergie','Pièces & maintenance'] },
  { name: 'Intrants agricoles', icon: '🌿', items: ['Semences & plants','Engrais organiques','Engrais chimiques','Amendements du sol','Produits phytosanitaires'] },
  { name: 'Espaces verts', icon: '🌳', items: ['Plantes ornementales','Arbres & arbustes','Gazon & pelouses','Fleurs & pépinières','Aménagement paysager','Entretien des espaces verts','Matériel de jardinage'] },
  { name: 'Services agricoles', icon: '🛠️', items: ['Labour & préparation du sol','Récolte & battage','Transport & logistique','Stockage & conservation','Formation & conseil','Commercialisation & export'] },
]

function normalize(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function fuzzyMatch(query, text) {
  let qi = 0, ti = 0
  while (qi < query.length && ti < text.length) {
    if (query[qi] === text[ti]) qi++
    ti++
  }
  return qi === query.length
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function MarketplacePage() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  const [shops, setShops] = useState([])
  const [allShops, setAllShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [filters, setFilters] = useState({ category: null, categoryName: null, hasDelivery: null, nearby: false })
  const [filterOpen, setFilterOpen] = useState(false)
  const [topOpen, setTopOpen] = useState(false)
  const [topShops, setTopShops] = useState([])

  const [userLocation, setUserLocation] = useState(null)
  const [likedShops, setLikedShops] = useState(new Set())
  const [followedShops, setFollowedShops] = useState(new Set())

  const searchRef = useRef()
  const debounceRef = useRef()

  // Placeholder animé
  const placeholders = ['Maïs, Igname...', 'Boutiques proches...', 'Tomates fraîches...', 'Volailles...', 'Semences...']
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [placeholderVisible, setPlaceholderVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false)
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % placeholders.length)
        setPlaceholderVisible(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { loadShops() }, [filters])

  useEffect(() => {
    if (!user) return
    loadUserInteractions()
    getUserLocation()
  }, [user])

  const getUserLocation = async () => {
    if (!profile?.latitude) return
    setUserLocation({ lat: profile.latitude, lon: profile.longitude })
  }

  const loadUserInteractions = async () => {
    if (!user) return
    const [likes, follows] = await Promise.all([
      supabase.from('shop_likes').select('shop_id').eq('user_id', user.id),
      supabase.from('shop_followers').select('shop_id').eq('user_id', user.id),
    ])
    setLikedShops(new Set((likes.data || []).map(l => l.shop_id)))
    setFollowedShops(new Set((follows.data || []).map(f => f.shop_id)))
  }

  const loadShops = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('shops')
        .select('*, owner:profiles(id, username, avatar_url, last_seen_at)')
        .eq('is_active', true)
        .order('premium_level', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.hasDelivery) query = query.eq('has_delivery', true)
      if (filters.category) query = query.eq('category_id', filters.category)

      const { data } = await query
      let result = data || []

      // Mode proximité
      if (filters.nearby && userLocation) {
        result = result
          .map(s => ({
            ...s,
            distance: s.latitude && s.longitude
              ? distanceKm(userLocation.lat, userLocation.lon, s.latitude, s.longitude)
              : null
          }))
          .filter(s => s.distance !== null && s.distance <= 1500)
          .sort((a, b) => a.distance - b.distance)
      }

      setAllShops(result)
      applySearch(result, search)
    } finally {
      setLoading(false)
    }
  }

  const applySearch = (source, q) => {
    if (!q.trim()) { setShops(source); return }
    const norm = normalize(q)
    const scored = source.map(s => {
      const name = normalize(s.name || '')
      const desc = normalize(s.description || '')
      let score = 0
      if (name.startsWith(norm)) score += 15
      else if (name.includes(norm)) score += 10
      else if (fuzzyMatch(norm, name)) score += 6
      if (desc.includes(norm)) score += 4
      score += (s.premium_level || 0) * 2
      return { ...s, score }
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score)
    setShops(scored)
  }

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      applySearch(allShops, val)
      if (val.trim()) {
        const norm = normalize(val)
        const sugg = allShops
          .filter(s => normalize(s.name).includes(norm) || fuzzyMatch(norm, normalize(s.name)))
          .slice(0, 6)
        setSuggestions(sugg)
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    }, 180)
  }

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) { toast.error('Micro non disponible'); return }
    const recognition = new window.webkitSpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.start()
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript
      handleSearch(text)
      setSearch(text)
    }
    toast('🎤 Parlez maintenant...')
  }

  const handleNearby = async () => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLocation(loc)
        setFilters(f => ({ ...f, nearby: true }))
        toast.success('📍 Boutiques proches chargées')
      },
      () => {
        if (userLocation) {
          setFilters(f => ({ ...f, nearby: true }))
        } else {
          toast.error('Impossible d\'accéder au GPS')
        }
      }
    )
  }

  const loadTopShops = async () => {
    const { data } = await supabase
      .from('shops')
      .select('*, owner:profiles(id, username, avatar_url)')
      .eq('is_active', true)
      .gt('premium_level', 0)
      .order('premium_level', { ascending: false })
      .order('followers_count', { ascending: false })
      .limit(5)
    setTopShops(data || [])
    setTopOpen(true)
  }

  const toggleLike = async (shopId) => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    const isLiked = likedShops.has(shopId)
    if (isLiked) {
      await supabase.from('shop_likes').delete().eq('shop_id', shopId).eq('user_id', user.id)
      setLikedShops(prev => { const s = new Set(prev); s.delete(shopId); return s })
    } else {
      await supabase.from('shop_likes').insert({ shop_id: shopId, user_id: user.id })
      setLikedShops(prev => new Set([...prev, shopId]))
    }
    setShops(prev => prev.map(s =>
      s.id === shopId ? { ...s, likes_count: (s.likes_count || 0) + (isLiked ? -1 : 1) } : s
    ))
  }

  const toggleFollow = async (shopId) => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    const isFollowing = followedShops.has(shopId)
    if (isFollowing) {
      await supabase.from('shop_followers').delete().eq('shop_id', shopId).eq('user_id', user.id)
      setFollowedShops(prev => { const s = new Set(prev); s.delete(shopId); return s })
    } else {
      await supabase.from('shop_followers').insert({ shop_id: shopId, user_id: user.id })
      setFollowedShops(prev => new Set([...prev, shopId]))
    }
    setShops(prev => prev.map(s =>
      s.id === shopId ? { ...s, followers_count: (s.followers_count || 0) + (isFollowing ? -1 : 1) } : s
    ))
  }

  const resetFilters = () => {
    setFilters({ category: null, categoryName: null, hasDelivery: null, nearby: false })
    setSearch('')
    setSuggestions([])
  }

  const activeFiltersCount = [filters.category, filters.hasDelivery, filters.nearby].filter(Boolean).length

  return (
    <div className="min-h-screen bg-surface-50">
      {/* HEADER FIXE */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-primary-800 to-primary-600 shadow-lg max-w-[480px] mx-auto">
        {/* Logo + slogan défilant */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gold-400 flex items-center justify-center">
              <span className="text-lg">🌿</span>
            </div>
            <span className="font-display font-bold text-white text-base">MANG</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap text-white/70 text-xs font-medium">
              🌍 MANG – La nouvelle génération du marché agricole en Afrique • 🌽 Achetez • Vendez • Connectez producteurs et acheteurs • 🚜 La marketplace agricole moderne
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="px-3 pb-3 relative">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 h-10 shadow-sm border-2 border-white/0 focus-within:border-gold-400 transition-all">
            {/* Caméra */}
            <button className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center active:scale-90">
              <Camera size={13} className="text-dark-600"/>
            </button>

            {/* Input avec placeholder animé */}
            <div className="flex-1 relative">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => search && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full bg-transparent text-dark-800 text-sm font-medium outline-none"
              />
              {!search && (
                <span className={clsx(
                  'absolute inset-0 flex items-center text-dark-600/40 text-sm font-medium pointer-events-none transition-all duration-300',
                  placeholderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                )}>
                  🔍 {placeholders[placeholderIdx]}
                </span>
              )}
            </div>

            {search && (
              <button onClick={() => { setSearch(''); applySearch(allShops, ''); setShowSuggestions(false) }}
                className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center active:scale-90">
                <X size={11} className="text-dark-600"/>
              </button>
            )}

            {/* Micro */}
            <button onClick={handleVoiceSearch} className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center active:scale-90">
              <Mic size={13} className="text-dark-600"/>
            </button>

            {/* Recherche */}
            <button onClick={() => applySearch(allShops, search)}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center active:scale-90 shadow-green">
              <Search size={14} className="text-white"/>
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl shadow-modal z-50 overflow-hidden">
              {suggestions.map(s => (
                <button key={s.id}
                  onClick={() => { setSearch(s.name); applySearch(allShops, s.name); setShowSuggestions(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left border-b border-surface-100 last:border-0">
                  <Search size={14} className="text-dark-600/40 flex-shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-dark-800">{s.name}</p>
                    {s.city && <p className="text-xs text-dark-600/50">{s.city}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* CONTENU */}
      <div className="pt-[108px] pb-24">

        {/* BOUTONS FILTRES HORIZONTAUX */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2.5">
          {[
            { label: '🔄 Tous', action: resetFilters, active: activeFiltersCount === 0 },
            { label: '🔥 Top boutiques', action: loadTopShops, active: false },
            { label: '📂 Catégories', action: () => setFilterOpen(true), active: !!filters.category },
            { label: '🚚 Livraison', action: () => setFilters(f => ({ ...f, hasDelivery: !f.hasDelivery })), active: !!filters.hasDelivery },
            { label: '📍 Proches', action: handleNearby, active: filters.nearby },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-95',
                btn.active
                  ? 'bg-primary-600 text-white shadow-green'
                  : 'bg-white text-dark-700 shadow-card'
              )}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* FILTRE ACTIF LABEL */}
        {filters.categoryName && (
          <div className="px-3 pb-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100">
              <span className="text-primary-700 text-xs font-semibold">{filters.categoryName}</span>
              <button onClick={() => setFilters(f => ({ ...f, category: null, categoryName: null }))}>
                <X size={12} className="text-primary-500"/>
              </button>
            </div>
          </div>
        )}

        {/* LISTE BOUTIQUES */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 px-3">
            {[...Array(6)].map((_, i) => <ShopSkeleton key={i}/>)}
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-display text-lg font-bold text-dark-800">Aucune boutique trouvée</p>
            <button onClick={resetFilters} className="mt-4 btn-primary">Tout afficher</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-3">
            {shops.map(shop => (
              <ShopCard
                key={shop.id}
                shop={shop}
                isLiked={likedShops.has(shop.id)}
                isFollowing={followedShops.has(shop.id)}
                onLike={() => toggleLike(shop.id)}
                onFollow={() => toggleFollow(shop.id)}
                onOpen={() => navigate(`/boutique/${shop.slug || shop.id}`)}
                isNearby={filters.nearby}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL FILTRES CATÉGORIES */}
      <CategoryModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onSelect={(cat, item) => {
          setFilters(f => ({ ...f, category: null, categoryName: `${cat.icon} ${item}` }))
          setFilterOpen(false)
          toast(`Filtre: ${item}`)
        }}
      />

      {/* TOP BOUTIQUES */}
      <BottomSheet open={topOpen} onClose={() => setTopOpen(false)} title="🔥 Top 5 Boutiques">
        <div className="px-4 pt-2 pb-6 space-y-3">
          {topShops.map((shop, i) => (
            <TopShopItem
              key={shop.id}
              shop={shop}
              rank={i + 1}
              isFollowing={followedShops.has(shop.id)}
              onFollow={() => toggleFollow(shop.id)}
              onOpen={() => { setTopOpen(false); navigate(`/boutique/${shop.slug || shop.id}`) }}
            />
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

// ============================================================
// SHOP CARD
// ============================================================
function ShopCard({ shop, isLiked, isFollowing, onLike, onFollow, onOpen, isNearby }) {
  const isOnline = shop.owner?.last_seen_at
    ? (new Date() - new Date(shop.owner.last_seen_at)) < 120000 : false

  const premiumRing = { 3: 'ring-2 ring-gold-400', 2: 'ring-2 ring-slate-400', 1: 'ring-2 ring-amber-700/50' }[shop.premium_level] || ''

  return (
    <div className={clsx('bg-white rounded-2xl shadow-card overflow-hidden active:scale-[0.97] transition-transform duration-150 cursor-pointer', premiumRing)}
      onClick={onOpen}>
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
        {shop.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🌿</div>
        }
        {/* Badge premium */}
        {shop.premium_level > 0 && (
          <div className="absolute top-2 right-2">
            <PremiumBadge level={shop.premium_level}/>
          </div>
        )}
        {/* Livraison */}
        {shop.has_delivery && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary-700/90 backdrop-blur-sm">
            <Truck size={9} className="text-white"/>
            <span className="text-white text-[9px] font-bold">Livraison</span>
          </div>
        )}
        {/* Distance si mode proche */}
        {isNearby && shop.distance != null && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm">
            <span className="text-white text-[10px] font-bold">📍 {shop.distance < 1 ? (shop.distance*1000).toFixed(0)+'m' : shop.distance.toFixed(1)+'km'}</span>
          </div>
        )}
        {/* Bouton like */}
        <button onClick={e => { e.stopPropagation(); onLike() }}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90">
          <span className={clsx('text-sm transition-transform', isLiked && 'scale-110')}>
            {isLiked ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* Infos */}
      <div className="p-2.5">
        <div className="flex items-start gap-2 -mt-6">
          <div className="relative flex-shrink-0">
            <Avatar src={shop.owner?.avatar_url} name={shop.name} size="md"
              className="ring-2 ring-white shadow-sm"/>
            {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-dark-800 text-xs leading-tight truncate">{shop.name}</h3>
            <p className="text-dark-600/50 text-[10px]">@{shop.owner?.username}</p>
          </div>
        </div>

        {/* Description scrollante */}
        {shop.description && (
          <div className="mt-1.5 overflow-hidden">
            <p className="text-dark-600/60 text-[10px] leading-tight line-clamp-2">{shop.description}</p>
          </div>
        )}

        {/* Stats + suivre */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-100">
          <button onClick={e => { e.stopPropagation(); onFollow() }}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex-1',
              isFollowing ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-dark-600'
            )}>
            {isFollowing ? '❤️' : '🤍'}
            <span>{shop.followers_count || 0}</span>
          </button>
          <div className="flex items-center gap-0.5 text-[10px] text-dark-600/50">
            <span>👍</span>
            <span>{shop.likes_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TOP SHOP ITEM
// ============================================================
function TopShopItem({ shop, rank, isFollowing, onFollow, onOpen }) {
  const rankColors = ['from-gold-500 to-gold-600','from-slate-400 to-slate-500','from-amber-700 to-amber-800']
  const premiumStars = ['','⭐','⭐⭐','⭐⭐⭐'][shop.premium_level || 0]

  return (
    <div className="relative flex items-center gap-3 p-3 bg-white rounded-2xl shadow-card">
      {/* Rang */}
      <div className={clsx('absolute -top-2 -left-2 w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black bg-gradient-to-br shadow-sm', rankColors[rank-1] || 'from-primary-500 to-primary-600')}>
        #{rank}
      </div>

      {/* Image */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100">
        {shop.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🌿</div>
        }
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-dark-800 text-sm truncate">{shop.name}</p>
        {premiumStars && <p className="text-gold-500 text-xs font-semibold">{premiumStars}</p>}
        <p className="text-dark-600/50 text-xs">❤️ {shop.followers_count || 0} abonnés</p>

        <div className="flex gap-2 mt-2">
          <button onClick={onFollow}
            className={clsx('flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95',
              isFollowing ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-surface-50 text-dark-600 border-surface-200')}>
            {isFollowing ? '❤️ Abonné' : '🤍 Suivre'}
          </button>
          <button onClick={onOpen}
            className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-primary-600 text-white shadow-green active:scale-95">
            Ouvrir
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MODAL CATÉGORIES
// ============================================================
function CategoryModal({ open, onClose, onSelect }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  if (!open) return null

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || normalize(item).includes(normalize(search)) || normalize(cat.name).includes(normalize(search))
    )
  })).filter(cat => cat.items.length > 0)

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="bottom-sheet z-50 max-w-[480px] mx-auto left-0 right-0">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-300"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
          <h3 className="font-display text-lg font-bold text-dark-800">📂 Catégories</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center">
            <X size={16}/>
          </button>
        </div>

        {/* Recherche catégorie */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40"/>
            <input type="text" placeholder="Rechercher une catégorie..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 text-sm"/>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] px-4 pb-6 space-y-2">
          {filtered.map(cat => (
            <div key={cat.name} className="rounded-2xl border-2 border-surface-200 overflow-hidden">
              <button onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}
                className="w-full flex items-center justify-between p-3.5 bg-surface-50 active:bg-surface-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-bold text-dark-800 text-sm">{cat.name}</span>
                </div>
                <ChevronDown size={16} className={clsx('text-dark-600/40 transition-transform duration-200', expanded === cat.name && 'rotate-180')}/>
              </button>
              {expanded === cat.name && (
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-white">
                  {cat.items.map(item => (
                    <button key={item} onClick={() => onSelect(cat, item)}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-50 active:bg-primary-50 text-left transition-colors">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-xs font-semibold text-dark-700 truncate">{item}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ============================================================
// SKELETON
// ============================================================
function ShopSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="h-36 skeleton"/>
      <div className="p-2.5 space-y-2">
        <div className="flex gap-2 -mt-4">
          <div className="w-11 h-11 rounded-2xl skeleton flex-shrink-0"/>
          <div className="flex-1 space-y-1 pt-1">
            <div className="h-3 skeleton rounded-lg w-3/4"/>
            <div className="h-2.5 skeleton rounded-lg w-1/2"/>
          </div>
        </div>
        <div className="h-2.5 skeleton rounded-lg"/>
        <div className="h-2.5 skeleton rounded-lg w-2/3"/>
      </div>
    </div>
  )
}
