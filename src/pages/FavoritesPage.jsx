import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import {
  Heart, Store, Package, Trash2, MapPin, Truck,
  ChevronRight, AlertCircle, RefreshCw, ShoppingBag,
  ArrowUpDown, CheckCircle2
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

// ── Onglets ────────────────────────────────────────────────
const TABS = [
  { key: 'shops',    label: 'Boutiques',  icon: Store   },
  { key: 'products', label: 'Produits',   icon: Package },
]

// ── Options de tri ─────────────────────────────────────────
const SORT_SHOPS = [
  { key: 'recent',    label: 'Récents'    },
  { key: 'name',      label: 'Nom A→Z'   },
]
const SORT_PRODUCTS = [
  { key: 'recent',    label: 'Récents'    },
  { key: 'price_asc', label: 'Prix ↑'    },
  { key: 'price_desc',label: 'Prix ↓'    },
  { key: 'name',      label: 'Nom A→Z'   },
]

// ── Skeleton card ──────────────────────────────────────────
function SkeletonShopCard() {
  return (
    <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-surface-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-surface-100 rounded-full w-3/4" />
        <div className="h-2.5 bg-surface-100 rounded-full w-1/2" />
        <div className="h-2 bg-surface-100 rounded-full w-1/3" />
      </div>
    </div>
  )
}

function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-surface-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-surface-100 rounded-full w-3/4" />
        <div className="h-3 bg-surface-100 rounded-full w-1/2" />
        <div className="h-2.5 bg-surface-100 rounded-full w-2/3" />
      </div>
    </div>
  )
}

// ── Compteur animé ─────────────────────────────────────────
function AnimatedCount({ value }) {
  const [displayed, setDisplayed] = useState(value)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setAnimKey(k => k + 1)
    setDisplayed(value)
  }, [value])

  return (
    <span
      key={animKey}
      style={{
        display: 'inline-block',
        animation: 'countPop 0.3s cubic-bezier(0.34,1.56,0.64,1)'
      }}
    >
      {displayed}
    </span>
  )
}

// ── Carte boutique favorite (2 colonnes) ──────────────────
function ShopFavoriteCard({ item, onUnfollow, index }) {
  const navigate = useNavigate()
  const shop = item.shop
  const [removing, setRemoving] = useState(false)

  const handleUnfollow = (e) => {
    e.stopPropagation()
    setRemoving(true)
    setTimeout(() => onUnfollow(item), 280)
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-surface-100 overflow-hidden transition-all duration-300 flex flex-col',
        removing
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 scale-100 active:scale-[0.97]'
      )}
      style={{ animation: `slideIn 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms both` }}
      onClick={() => navigate(`/boutique/${shop?.slug}`)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
        {shop?.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🌿</div>
        }
        {shop?.has_delivery && (
          <div className="absolute top-2 left-2 bg-primary-700/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Truck size={9} className="text-white" />
            <span className="text-[9px] font-bold text-white">Livraison</span>
          </div>
        )}
        {/* Bouton retirer */}
        <button
          onClick={handleUnfollow}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <Heart size={13} className="text-red-400 fill-red-400" />
        </button>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Infos */}
      <div className="p-2.5 flex-1">
        <p className="font-bold text-dark-800 text-xs truncate">{shop?.name}</p>
        <p className="text-[10px] text-dark-400 truncate">@{shop?.owner?.username}</p>
        {shop?.city && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={8} className="text-dark-300" />
            <span className="text-[9px] text-dark-400 truncate">{shop.city}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carte produit favori (2 colonnes) ─────────────────────
function ProductFavoriteCard({ item, onUnfavorite, index }) {
  const navigate = useNavigate()
  const product = item.product
  const shop = product?.shop
  const [removing, setRemoving] = useState(false)
  const unavailable = product?.is_available === false

  const handleUnfavorite = (e) => {
    e.stopPropagation()
    setRemoving(true)
    setTimeout(() => onUnfavorite(item), 280)
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col',
        unavailable ? 'border-surface-200 opacity-75' : 'border-surface-100',
        removing
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 scale-100 active:scale-[0.97]'
      )}
      style={{ animation: `slideIn 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms both` }}
      onClick={() => shop?.slug && navigate(`/boutique/${shop.slug}`)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-surface-100 overflow-hidden">
        {product?.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package size={28} className="text-dark-300" /></div>
        }
        {unavailable && (
          <div className="absolute inset-0 bg-dark-900/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold bg-dark-800/80 px-2 py-0.5 rounded-full">Indisponible</span>
          </div>
        )}
        {/* Bouton retirer */}
        <button
          onClick={handleUnfavorite}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <Heart size={13} className="text-red-400 fill-red-400" />
        </button>
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Infos */}
      <div className="p-2.5 flex-1 flex flex-col gap-0.5">
        <p className={clsx(
          'font-bold text-xs truncate',
          unavailable ? 'text-dark-400 line-through' : 'text-dark-800'
        )}>
          {product?.name}
        </p>
        <p className={clsx(
          'font-bold text-xs',
          unavailable ? 'text-dark-300' : 'text-primary-600'
        )}>
          {product?.price?.toLocaleString('fr-FR')} FCFA
        </p>
        {shop && (
          <div className="flex items-center gap-1 mt-0.5">
            <Store size={8} className="text-dark-300" />
            <span className="text-[9px] text-dark-400 truncate">{shop.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────
function EmptyState({ tab }) {
  const navigate = useNavigate()
  const isShops = tab === 'shops'

  return (
    <div
      className="flex flex-col items-center text-center py-16 px-6"
      style={{ animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mb-5 shadow-inner">
        <span className="text-5xl">{isShops ? '🏪' : '📦'}</span>
      </div>
      <p className="font-bold text-dark-700 text-lg mb-2">
        {isShops ? 'Aucune boutique suivie' : 'Aucun produit favori'}
      </p>
      <p className="text-sm text-dark-400 mb-6 leading-relaxed">
        {isShops
          ? 'Suivez des boutiques depuis la Marketplace pour les retrouver ici'
          : 'Ajoutez des produits en favoris depuis les boutiques'
        }
      </p>
      <button
        onClick={() => navigate('/marketplace')}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-2xl active:scale-95 transition-transform shadow-md shadow-primary-200"
      >
        <ShoppingBag size={15} />
        Explorer la Marketplace
      </button>
    </div>
  )
}

// ── Error State ────────────────────────────────────────────
function ErrorState({ onRetry }) {
  return (
    <div
      className="flex flex-col items-center text-center py-16 px-6"
      style={{ animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <p className="font-bold text-dark-700 text-base mb-1">Erreur de chargement</p>
      <p className="text-sm text-dark-400 mb-5">Impossible de récupérer tes favoris.</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 text-white text-sm font-bold rounded-2xl active:scale-95 transition-transform"
      >
        <RefreshCw size={14} />
        Réessayer
      </button>
    </div>
  )
}

// ── Tri dropdown ───────────────────────────────────────────
function SortDropdown({ tab, sort, setSort }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const options = tab === 'shops' ? SORT_SHOPS : SORT_PRODUCTS
  const current = options.find(o => o.key === sort) || options[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-surface-200 rounded-xl text-xs font-bold text-dark-600 active:scale-95 transition-transform shadow-sm"
      >
        <ArrowUpDown size={11} />
        {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-surface-100 rounded-2xl shadow-xl shadow-dark-900/10 overflow-hidden z-30 min-w-[130px]"
          style={{ animation: 'scaleIn 0.15s cubic-bezier(0.22,1,0.36,1) both' }}>
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => { setSort(o.key); setOpen(false) }}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-colors text-left',
                sort === o.key ? 'text-primary-600 bg-primary-50' : 'text-dark-600 hover:bg-surface-50'
              )}
            >
              {o.label}
              {sort === o.key && <CheckCircle2 size={12} className="text-primary-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pull to refresh ────────────────────────────────────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null)
  const [pulling, setPulling] = useState(false)
  const [pullDist, setPullDist] = useState(0)
  const threshold = 70

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return
    const dist = Math.max(0, Math.min(e.touches[0].clientY - startY.current, threshold * 1.3))
    if (dist > 5) setPullDist(dist)
  }, [threshold])

  const onTouchEnd = useCallback(async () => {
    if (pullDist >= threshold) {
      setPulling(true)
      await onRefresh()
      setPulling(false)
    }
    startY.current = null
    setPullDist(0)
  }, [pullDist, threshold, onRefresh])

  return { onTouchStart, onTouchMove, onTouchEnd, pullDist, pulling }
}

// ── Appliquer le tri ───────────────────────────────────────
function applySortShops(shops, sort) {
  const arr = [...shops]
  if (sort === 'name') return arr.sort((a, b) => (a.shop?.name || '').localeCompare(b.shop?.name || ''))
  return arr // 'recent' = déjà trié par created_at desc
}

function applySortProducts(products, sort) {
  const arr = [...products]
  if (sort === 'name') return arr.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''))
  if (sort === 'price_asc') return arr.sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0))
  if (sort === 'price_desc') return arr.sort((a, b) => (b.product?.price || 0) - (a.product?.price || 0))
  return arr
}

// ── PAGE PRINCIPALE ────────────────────────────────────────
export default function FavoritesPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('shops')
  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [errorShops, setErrorShops] = useState(false)
  const [errorProducts, setErrorProducts] = useState(false)
  const [sortShops, setSortShops] = useState('recent')
  const [sortProducts, setSortProducts] = useState('recent')

  useEffect(() => {
    if (user) { fetchShops(); fetchProducts() }
  }, [user])

  const fetchShops = async () => {
    setLoadingShops(true)
    setErrorShops(false)
    const { data, error } = await supabase
      .from('shop_followers')
      .select(`
        id,
        shop:shops!shop_followers_shop_id_fkey(
          id, name, slug, cover_url, city, has_delivery, likes_count, followers_count,
          owner:profiles!shops_owner_id_fkey(username, avatar_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { setErrorShops(true) } else { setShops(data || []) }
    setLoadingShops(false)
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    setErrorProducts(false)
    const { data, error } = await supabase
      .from('product_favorites')
      .select(`
        id,
        product:products!product_favorites_product_id_fkey(
          id, name, price, image_url, description, is_available,
          shop:shops!products_shop_id_fkey(id, name, slug, cover_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { setErrorProducts(true) } else { setProducts(data || []) }
    setLoadingProducts(false)
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchShops(), fetchProducts()])
    toast.success('Favoris mis à jour', { icon: '✨' })
  }, [])

  const { onTouchStart, onTouchMove, onTouchEnd, pullDist, pulling } = usePullToRefresh(handleRefresh)

  // ── Suppression avec Undo ──────────────────────────────
  const handleUnfollow = async (item) => {
    // Optimistic remove
    setShops(prev => prev.filter(s => s.id !== item.id))

    const undoId = toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-dark-700">Boutique retirée</span>
        <button
          className="text-primary-600 text-sm font-bold shrink-0"
          onClick={() => {
            setShops(prev => [item, ...prev])
            toast.dismiss(t.id)
          }}
        >
          Annuler
        </button>
      </div>
    ), { duration: 4000, icon: '🗑️' })

    // Commit after 4s (if not undone, the next time data loads it'll be in sync)
    setTimeout(async () => {
      toast.dismiss(undoId)
      const { error } = await supabase.from('shop_followers').delete().eq('id', item.id)
      if (error) {
        setShops(prev => [item, ...prev])
        toast.error('Erreur lors de la suppression')
      }
    }, 4000)
  }

  const handleUnfavorite = async (item) => {
    setProducts(prev => prev.filter(p => p.id !== item.id))

    const undoId = toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-dark-700">Produit retiré</span>
        <button
          className="text-primary-600 text-sm font-bold shrink-0"
          onClick={() => {
            setProducts(prev => [item, ...prev])
            toast.dismiss(t.id)
          }}
        >
          Annuler
        </button>
      </div>
    ), { duration: 4000, icon: '💔' })

    setTimeout(async () => {
      toast.dismiss(undoId)
      const { error } = await supabase.from('product_favorites').delete().eq('id', item.id)
      if (error) {
        setProducts(prev => [item, ...prev])
        toast.error('Erreur lors de la suppression')
      }
    }, 4000)
  }

  const loading = tab === 'shops' ? loadingShops : loadingProducts
  const hasError = tab === 'shops' ? errorShops : errorProducts
  const onRetry = tab === 'shops' ? fetchShops : fetchProducts

  const sortedShops = applySortShops(shops, sortShops)
  const sortedProducts = applySortProducts(products, sortProducts)

  const count = tab === 'shops' ? shops.length : products.length
  const currentSort = tab === 'shops' ? sortShops : sortProducts
  const setCurrentSort = tab === 'shops' ? setSortShops : setSortProducts

  return (
    <>
      {/* Injected keyframes */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes countPop {
          from { transform: scale(0.7); opacity: 0.4; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="min-h-screen bg-surface-50 pb-28"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDist > 10 || pulling) && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-primary-600 transition-all"
            style={{ height: Math.min(pullDist, 70), opacity: Math.min(pullDist / 70, 1) }}
          >
            <RefreshCw
              size={18}
              className="text-white"
              style={{
                transform: `rotate(${pullDist * 4}deg)`,
                animation: pulling ? 'spinSlow 0.8s linear infinite' : 'none'
              }}
            />
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-3 pb-0 px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Heart size={20} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-xl">Mes Favoris</h1>
              <p className="text-xs text-primary-200">
                <AnimatedCount value={count} />{' '}
                {tab === 'shops' ? 'boutique' : 'produit'}{count > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex border-b border-white/10">
            {TABS.map(t => {
              const Icon = t.icon
              const isActive = tab === t.key
              const c = t.key === 'shops' ? shops.length : products.length
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2',
                    isActive ? 'text-white border-white' : 'text-white/60 border-transparent'
                  )}
                >
                  <Icon size={15} />
                  {t.label}
                  {c > 0 && (
                    <span className={clsx(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                    )}>
                      <AnimatedCount value={c} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenu */}
        <div className="px-4 pt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {tab === 'shops'
                ? [1, 2, 3, 4].map(i => <SkeletonShopCard key={i} />)
                : [1, 2, 3, 4].map(i => <SkeletonProductCard key={i} />)
              }
            </div>
          ) : hasError ? (
            <ErrorState onRetry={onRetry} />
          ) : count === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <>
              {/* Barre de tri */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-dark-400 font-medium">
                  {count} {tab === 'shops' ? 'boutique' : 'produit'}{count > 1 ? 's' : ''}
                </p>
                <SortDropdown tab={tab} sort={currentSort} setSort={setCurrentSort} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tab === 'shops'
                  ? sortedShops.map((item, i) => (
                    <ShopFavoriteCard key={item.id} item={item} onUnfollow={handleUnfollow} index={i} />
                  ))
                  : sortedProducts.map((item, i) => (
                    <ProductFavoriteCard key={item.id} item={item} onUnfavorite={handleUnfavorite} index={i} />
                  ))
                }
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
