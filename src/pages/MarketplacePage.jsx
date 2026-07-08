import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

const BANNERS = [
  { id: 1, title: 'Produits frais du Bénin', desc: 'Frais, Locaux, Livrés chez vous', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop' },
  { id: 2, title: 'Livraison 24h partout', desc: 'Commandez en toute simplicité', image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500&auto=format&fit=crop' },
  { id: 3, title: 'Vendeurs Vérifiés', desc: 'Des professionnels de confiance', image: 'https://images.unsplash.com/photo-1463121859909-073c417de9bc?w=500&auto=format&fit=crop' }
]

const QUICK_CATS = [
  { icon: '🌱', label: 'Céréales', name: 'Céréales & Légumineuses' },
  { icon: '🥔', label: 'Tubercules', name: 'Tubercules & Racines' },
  { icon: '🍎', label: 'Fruits', name: 'Fruits & Légumes' },
  { icon: '🥩', label: 'Élevage', name: 'Produits Animaux' }
]

const GRID_CATEGORIES = [
  { name: 'Céréales', icon: '🌽' },
  { name: 'Tubercules', icon: '🥔' },
  { name: 'Fruits', icon: '🍎' },
  { name: 'Légumes', icon: '🍅' },
  { name: 'Élevage', icon: '🐄' },
  { name: 'Produits Transformés', icon: '🍯' },
  { name: 'Intrants', icon: '🌿' },
  { name: 'Pêche', icon: '🐟' },
  { name: 'Artisanat', icon: '🏺' },
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
  const location = useLocation()

  const [shops, setShops] = useState([])
  const [allShops, setAllShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [filters, setFilters] = useState({ category: null, categoryName: null, hasDelivery: null, nearby: false })
  const [filterOpen, setFilterOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sortBy, setSortBy] = useState(() => new URLSearchParams(window.location.search).get('sortBy') || 'recent')
  const [minRating, setMinRating] = useState(null)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [topShopsOnly, setTopShopsOnly] = useState(false)
  const [activeBanner, setActiveBanner] = useState(0)
  const [topOpen, setTopOpen] = useState(false)
  const [topShops, setTopShops] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [dbCategories, setDbCategories] = useState([])
  const [userCity, setUserCity] = useState(null)
  const [geolocError, setGeolocError] = useState(false)

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
    loadTop5Shops()
    
    // Charger les catégories de la base de données
    const loadCats = async () => {
      const { data } = await supabase.from('categories').select('*')
      setDbCategories(data || [])
    }
    loadCats()

    // Défilement du carrousel de bannières toutes les 3 secondes
    const bannerTimer = setInterval(() => {
      setActiveBanner(b => (b + 1) % BANNERS.length)
    }, 3000)

    // Défilement des placeholders
    const placeholderTimer = setInterval(() => {
      setPlaceholderVisible(false)
      setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % placeholders.length)
        setPlaceholderVisible(true)
      }, 300)
    }, 2500)

    return () => {
      clearInterval(bannerTimer)
      clearInterval(placeholderTimer)
    }
  }, [])

  useEffect(() => {
    if (location.state?.openCategories || location.search.includes('openCategories')) {
      setFilterOpen(true)
    }
  }, [location])

  useEffect(() => { loadShops() }, [filters, sortBy, minRating, verifiedOnly, topShopsOnly, selectedGroup])

  useEffect(() => {
    if (!user) return
    loadUserInteractions()
    getUserLocation()
  }, [user])

  const getUserLocation = async () => {
    // 1. Utiliser immédiatement la position sauvegardée (affichage instantané)
    if (profile?.latitude && profile?.longitude) {
      setUserLocation({ lat: profile.latitude, lon: profile.longitude })
    }
    // 2. Toujours re-détecter en arrière-plan pour mettre à jour si l'user a bougé
    if (!navigator.geolocation) return
    let done = false
    let watchId = null
    watchId = navigator.geolocation.watchPosition(
      async ({ coords: { latitude, longitude, accuracy } }) => {
        if (done) return
        if (accuracy < 500) {
          done = true
          navigator.geolocation.clearWatch(watchId)
          setUserLocation({ lat: latitude, lon: longitude })
          // Mettre à jour en DB seulement si position a changé significativement
          if (user?.id) {
            const oldLat = profile?.latitude
            const oldLon = profile?.longitude
            const moved = !oldLat || !oldLon ||
              distanceKm(oldLat, oldLon, latitude, longitude) > 0.5 // > 500m
            if (moved) {
              await supabase.from('profiles').update({ latitude, longitude }).eq('id', user.id)
            }
          }
        }
      },
      () => { done = true },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 } // accepte position < 5min
    )
    setTimeout(() => {
      if (!done) { done = true; navigator.geolocation.clearWatch(watchId) }
    }, 25000)
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

  const getGroupCategoryIds = (catName) => {
    if (!dbCategories.length) return []
    if (catName === 'Céréales') {
      return dbCategories.filter(c => c.group_name === 'Céréales & Légumineuses').map(c => c.id)
    }
    if (catName === 'Tubercules') {
      return dbCategories.filter(c => c.group_name === 'Tubercules & Racines').map(c => c.id)
    }
    if (catName === 'Fruits') {
      return dbCategories.filter(c => c.group_name === 'Fruits & Légumes' && (c.name.toLowerCase().includes('fruit') || c.name.toLowerCase().includes('banane') || c.name.toLowerCase().includes('mangue') || c.name.toLowerCase().includes('ananas') || c.name.toLowerCase().includes('papaye'))).map(c => c.id)
    }
    if (catName === 'Légumes') {
      return dbCategories.filter(c => c.group_name === 'Fruits & Légumes' && (c.name.toLowerCase().includes('legume') || c.name.toLowerCase().includes('tomate') || c.name.toLowerCase().includes('oignon') || c.name.toLowerCase().includes('piment') || c.name.toLowerCase().includes('gombo') || c.name.toLowerCase().includes('aubergine'))).map(c => c.id)
    }
    if (catName === 'Élevage') {
      return dbCategories.filter(c => c.group_name === 'Produits Animaux' && !c.name.toLowerCase().includes('poisson')).map(c => c.id)
    }
    if (catName === 'Produits Transformés') {
      return dbCategories.filter(c => c.group_name === 'Produits Transformés').map(c => c.id)
    }
    if (catName === 'Intrants') {
      return dbCategories.filter(c => c.group_name === 'Intrants Agricoles').map(c => c.id)
    }
    if (catName === 'Pêche') {
      return dbCategories.filter(c => c.group_name === 'Produits Animaux' && c.name.toLowerCase().includes('poisson')).map(c => c.id)
    }
    if (catName === 'Artisanat') {
      return dbCategories.filter(c => c.group_name === 'Épices & Condiments').map(c => c.id)
    }
    return []
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
      if (selectedGroup) {
        const targetIds = getGroupCategoryIds(selectedGroup)
        if (targetIds.length > 0) {
          query = query.in('category_id', targetIds)
        } else {
          query = query.eq('category_id', '00000000-0000-0000-0000-000000000000')
        }
      }
      if (verifiedOnly) query = query.eq('is_verified', true)
      if (topShopsOnly) query = query.gt('premium_level', 0)
      if (minRating) query = query.gte('rating_avg', minRating)
      if (sortBy === 'rating') query = query.order('rating_avg', { ascending: false })
      else if (sortBy === 'followers') query = query.order('followers_count', { ascending: false })
      else if (sortBy === 'likes') query = query.order('likes_count', { ascending: false })

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
          .filter(s => s.distance !== null && s.distance <= 50)
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

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`)
      const data = await res.json()
      if (data && data.address) {
        const quartier = data.address.suburb || data.address.neighbourhood || data.address.quarter || ""
        const ville = data.address.city || data.address.town || data.address.village || data.address.county || ""
        if (quartier && ville) return `${quartier}, ${ville}`
        if (ville) return ville
        if (quartier) return quartier
      }
    } catch (e) {
      console.error(e)
    }
    return "Commune inconnue"
  }

  const triggerGeolocation = () => {
    if (!navigator.geolocation) {
      setGeolocError(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setGeolocError(false)
        const loc = { lat: latitude, lon: longitude }
        setUserLocation(loc)
        const cityName = await reverseGeocode(latitude, longitude)
        setUserCity(cityName)
        if (user?.id) {
          await supabase.from('profiles').update({ city: cityName, latitude, longitude }).eq('id', user.id)
        }
      },
      () => {
        setGeolocError(true)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    )
  }

  useEffect(() => {
    if (profile?.city) {
      setUserCity(profile.city)
      if (profile.latitude && profile.longitude) {
        setUserLocation({ lat: profile.latitude, lon: profile.longitude })
      }
    } else {
      triggerGeolocation()
    }
  }, [profile])

  const handleNearby = () => {
    if (userLocation) {
      setFilters(f => ({ ...f, nearby: !f.nearby }))
    } else {
      triggerGeolocation()
    }
  }

  const loadTop5Shops = async () => {
    const { data } = await supabase
      .from('shops')
      .select('*, owner:profiles(id, username, avatar_url, last_seen_at)')
      .eq('is_active', true)
      .order('followers_count', { ascending: false })
      .limit(5)
    setTopShops(data || [])
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
    setTopShops(prev => prev.map(s =>
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
    setTopShops(prev => prev.map(s =>
      s.id === shopId ? { ...s, followers_count: (s.followers_count || 0) + (isFollowing ? -1 : 1) } : s
    ))
  }

  const resetFilters = () => {
    setFilters({ category: null, categoryName: null, hasDelivery: null, nearby: false })
    setSortBy('recent')
    setMinRating(null)
    setVerifiedOnly(false)
    setTopShopsOnly(false)
    setSelectedGroup(null)
    setSearch('')
    setSuggestions([])
  }

  const handleTopBoutiquesToggle = () => {
    setSortBy(prev => prev === 'likes' ? 'recent' : 'likes')
  }

  const activeFiltersCount = [
    filters.category, filters.hasDelivery, filters.nearby,
    minRating, verifiedOnly || null, topShopsOnly || null,
    sortBy !== 'recent' ? sortBy : null
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-surface-50">
      {/* HEADER FIXE */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#004d00] shadow-lg max-w-[480px] mx-auto">
        
        {/* Logo & Bandeau Défilant */}
        <div className="relative flex items-center h-12 w-full overflow-hidden bg-[#004d00] border-b border-white/5">
          {/* Logo collé à gauche avec z-index 20 et arrière-plan opaque */}
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-3 pr-4 bg-[#004d00]">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/marketplace')}>
              <img src="/logo-mang.png" className="w-10 h-10 hover:scale-110 active:scale-95 transition-transform duration-200" />
              <span className="font-display font-black text-white text-sm tracking-wider">MANG</span>
            </div>
          </div>

          {/* Bandeau défilant qui passe derrière le logo */}
          <div className="w-full overflow-hidden z-10">
            <div className="animate-marquee-behind whitespace-nowrap text-[9px] font-bold text-white uppercase tracking-wider">
              UN MARCHÉ AGRICOLE NOUVELLE GÉNÉRATION • FRAIS, LOCAUX, LIVRÉS CHEZ VOUS • PAIEMENT MOBILE MONEY
            </div>
          </div>
        </div>

        {/* Barre de recherche et Localisation */}
        <div className="px-3 py-2.5 relative">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 h-12 shadow-sm border-2 border-white/0 focus-within:border-gold-400 transition-all">
            {/* Bouton de Localisation dynamique */}
            <button onClick={handleNearby} className={clsx(
              "flex-shrink-0 flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border",
              userCity ? "bg-primary-100 text-primary-700 border-primary-200" : "bg-red-50 text-red-600 border-red-200 animate-pulse"
            )}>
              <MapPin size={12} className={userCity ? "text-primary-600" : "text-red-500"}/>
              <span className="truncate max-w-[85px]">{userCity ? `📍 ${userCity}` : "📍 Définir ma position"}</span>
            </button>

            {/* Input de recherche */}
            <div className="flex-1 relative">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => search && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Recher Maïs, Igname, Tomates, Poulets..."
                className="w-full bg-transparent text-dark-800 text-sm font-medium outline-none placeholder-dark-600/40"
              />
            </div>

            {search && (
              <button onClick={() => { setSearch(''); applySearch(allShops, ''); setShowSuggestions(false) }}
                className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center active:scale-90">
                <X size={11} className="text-dark-600"/>
              </button>
            )}

            {/* Caméra */}
            <button className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center active:scale-90">
              <Camera size={13} className="text-dark-600"/>
            </button>

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

      {/* CONTENU PRINCIPAL */}
      <div className="pt-[116px] pb-24">
        {/* CARROUSEL BANNIÈRES */}
        <div className="px-3 mb-5 mt-3">
          <div className="relative h-28 rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-primary-800 to-primary-600">
            <img
              src={BANNERS[activeBanner].image}
              alt={BANNERS[activeBanner].title}
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply"
            />
            <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/50 to-transparent">
              <h4 className="text-white font-bold text-sm leading-tight">{BANNERS[activeBanner].title}</h4>
              <p className="text-white/80 text-[10px] mt-0.5 line-clamp-1">{BANNERS[activeBanner].desc}</p>
            </div>
            {/* Points de navigation */}
            <div className="absolute bottom-2.5 right-3 flex gap-1 z-10">
              {BANNERS.map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-all duration-300',
                    activeBanner === i ? 'bg-gold-400 w-3' : 'bg-white/55'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* BARRE DES FILTRES RAPIDES */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2">
          {[
            { label: '🔥 Populaire', action: handleTopBoutiquesToggle, active: sortBy === 'likes' },
            { label: '✅ Vérifiés', action: () => setVerifiedOnly(v => !v), active: verifiedOnly },
            { label: '🚚 Livraison', action: () => setFilters(f => ({ ...f, hasDelivery: !f.hasDelivery })), active: !!filters.hasDelivery },
            { label: '📍 Proches', action: handleNearby, active: filters.nearby },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              className={clsx(
                'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 border flex items-center gap-1',
                btn.active
                  ? 'bg-primary-600 text-white border-primary-600 shadow-green'
                  : 'bg-white text-dark-700 border-surface-200/50 shadow-card'
              )}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* FILTRE ACTIF LABEL */}
        {selectedGroup && (
          <div className="px-3 pb-1 mt-2.5 animate-fade-in flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100">
              <span className="text-primary-700 text-xs font-semibold">📂 {selectedGroup}</span>
              <button onClick={() => setSelectedGroup(null)}>
                <X size={12} className="text-primary-500"/>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 5 : TOP 5 BOUTIQUES MANG */}
        {topShops.length > 0 && !selectedGroup && (
          <div className="mb-6 pt-3">
            <div className="flex items-center justify-between px-3 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🔥</span>
                <h2 className="font-display font-black text-dark-800 text-sm tracking-tight uppercase">Top 5 Boutiques MANG</h2>
              </div>
              <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">VIP Partners</span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 pb-2.5">
              {topShops.slice(0, 5).map((shop, i) => (
                <TopShopCard
                  key={shop.id}
                  shop={shop}
                  rank={i + 1}
                  isLiked={likedShops.has(shop.id)}
                  isFollowing={followedShops.has(shop.id)}
                  onLike={() => toggleLike(shop.id)}
                  onFollow={() => toggleFollow(shop.id)}
                  onOpen={() => navigate(`/boutique/${shop.slug || shop.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* SECTION 6 : TOUTES LES BOUTIQUES */}
        <div className="px-3 mb-2.5 mt-2 flex items-center justify-between">
          <h2 className="font-display font-black text-dark-800 text-sm tracking-tight uppercase">Toutes les Boutiques</h2>
          {activeFiltersCount > 0 && (
            <button onClick={resetFilters} className="text-[10px] font-bold text-primary-600 hover:text-primary-700">
              Réinitialiser ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* LISTE BOUTIQUES FILTRÉES */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 px-3">
            {[...Array(6)].map((_, i) => <ShopSkeleton key={i}/>)}
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-4xl mb-2">🫙</p>
            <p className="text-dark-600 font-bold text-sm">Aucune boutique dans cette catégorie</p>
            <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-primary-600 text-white font-bold rounded-xl text-xs active:scale-95 shadow-sm">
              Tout afficher
            </button>
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
      <AdvancedFilterSheet
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        sortBy={sortBy} setSortBy={setSortBy}
        minRating={minRating} setMinRating={setMinRating}
        verifiedOnly={verifiedOnly} setVerifiedOnly={setVerifiedOnly}
        onReset={resetFilters}
      />

      <CategoryModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        dbCategories={dbCategories}
        allShops={allShops}
        onSelectGroup={setSelectedGroup}
      />

      <style>{`
        @keyframes marquee-behind {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-behind {
          display: inline-block;
          animation: marquee-behind 25s linear infinite;
        }
      `}</style>
    </div>
  )
}

// ============================================================
// TOP SHOP CARD
// ============================================================
function TopShopCard({ shop, isLiked, isFollowing, onLike, onFollow, onOpen, rank }) {
  const medalColor = { 1: 'bg-gold-400 text-gold-950', 2: 'bg-slate-300 text-slate-900', 3: 'bg-amber-600 text-amber-50' }[rank] || 'bg-primary-500 text-white'
  
  return (
    <div className="relative w-44 flex-shrink-0 bg-white rounded-2xl shadow-card overflow-hidden active:scale-[0.97] transition-transform duration-150 cursor-pointer border border-surface-200" onClick={onOpen}>
      {/* Badge de classement */}
      <div className={`absolute top-2 left-2 z-20 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black shadow-md ${medalColor}`}>
        <span>N°{rank}</span>
      </div>

      {/* Image cover (petite photo de la boutique) */}
      <div className="relative h-20 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
        {shop.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🌿</div>
        }
      </div>

      {/* Infos */}
      <div className="p-2">
        {/* Avatar + Nom + username */}
        <div className="flex items-center gap-1.5 mb-2">
          <Avatar src={shop.owner?.avatar_url} name={shop.name} size="xs" className="ring-1 ring-white shadow-sm flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-dark-800 text-[10px] leading-tight truncate">{shop.name}</h3>
            <p className="text-dark-600/40 text-[9px] truncate">@{shop.owner?.username}</p>
          </div>
        </div>

        {/* Boutons d'action : icônes uniquement, pas de texte */}
        <div className="flex gap-1.5 pt-1.5 border-t border-surface-100">
          {/* Bell button */}
          <button
            onClick={e => { e.stopPropagation(); onFollow() }}
            className={clsx(
              'flex items-center justify-center flex-1 py-1.5 rounded-xl transition-all duration-200 active:scale-95',
              isFollowing
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-surface-100 text-dark-400'
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24"
              fill={isFollowing ? 'white' : 'none'}
              stroke={isFollowing ? 'white' : 'currentColor'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>

          {/* Like button */}
          <button
            onClick={e => { e.stopPropagation(); onLike() }}
            className={clsx(
              'flex items-center justify-center flex-1 py-1.5 rounded-xl transition-all duration-200 active:scale-95',
              isLiked
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-surface-100 text-dark-400'
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24"
              fill={isLiked ? 'white' : 'none'}
              stroke={isLiked ? 'white' : 'currentColor'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>
        </div>
      </div>
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

      {/* Image cover */}
      <div className="relative h-32 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
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
      </div>

      {/* Infos */}
      <div className="px-2.5 pt-2 pb-2.5">

        {/* Nom + username — sans avatar qui déborde */}
        <div className="flex items-center gap-2 mb-1">
          <div className="relative flex-shrink-0">
            <Avatar src={shop.owner?.avatar_url} name={shop.name} size="sm"
              className="ring-2 ring-white shadow-sm"/>
            {isOnline && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-white"/>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-dark-800 text-xs leading-tight truncate">{shop.name}</h3>
            <p className="text-dark-600/40 text-[10px] truncate">@{shop.owner?.username}</p>
          </div>
        </div>

        {/* Rating + Verified */}
        {(shop.reviews_count > 0 || shop.is_verified) && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {shop.reviews_count > 0 && (
              <div className="flex items-center gap-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                <span className="text-[10px] font-bold text-amber-600">{Number(shop.rating_avg||0).toFixed(1)}</span>
                <span className="text-[9px] text-dark-600/40">({shop.reviews_count})</span>
              </div>
            )}
            {shop.is_verified && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 rounded-full">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-blue-600 text-[9px] font-bold">Vérifié</span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {shop.description && (
          <p className="text-dark-600/60 text-[10px] leading-tight line-clamp-2 mb-2">{shop.description}</p>
        )}

        {/* Actions : cloche abonnement + pouce like — sans compteurs (les vrais chiffres sont dans la page boutique) */}
        <div className="flex items-center gap-2 pt-2 border-t border-surface-100">

          {/* Bouton Abonnement — cloche */}
          <button
            onClick={e => { e.stopPropagation(); onFollow() }}
            className={clsx(
              'flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-95',
              isFollowing
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-surface-100 text-dark-400'
            )}
          >
            <svg width="13" height="13" viewBox="0 0 24 24"
              fill={isFollowing ? 'white' : 'none'}
              stroke={isFollowing ? 'white' : 'currentColor'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span>{isFollowing ? 'Abonné' : 'Suivre'}</span>
          </button>

          {/* Bouton Like — pouce */}
          <button
            onClick={e => { e.stopPropagation(); onLike() }}
            className={clsx(
              'flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-95',
              isLiked
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-surface-100 text-dark-400'
            )}
          >
            <svg width="13" height="13" viewBox="0 0 24 24"
              fill={isLiked ? 'white' : 'none'}
              stroke={isLiked ? 'white' : 'currentColor'}
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span>{isLiked ? 'Aimé' : "J'aime"}</span>
          </button>

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
        <p className="text-dark-600/50 text-xs">🔔 {shop.followers_count || 0} abonnés</p>

        <div className="flex gap-2 mt-2">
          <button onClick={onFollow}
            className={clsx('flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 flex items-center justify-center gap-1',
              isFollowing ? 'bg-primary-500 text-white border-primary-500' : 'bg-surface-50 text-dark-600 border-surface-200')}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={isFollowing ? 'white' : 'none'}
              stroke={isFollowing ? 'white' : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {isFollowing ? 'Abonné' : 'Suivre'}
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
// MODAL CATÉGORIES (GRILLE 3x3 ALIBABA)
// ============================================================
function CategoryModal({ open, onClose, dbCategories, allShops, onSelectGroup }) {
  const [emptyGroup, setEmptyGroup] = useState(null)

  if (!open) return null

  const GROUPS = [
    { name: 'Céréales & Légumineuses', label: 'Céréales', icon: '🌽' },
    { name: 'Tubercules & Racines', label: 'Tubercules', icon: '🥔' },
    { name: 'Fruits & Légumes', label: 'Fruits & Légumes', icon: '🍎' },
    { name: 'Produits Animaux', label: 'Élevage', icon: '🥩' },
    { name: 'Produits Transformés', label: 'Transformés', icon: '🍯' },
    { name: 'Épices & Condiments', label: 'Épices', icon: '🌶️' },
    { name: 'Intrants Agricoles', label: 'Intrants', icon: '🌿' },
    { name: 'RESET', label: 'Tous', icon: '🔄' },
    { name: 'CLOSE', label: 'Fermer', icon: '❌' },
  ]

  const handleGroupClick = (group) => {
    if (group.name === 'CLOSE') {
      onClose()
      return
    }
    if (group.name === 'RESET') {
      onSelectGroup(null)
      onClose()
      return
    }

    // Compter les boutiques correspondantes
    const count = allShops.filter(s => {
      const cat = dbCategories.find(c => c.id === s.category_id)
      return cat && cat.group_name === group.name
    }).length

    if (count === 0) {
      setEmptyGroup(group.label)
    } else {
      onSelectGroup(group.name)
      onClose()
    }
  }

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="bottom-sheet z-50 max-w-[480px] mx-auto left-0 right-0 p-5">
        <div className="flex justify-center pt-1 pb-3">
          <div className="w-10 h-1 rounded-full bg-surface-300"/>
        </div>

        {emptyGroup ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-4xl">🫙</div>
            <p className="text-dark-800 font-bold text-sm">
              Aucune boutique n'a cette catégorie pour le moment
            </p>
            <button
              onClick={() => setEmptyGroup(null)}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
            >
              Retour
            </button>
          </div>
        ) : (
          <div>
            <h3 className="font-display text-base font-black text-dark-800 text-center mb-4 uppercase tracking-wider">
              Catégories MANG
            </h3>
            
            <div className="grid grid-cols-3 gap-3.5">
              {GROUPS.map((g, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGroupClick(g)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface-50 border-2 border-surface-200 active:scale-95 hover:border-primary-400 transition-all text-center aspect-square"
                >
                  <span className="text-2xl mb-1.5">{g.icon}</span>
                  <span className="text-[10px] font-black text-dark-800 leading-tight line-clamp-2">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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

// ============================================================
// ADVANCED FILTER SHEET
// ============================================================
function AdvancedFilterSheet({ open, onClose, sortBy, setSortBy, minRating, setMinRating, verifiedOnly, setVerifiedOnly, onReset }) {
  const SORT_OPTIONS = [
    { key: 'recent',    label: '🕐 Plus récentes' },
    { key: 'rating',    label: '⭐ Meilleures notes' },
    { key: 'followers', label: '👥 Plus suivies' },
    { key: 'likes',     label: '❤️ Plus aimées' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="🎛️ Filtres avancés">
      <div className="px-4 pt-2 pb-8 space-y-6" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

        {/* Trier par */}
        <div>
          <p className="font-black text-dark-800 text-sm mb-3">Trier par</p>
          <div className="grid grid-cols-2 gap-2">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)}
                className={clsx(
                  'py-3 rounded-2xl border-2 text-sm font-bold transition-all active:scale-95',
                  sortBy === opt.key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 bg-white text-dark-700'
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note minimale */}
        <div>
          <p className="font-black text-dark-800 text-sm mb-3">Note minimale</p>
          <div className="flex gap-2">
            {[null, 4, 3, 2].map((val, i) => (
              <button key={i} onClick={() => setMinRating(val)}
                className={clsx(
                  'flex-1 py-2.5 rounded-2xl border-2 text-sm font-bold transition-all active:scale-95',
                  minRating === val ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 text-gray-500'
                )}>
                {val === null ? 'Toutes' : `${val}⭐+`}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <p className="font-black text-dark-800 text-sm mb-3">Options</p>
          <button onClick={() => setVerifiedOnly(v => !v)}
            className={clsx(
              'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left',
              verifiedOnly ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white'
            )}>
            <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              verifiedOnly ? 'border-primary-500 bg-primary-500' : 'border-gray-300')}>
              {verifiedOnly && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-dark-800">✅ Boutiques vérifiées seulement</p>
              <p className="text-[10px] text-gray-400">Vendeurs officiellement vérifiés par MANG</p>
            </div>
          </button>
        </div>

        {/* Boutons action */}
        <div className="flex gap-3">
          <button onClick={() => { onReset(); onClose() }}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm active:scale-95">
            Réinitialiser
          </button>
          <button onClick={onClose}
            className="flex-[2] py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-md active:scale-95">
            Appliquer ✓
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

