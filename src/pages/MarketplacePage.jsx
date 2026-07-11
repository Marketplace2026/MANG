import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Search, X, SlidersHorizontal, Truck, MapPin,
  Flame, LayoutGrid, ChevronDown, Mic, Camera, Globe as GlobeIcon, Bell as BellIcon, Store
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useNotificationsStore } from '@/store'
import { Avatar, PremiumBadge, BottomSheet } from '@/components/ui'
import { ProductCard } from '@/components/marketplace/ShopCard'
import LocationModal from '@/components/marketplace/LocationModal'
import InteractiveMap from '@/components/marketplace/InteractiveMap'

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
  const { unreadCount } = useNotificationsStore()

  const [shops, setShops] = useState([])
  const [allShops, setAllShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1)
  
  // États de recherche avancée
  const [allProducts, setAllProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchTab, setSearchTab] = useState('shops') // 'shops' or 'products'
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mang_search_history')) || []
    } catch {
      return []
    }
  })
  const [isListening, setIsListening] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

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
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [radius, setRadius] = useState(50) // Rayon par défaut de 50km
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  
  const [userLocation, setUserLocation] = useState(null)
  const [likedShops, setLikedShops] = useState(new Set())
  const [followedShops, setFollowedShops] = useState(new Set())

  const searchRef = useRef()
  const debounceRef = useRef()
  const fileInputRef = useRef()
  const [favoriteProducts, setFavoriteProducts] = useState(new Set())

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

  useEffect(() => { loadShops() }, [filters, sortBy, minRating, verifiedOnly, topShopsOnly, selectedGroup, userLocation, radius])

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

      // Calculer systématiquement la distance pour toutes les boutiques si la position de l'utilisateur est connue
      if (userLocation) {
        result = result.map(s => ({
          ...s,
          distance: s.latitude && s.longitude
            ? distanceKm(userLocation.lat, userLocation.lon, s.latitude, s.longitude)
            : null
        }))

        if (filters.nearby) {
          result = result.filter(s => s.distance !== null && (radius === 999 || s.distance <= radius))
          result.sort((a, b) => {
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })
        }
      }

      // Charger également les produits actifs pour la recherche produit avec leurs coordonnées de boutique
      const { data: prodsData } = await supabase
        .from('products')
        .select('*, shop:shops(name, slug, is_active, is_verified, premium_level, latitude, longitude)')
        .eq('is_available', true)
      
      const activeProducts = (prodsData || []).map(p => {
        const shopLat = p.shop?.latitude
        const shopLon = p.shop?.longitude
        const distance = (userLocation && shopLat && shopLon)
          ? distanceKm(userLocation.lat, userLocation.lon, shopLat, shopLon)
          : null
        return { ...p, distance }
      })

      setAllProducts(activeProducts)
      setAllShops(result)
      applySearch(result, activeProducts, search)
    } finally {
      setLoading(false)
    }
  }

  const addToHistory = (term) => {
    if (!term || !term.trim()) return
    const cleanTerm = term.trim()
    setSearchHistory(prev => {
      const filtered = prev.filter(t => t !== cleanTerm)
      const next = [cleanTerm, ...filtered].slice(0, 5)
      localStorage.setItem('mang_search_history', JSON.stringify(next))
      return next
    })
  }

  const removeFromHistory = (term) => {
    setSearchHistory(prev => {
      const next = prev.filter(t => t !== term)
      localStorage.setItem('mang_search_history', JSON.stringify(next))
      return next
    })
  }

  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('mang_search_history')
  }

  const applySearch = (sourceShops, sourceProducts, q) => {
    if (!q.trim()) {
      setShops(sourceShops)
      setFilteredProducts([])
      return
    }
    const norm = normalize(q)

    // Filtrer les boutiques
    const scoredShops = sourceShops.map(s => {
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
    setShops(scoredShops)

    // Filtrer les produits
    const scoredProducts = sourceProducts.map(p => {
      const name = normalize(p.name || '')
      const desc = normalize(p.description || '')
      let score = 0
      if (name.startsWith(norm)) score += 15
      else if (name.includes(norm)) score += 10
      else if (fuzzyMatch(norm, name)) score += 6
      if (desc.includes(norm)) score += 4
      score += (p.shop?.premium_level || 0) * 2
      return { ...p, score }
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score)
    setFilteredProducts(scoredProducts)

    if (scoredShops.length === 0 && scoredProducts.length > 0) {
      setSearchTab('products')
    } else if (scoredShops.length > 0) {
      setSearchTab('shops')
    }
  }

  const handleSearch = (val) => {
    setSearch(val)
    setFocusedSuggestionIndex(-1)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      applySearch(allShops, allProducts, val)
      if (val.trim()) {
        const norm = normalize(val)

        // Suggestions de boutiques
        const matchingShops = allShops
          .filter(s => normalize(s.name || '').includes(norm) || fuzzyMatch(norm, normalize(s.name || '')))
          .slice(0, 3)
          .map(s => ({
            type: 'shop',
            id: s.id,
            name: s.name,
            slug: s.slug,
            city: s.owner?.city || s.city || ''
          }))

        // Suggestions de produits
        const matchingProducts = allProducts
          .filter(p => normalize(p.name || '').includes(norm) || fuzzyMatch(norm, normalize(p.name || '')))
          .slice(0, 3)
          .map(p => ({
            type: 'product',
            id: p.id,
            name: p.name,
            price: p.price,
            shopName: p.shop?.name || ''
          }))

        setSuggestions([...matchingProducts, ...matchingShops])
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 180)
  }

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) { toast.error('Micro non disponible'); return }
    const recognition = new window.webkitSpeechRecognition()
    recognition.lang = 'fr-FR'
    setIsListening(true)
    recognition.start()
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript
      handleSearch(text)
      setSearch(text)
      addToHistory(text)
    }
    recognition.onerror = () => {
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
  }

  const handleImageSearch = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      const fileName = file.name.toLowerCase()
      let detectedProduct = "Tomate"
      if (fileName.includes("mais") || fileName.includes("corn")) detectedProduct = "Maïs"
      else if (fileName.includes("piment") || fileName.includes("pepper")) detectedProduct = "Piment"
      else if (fileName.includes("poulet") || fileName.includes("chicken")) detectedProduct = "Poulet"
      else if (fileName.includes("igname") || fileName.includes("yam")) detectedProduct = "Igname"
      else {
        const defaultFruits = ["Ananas", "Avocat", "Mangue", "Cacao", "Manioc"]
        detectedProduct = defaultFruits[Math.floor(Math.random() * defaultFruits.length)]
      }
      setSearch(detectedProduct)
      addToHistory(detectedProduct)
      applySearch(allShops, allProducts, detectedProduct)
      toast.success(`📷 Produit détecté : ${detectedProduct} ! 🍅`, { duration: 4000 })
    }, 2000)
  }

  const handleToggleFavoriteProduct = (prodId) => {
    setFavoriteProducts(prev => {
      const next = new Set(prev)
      if (next.has(prodId)) {
        next.delete(prodId)
        toast.success('Retiré des favoris !')
      } else {
        next.add(prodId)
        toast.success('Ajouté aux favoris ! ❤️')
      }
      return next
    })
  }

  const highlightMatch = (text, query) => {
    if (!query) return <span>{text}</span>
    const index = normalize(text).indexOf(normalize(query))
    if (index === -1) return <span>{text}</span>
    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)
    return (
      <span>
        {before}
        <span className="font-extrabold text-primary-700">{match}</span>
        {after}
      </span>
    )
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedSuggestionIndex(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
        e.preventDefault()
        const selected = suggestions[focusedSuggestionIndex]
        if (selected.type === 'product') {
          navigate(`/produit/${selected.id}`)
        } else {
          navigate(`/boutique/${selected.slug || selected.id}`)
        }
        setShowSuggestions(false)
      }
    }
  }
  const handleSelectLocation = async (cityName, lat, lon) => {
    setUserCity(cityName)
    setUserLocation({ lat, lon })
    localStorage.setItem('mang_user_city', cityName)
    localStorage.setItem('mang_user_lat', lat.toString())
    localStorage.setItem('mang_user_lon', lon.toString())

    if (user?.id) {
      await supabase.from('profiles').update({ city: cityName, latitude: lat, longitude: lon }).eq('id', user.id)
    }
  }

  useEffect(() => {
    const localCity = localStorage.getItem('mang_user_city')
    const localLat = localStorage.getItem('mang_user_lat')
    const localLon = localStorage.getItem('mang_user_lon')

    if (profile?.city) {
      setUserCity(profile.city)
      if (profile.latitude && profile.longitude) {
        setUserLocation({ lat: profile.latitude, lon: profile.longitude })
      }
    } else if (localCity) {
      setUserCity(localCity)
      if (localLat && localLon) {
        setUserLocation({ lat: parseFloat(localLat), lon: parseFloat(localLon) })
      }
    } else {
      // Force le modal d'onboarding s'il n'y a aucune localisation sauvegardée
      setLocationModalOpen(true)
    }
  }, [profile])

  const handleNearby = () => {
    if (userLocation) {
      setFilters(f => ({ ...f, nearby: !f.nearby }))
    } else {
      setLocationModalOpen(true)
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
      <header className="fixed top-0 left-0 right-0 z-30 bg-green-700 shadow-lg max-w-[480px] mx-auto">
        {/* LIGNE 1 : HEADER PRINCIPAL */}
        <div className="bg-green-700 h-14 pl-0 pr-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer h-full" onClick={() => navigate('/marketplace')}>
            <img src="/logo-mang.png" alt="MANG" className="w-14 h-14 hover:scale-105 active:scale-95 transition-transform duration-200 object-cover" />
            <span className="font-display font-black text-white text-[20px] tracking-wider leading-none">MANG</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/vendeur">
              <Store className="w-7 h-7 text-white animate-bounce-gentle hover:scale-110 transition" />
            </Link>
            <Link to="/communaute">
              <GlobeIcon className="w-7 h-7 text-white animate-bounce-gentle hover:text-yellow-300 transition-colors" />
            </Link>
            <Link to="/notifications">
              <div className="relative">
                <BellIcon className="w-7 h-7 text-white animate-bounce-gentle hover:scale-110 transition" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 min-h-5 flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
        {/* LIGNE 2 : BANDEAU TEXTE DÉROULANT ET LOCALISATION DYNAMIQUE */}
        <div className="relative bg-green-600 h-9 flex items-center overflow-hidden border-t border-green-600/30" style={{fontFamily: 'Poppins'}}>
          
          {/* Localisation Fixe à gauche */}
          <div 
            className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-2 bg-gradient-to-r from-green-600 via-green-600 to-transparent"
            style={{ paddingRight: '32px' }}
          >
            <button 
              onClick={handleNearby}
              className="flex items-center gap-1.5 px-2.5 bg-green-700 hover:bg-green-800 border border-green-500/20 rounded-lg text-white font-black text-[11.5px] active:scale-95 transition-all shadow-sm h-[30px]"
            >
              <MapPin size={11} className={userCity ? "text-yellow-300 animate-bounce-gentle" : "text-red-400 animate-pulse"} />
              <span className="truncate max-w-[110px] leading-none">
                {userCity ? `${userCity}` : "Définir position"}
              </span>
              {filters.nearby && (
                <span className="bg-yellow-400 text-dark-950 text-[8px] font-black px-1.5 py-0.5 rounded leading-none flex-shrink-0">Proche</span>
              )}
            </button>
          </div>

          {/* Texte Déroulant (défilement classique de droite à gauche, passant derrière la localisation) */}
          <div className="animate-marquee whitespace-nowrap text-white font-medium tracking-wider text-sm pl-[180px]">
            🌾 MARCHÉ AGRICOLE NOUVELLE GÉNÉRATION 🛒 | VENDEURS DE PRODUITS AGRICOLES 🥭 | LIVRAISON VRAIMENT MOBILE 🚚 | ACHETEZ ET VENDEZ DIRECT PRODUCTEUR 📱
          </div>

          {/* Filtres Actifs Fixes à droite */}
          {activeFiltersCount > 0 && (
            <div 
              onClick={resetFilters}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center px-3 bg-gradient-to-l from-green-600 via-green-600 to-transparent cursor-pointer active:scale-95 transition-all"
              style={{ paddingLeft: '24px' }}
            >
              <span className="bg-yellow-400 text-dark-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="px-3 py-2 relative bg-green-700">
          <div className="flex items-center gap-2 bg-white rounded-2xl px-3 h-12 shadow-sm border-2 border-white/0 focus-within:border-gold-400 transition-all">
            <Search size={16} className="text-dark-600/40 flex-shrink-0" />
            <div className="flex-1 relative">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher des produits, boutiques..."
                className="w-full bg-transparent text-dark-800 text-sm font-semibold outline-none placeholder-dark-600/40"
              />
            </div>

            {search && (
              <button onClick={() => { setSearch(''); applySearch(allShops, allProducts, ''); setShowSuggestions(false) }}
                className="w-5 h-5 rounded-full bg-surface-200 flex items-center justify-center active:scale-90 transition-transform">
                <X size={11} className="text-dark-600"/>
              </button>
            )}

            {/* Appareil photo / Recherche visuelle */}
            <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center active:scale-90 transition-all">
              <Camera size={15} className="text-dark-600"/>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSearch} 
              className="hidden" 
              accept="image/*"
            />

            {/* Micro / Recherche vocale */}
            <button onClick={handleVoiceSearch} className="flex-shrink-0 w-8 h-8 rounded-full hover:bg-surface-100 flex items-center justify-center active:scale-90 transition-all">
              <Mic size={15} className="text-dark-600"/>
            </button>

            {/* Bouton recherche */}
            <button onClick={() => { addToHistory(search); applySearch(allShops, allProducts, search); setShowSuggestions(false) }}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-700 flex items-center justify-center active:scale-90 transition-all shadow-green">
              <Search size={14} className="text-white"/>
            </button>
          </div>

          {/* Dropdown de suggestions et historique */}
          {showSuggestions && (
            <div 
              className="absolute left-3 right-3 top-full mt-1 bg-white rounded-2xl shadow-modal z-50 overflow-hidden border border-surface-200 max-h-[300px] overflow-y-auto"
              onMouseDown={e => e.preventDefault()}
            >
              {!search.trim() ? (
                searchHistory.length > 0 ? (
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[11px] font-black text-dark-600/40 uppercase tracking-wider">Recherches récentes</span>
                      <button onClick={clearHistory} className="text-[10px] font-bold text-red-500 hover:underline">Vider tout</button>
                    </div>
                    <div className="space-y-1">
                      {searchHistory.map((term, i) => (
                        <div key={i} className="flex items-center justify-between hover:bg-surface-50 rounded-xl transition-colors">
                          <button 
                            onClick={() => { setSearch(term); applySearch(allShops, allProducts, term); setShowSuggestions(false) }}
                            className="flex-1 flex items-center gap-2.5 px-2.5 py-2 text-left text-sm font-semibold text-dark-800"
                          >
                            <span className="text-dark-600/40">⏳</span>
                            {term}
                          </button>
                          <button 
                            onClick={() => removeFromHistory(term)}
                            className="w-7 h-7 flex items-center justify-center text-dark-600/30 hover:text-red-500 rounded-full hover:bg-red-50 mr-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs font-semibold text-dark-600/40">
                    Tapez pour rechercher des produits ou des boutiques...
                  </div>
                )
              ) : (
                suggestions.length > 0 ? (
                  <div className="py-1">
                    {suggestions.map((s, idx) => (
                      <button
                        key={s.type + s.id}
                        onClick={() => {
                          if (s.type === 'product') {
                            navigate(`/produit/${s.id}`)
                          } else {
                            navigate(`/boutique/${s.slug || s.id}`)
                          }
                          setShowSuggestions(false)
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 transition-colors text-left border-b border-surface-100/50 last:border-0",
                          idx === focusedSuggestionIndex && "bg-surface-100"
                        )}
                      >
                        {s.type === 'product' ? (
                          <>
                            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-xs flex-shrink-0">🌾</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-dark-800 truncate">{highlightMatch(s.name, search)}</p>
                              <p className="text-[10px] text-dark-600/50 truncate font-semibold">
                                Produit de <span className="text-primary-700">{s.shopName}</span> • <span className="text-emerald-700 font-bold">{s.price.toLocaleString()} FCFA</span>
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-7 h-7 rounded-lg bg-gold-50 flex items-center justify-center text-xs flex-shrink-0">🏪</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-dark-800 truncate">{highlightMatch(s.name, search)}</p>
                              <p className="text-[10px] text-dark-600/50 truncate font-semibold">Boutique • 📍 {s.city || 'Bénin'}</p>
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs font-semibold text-dark-600/40">
                    Aucun résultat pour "{search}"
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* ONGLETS RECHERCHE HYBRIDE */}
        {search.trim() !== '' && (
          <div className="flex bg-green-800 border-t border-green-600/30">
            <button 
              onClick={() => setSearchTab('shops')}
              className={clsx(
                "flex-1 py-2 text-center text-xs font-bold transition-all border-b-2",
                searchTab === 'shops' ? "text-yellow-300 border-yellow-300 bg-green-700/30" : "text-white/70 border-transparent hover:text-white"
              )}
            >
              Boutiques ({shops.length})
            </button>
            <button 
              onClick={() => setSearchTab('products')}
              className={clsx(
                "flex-1 py-2 text-center text-xs font-bold transition-all border-b-2",
                searchTab === 'products' ? "text-yellow-300 border-yellow-300 bg-green-700/30" : "text-white/70 border-transparent hover:text-white"
              )}
            >
              Produits ({filteredProducts.length})
            </button>
          </div>
        )}
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="pb-24 transition-all duration-300" style={{ paddingTop: search.trim() !== '' ? '202px' : '164px' }}>
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

        {/* CARROUSEL HORIZONTAL DES CATÉGORIES POPULAIRES (STYLE ALIBABA / JUMIA) */}
        <div className="px-3 mb-4">
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {[
              { name: 'Maïs', icon: '🌽' },
              { name: 'Igname', icon: '🍠' },
              { name: 'Volaille', icon: '🐔' },
              { name: 'Tomate', icon: '🍅' },
              { name: 'Soja', icon: '🫘' },
              { name: 'Engrais', icon: '🧪' },
              { name: 'Poisson', icon: '🐟' },
            ].map((pCat) => {
              const catDb = dbCategories.find(c => c.name.toLowerCase() === pCat.name.toLowerCase())
              const isActive = filters.category === catDb?.id

              return (
                <button
                  key={pCat.name}
                  onClick={() => {
                    if (!catDb) return
                    if (isActive) {
                      setFilters(f => ({ ...f, category: null, categoryName: null }))
                    } else {
                      setFilters(f => ({ ...f, category: catDb.id, categoryName: catDb.name }))
                      setSelectedGroup(null)
                    }
                  }}
                  className="flex flex-col items-center flex-shrink-0 gap-1 active:scale-95 transition-all"
                >
                  <div className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm transition-all border-2",
                    isActive 
                      ? "bg-primary-50 border-primary-500 scale-105 shadow-green" 
                      : "bg-surface-50 border-surface-200"
                  )}>
                    {pCat.icon}
                  </div>
                  <span className={clsx(
                    "text-[10px] font-black leading-tight transition-colors",
                    isActive ? "text-primary-700 font-extrabold" : "text-dark-700"
                  )}>
                    {pCat.name}
                  </span>
                </button>
              )
            })}
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

        {/* FILTRE DU RAYON DE PROXIMITÉ SI PROCHES ACTIF */}
        {filters.nearby && (
          <div className="px-3 py-1 flex items-center gap-2 overflow-x-auto no-scrollbar animate-slide-up bg-surface-50 border-b border-surface-200/50 pb-2">
            <span className="text-[10px] font-black text-dark-600/60 uppercase tracking-wider flex-shrink-0">Rayon :</span>
            {[
              { label: '5 km', val: 5 },
              { label: '10 km', val: 10 },
              { label: '25 km', val: 25 },
              { label: '50 km', val: 50 },
              { label: 'Tout le Bénin', val: 999 },
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setRadius(opt.val)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase transition active:scale-95 border leading-none',
                  radius === opt.val
                    ? 'bg-green-700 text-white border-green-700 shadow-sm'
                    : 'bg-white text-dark-800 border-surface-200 hover:border-green-600'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {/* FILTRE ACTIF LABEL */}
        {(selectedGroup || filters.categoryName) && (
          <div className="px-3 pb-1 mt-2.5 animate-fade-in flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100">
              <span className="text-primary-700 text-xs font-black">
                {selectedGroup ? `📂 ${selectedGroup}` : `🌱 ${filters.categoryName}`}
              </span>
              <button onClick={() => {
                if (selectedGroup) {
                  setSelectedGroup(null)
                } else {
                  setFilters(f => ({ ...f, category: null, categoryName: null }))
                }
              }}>
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

        {/* SECTION 6 : TOUTES LES BOUTIQUES OU PRODUITS */}
        <div className="px-3 mb-2.5 mt-2 flex items-center justify-between">
          <h2 className="font-display font-black text-dark-800 text-sm tracking-tight uppercase">
            {search.trim() !== '' 
              ? (searchTab === 'shops' ? 'Boutiques correspondantes' : 'Produits correspondants') 
              : 'Toutes les Boutiques'}
          </h2>
          <div className="flex items-center gap-3">
            {(search.trim() === '' || searchTab === 'shops') && (
              <button 
                onClick={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
                className="text-[10px] font-black text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg tracking-wide uppercase hover:bg-primary-100 transition active:scale-95 flex items-center gap-1"
              >
                {viewMode === 'list' ? '🗺️ Vue Carte' : '📱 Vue Liste'}
              </button>
            )}
            {activeFiltersCount > 0 && (
              <button onClick={resetFilters} className="text-[10px] font-bold text-primary-600 hover:text-primary-700">
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* LISTE BOUTIQUES OU PRODUITS FILTRÉS */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 px-3">
            {[...Array(6)].map((_, i) => <ShopSkeleton key={i}/>)}
          </div>
        ) : search.trim() !== '' && searchTab === 'products' ? (
          filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-4xl mb-2">🌾</p>
              <p className="text-dark-600 font-bold text-sm">Aucun produit correspondant</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-3">
              {filteredProducts.map(prod => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  shopName={prod.shop?.name || 'MANG'}
                  onOrder={() => navigate(`/boutique/${prod.shop?.slug || prod.shop_id}`)}
                  onFavorite={() => handleToggleFavoriteProduct(prod.id)}
                  isFavorite={favoriteProducts.has(prod.id)}
                />
              ))}
            </div>
          )
        ) : shops.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-4xl mb-2">🫙</p>
            <p className="text-dark-600 font-bold text-sm">Aucune boutique correspondante</p>
            <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-primary-600 text-white font-bold rounded-xl text-xs active:scale-95 shadow-sm">
              Tout afficher
            </button>
          </div>
        ) : viewMode === 'map' ? (
          <div className="px-3">
            <InteractiveMap 
              shops={shops} 
              userLocation={userLocation} 
              userCity={userCity} 
            />
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
        onSelectGroup={(groupName) => {
          setSelectedGroup(groupName)
          setFilters(f => ({ ...f, category: null, categoryName: null }))
        }}
        onSelectCategory={(catId, catName) => {
          setFilters(f => ({ ...f, category: catId, categoryName: catName }))
          setSelectedGroup(null)
        }}
      />

      {/* OVERLAY DE SCAN VISUEL */}
      {isScanning && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center max-w-[480px] mx-auto">
          <div className="relative w-48 h-48 border-4 border-primary-500 rounded-3xl flex items-center justify-center overflow-hidden bg-black/40 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary-400 shadow-[0_0_15px_#22c55e] animate-scan-laser" />
            <span className="text-6xl animate-pulse">📸</span>
          </div>
          <p className="text-white font-bold mt-6 text-sm tracking-wider animate-pulse uppercase">Analyse MANG AI en cours...</p>
        </div>
      )}

      {/* OVERLAY DE RECHERCHE VOCALE ACTIVE */}
      {isListening && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center max-w-[480px] mx-auto">
          <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center animate-ping absolute opacity-30" />
          <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center z-10 relative shadow-lg">
            <Mic className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white font-bold mt-8 text-sm tracking-wider">MANG écoute...</p>
          <p className="text-white/60 text-xs mt-2">Dites le nom d'un produit (ex: "Tomate")</p>
        </div>
      )}

      <style>{`
        @keyframes marquee-behind {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-behind {
          display: inline-block;
          animation: marquee-behind 25s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 20s linear infinite;
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-gentle {
          display: inline-block;
          animation: bounce-gentle 2s infinite;
        }
        @keyframes scan-laser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan-laser {
          position: absolute;
          animation: scan-laser 2s infinite linear;
        }
      `}</style>
      <LocationModal 
        open={locationModalOpen} 
        onClose={() => setLocationModalOpen(false)} 
        onSelect={handleSelectLocation}
        forceMandatory={!userCity}
      />
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
// MODAL CATÉGORIES EN SPLIT-PANEL (STYLE ALIBABA / JUMIA)
// ============================================================
function CategoryModal({ open, onClose, dbCategories, allShops, onSelectGroup, onSelectCategory }) {
  const [activeGroup, setActiveGroup] = useState('Céréales & Légumineuses')

  if (!open) return null

  // Groupes prédéfinis avec leurs labels et icônes
  const GROUPS = [
    { name: 'Céréales & Légumineuses', label: 'Céréales', icon: '🌽' },
    { name: 'Tubercules & Racines', label: 'Tubercules', icon: '🥔' },
    { name: 'Fruits & Légumes', label: 'Fruits & Légumes', icon: '🍎' },
    { name: 'Produits Animaux', label: 'Élevage', icon: '🥩' },
    { name: 'Produits Transformés', label: 'Transformés', icon: '🍯' },
    { name: 'Épices & Condiments', label: 'Épices', icon: '🌶️' },
    { name: 'Intrants Agricoles', label: 'Intrants', icon: '🌿' },
  ]

  // Récupérer les sous-catégories associées au groupe actif
  const subCategories = dbCategories.filter(c => c.group_name === activeGroup)

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="bottom-sheet z-50 max-w-[480px] mx-auto left-0 right-0 p-0 rounded-t-3xl overflow-hidden bg-white animate-slide-up flex flex-col h-[480px]">
        {/* En-tête */}
        <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
          <h3 className="font-display font-black text-sm text-dark-800 uppercase tracking-wide">
            Catégories Agricoles
          </h3>
          <button 
            onClick={() => {
              onSelectGroup(null)
              onClose()
            }}
            className="text-[10px] font-black text-primary-600 bg-primary-50 px-2.5 py-1.5 rounded-lg tracking-wide uppercase active:scale-95 transition"
          >
            Tous les produits
          </button>
        </div>

        {/* Corps split-panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panneau gauche : Catégories Parentes */}
          <div className="w-[140px] bg-surface-50 border-r border-surface-100 overflow-y-auto no-scrollbar py-2">
            {GROUPS.map((g, idx) => {
              const isActive = activeGroup === g.name
              return (
                <button
                  key={idx}
                  onClick={() => setActiveGroup(g.name)}
                  className={clsx(
                    "w-full px-3 py-4 flex flex-col items-center justify-center gap-1 transition text-center relative border-b border-surface-100/50",
                    isActive 
                      ? "bg-white text-primary-600 font-bold" 
                      : "text-dark-800 hover:bg-surface-100/50"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-md" />
                  )}
                  <span className="text-xl">{g.icon}</span>
                  <span className="text-[10px] font-bold leading-tight">{g.label}</span>
                </button>
              )
            })}
          </div>

          {/* Panneau droit : Sous-catégories */}
          <div className="flex-1 bg-white overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-surface-100">
              <span className="text-[10px] font-black text-dark-600/40 uppercase tracking-wider truncate max-w-[130px]">
                {activeGroup}
              </span>
              <button
                onClick={() => {
                  onSelectGroup(activeGroup)
                  onClose()
                }}
                className="text-[9px] font-black text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded flex-shrink-0"
              >
                Tout voir
              </button>
            </div>

            {subCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl opacity-30">🫙</span>
                <span className="text-[10px] font-bold text-dark-600/50 mt-1">Bientôt disponible</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {subCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.id, cat.name)
                      onClose()
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-surface-200 hover:border-primary-400 hover:bg-primary-50/10 active:scale-95 transition text-left"
                  >
                    <span className="text-base">{cat.icon || '🌱'}</span>
                    <span className="text-[10px] font-black text-dark-800 leading-tight truncate">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bouton Fermer */}
        <div className="p-3 border-t border-surface-100 bg-surface-50 text-center">
          <button 
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-900 text-white font-bold text-xs active:scale-95 transition"
          >
            Fermer
          </button>
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

