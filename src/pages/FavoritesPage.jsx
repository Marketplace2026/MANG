import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Heart, Store, Package, Loader2, Trash2, MapPin, Truck, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

// ── Onglets ────────────────────────────────────────────────
const TABS = [
  { key: 'shops',    label: 'Boutiques',  icon: Store   },
  { key: 'products', label: 'Produits',   icon: Package },
]

// ── Carte boutique favorite ────────────────────────────────
function ShopFavoriteCard({ item, onUnfollow }) {
  const navigate = useNavigate()
  const shop = item.shop

  return (
    <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden active:scale-[0.98] transition-transform">
      {/* Image */}
      <div className="relative h-28 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden cursor-pointer"
        onClick={() => navigate(`/boutique/${shop?.slug}`)}>
        {shop?.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl">🌿</div>
        }
        {shop?.has_delivery && (
          <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Truck size={10} className="text-primary-600"/>
            <span className="text-[10px] font-bold text-primary-700">Livraison</span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/boutique/${shop?.slug}`)}>
          <p className="font-bold text-dark-800 text-sm truncate">{shop?.name}</p>
          <p className="text-xs text-dark-400 truncate">@{shop?.owner?.username}</p>
          {shop?.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={9} className="text-dark-300"/>
              <span className="text-[10px] text-dark-400">{shop.city}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/boutique/${shop?.slug}`)}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform">
            Voir
          </button>
          <button
            onClick={() => onUnfollow(item)}
            className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center active:scale-95 transition-transform">
            <Trash2 size={14} className="text-red-400"/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Carte produit favori ───────────────────────────────────
function ProductFavoriteCard({ item, onUnfavorite }) {
  const navigate = useNavigate()
  const product = item.product
  const shop = product?.shop

  return (
    <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden active:scale-[0.98] transition-transform">
      <div className="flex gap-3 p-3">
        {/* Image produit */}
        <div
          className="w-20 h-20 rounded-xl bg-surface-100 overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => shop?.slug && navigate(`/boutique/${shop.slug}`)}>
          {product?.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-dark-300"/></div>
          }
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm truncate">{product?.name}</p>
          <p className="text-primary-600 font-bold text-sm">{product?.price?.toLocaleString('fr-FR')} FCFA</p>
          {shop && (
            <div
              className="flex items-center gap-1 mt-1 cursor-pointer"
              onClick={() => navigate(`/boutique/${shop.slug}`)}>
              <Store size={10} className="text-dark-400"/>
              <span className="text-xs text-dark-400 hover:text-primary-600 transition-colors">{shop.name}</span>
              <ChevronRight size={10} className="text-dark-300"/>
            </div>
          )}
          {product?.description && (
            <p className="text-xs text-dark-400 mt-0.5 line-clamp-1">{product.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={() => onUnfavorite(item)}
            className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center active:scale-95 transition-transform">
            <Heart size={14} className="text-red-400 fill-red-400"/>
          </button>
          {shop?.slug && (
            <button
              onClick={() => navigate(`/boutique/${shop.slug}`)}
              className="px-2 py-1 bg-primary-600 text-white text-[10px] font-bold rounded-lg active:scale-95 transition-transform">
              Voir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PAGE PRINCIPALE ────────────────────────────────────────
export default function FavoritesPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('shops')
  const [shops, setShops] = useState([])
  const [products, setProducts] = useState([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    if (user) { fetchShops(); fetchProducts() }
  }, [user])

  const fetchShops = async () => {
    setLoadingShops(true)
    const { data } = await supabase
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
    setShops(data || [])
    setLoadingShops(false)
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    const { data } = await supabase
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
    setProducts(data || [])
    setLoadingProducts(false)
  }

  const handleUnfollow = async (item) => {
    const { error } = await supabase
      .from('shop_followers')
      .delete()
      .eq('id', item.id)
    if (!error) {
      setShops(prev => prev.filter(s => s.id !== item.id))
      toast.success('Boutique retirée des favoris')
    }
  }

  const handleUnfavorite = async (item) => {
    const { error } = await supabase
      .from('product_favorites')
      .delete()
      .eq('id', item.id)
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== item.id))
      toast.success('Produit retiré des favoris')
    }
  }

  const loading = tab === 'shops' ? loadingShops : loadingProducts
  const count = tab === 'shops' ? shops.length : products.length

  return (
    <div className="min-h-screen bg-surface-50 pb-28">

      {/* Header */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-3 pb-0 px-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Heart size={20} className="text-white fill-white"/>
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-xl">Mes Favoris</h1>
            <p className="text-xs text-primary-200">{count} {tab === 'shops' ? 'boutique' : 'produit'}{count > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-white/10">
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = tab === t.key
            const c = t.key === 'shops' ? shops.length : products.length
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors border-b-2',
                  isActive ? 'text-white border-white' : 'text-white/60 border-transparent'
                )}>
                <Icon size={15}/>
                {t.label}
                {c > 0 && (
                  <span className={clsx(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                  )}>{c}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-500"/>
          </div>
        ) : count === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">
              {tab === 'shops' ? '🏪' : '📦'}
            </div>
            <p className="font-bold text-dark-600 text-lg">
              {tab === 'shops' ? 'Aucune boutique suivie' : 'Aucun produit favori'}
            </p>
            <p className="text-sm text-dark-400 mt-2">
              {tab === 'shops'
                ? 'Suivez des boutiques depuis la Marketplace pour les retrouver ici'
                : 'Ajoutez des produits en favoris depuis les boutiques'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tab === 'shops'
              ? shops.map(item => (
                  <ShopFavoriteCard key={item.id} item={item} onUnfollow={handleUnfollow}/>
                ))
              : products.map(item => (
                  <ProductFavoriteCard key={item.id} item={item} onUnfavorite={handleUnfavorite}/>
                ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
