import { clsx } from 'clsx'
import { MapPin, Truck, Heart, Users, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, PremiumBadge } from '@/components/ui'

// ============================================================
// SHOP CARD — Carte boutique principale
// ============================================================
export function ShopCard({ shop, onLike, isLiked = false, style }) {
  const navigate = useNavigate()
  const isOnline = shop.owner?.last_seen_at
    ? (new Date() - new Date(shop.owner.last_seen_at)) < 120000
    : false

  const premiumBorder = {
    3: 'ring-2 ring-gold-400/60',
    2: 'ring-2 ring-slate-400/40',
    1: 'ring-2 ring-amber-700/40',
    0: '',
  }[shop.premium_level || 0]

  return (
    <div
      className={clsx(
        'bg-white rounded-3xl shadow-card overflow-hidden active:scale-[0.98] transition-transform duration-150 cursor-pointer',
        premiumBorder
      )}
      style={style}
      onClick={() => navigate(`/boutique/${shop.slug}`)}
    >
      {/* Cover */}
      <div className="relative h-36 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
        {shop.cover_url ? (
          <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-30">
              {shop.category?.icon || '🌿'}
            </span>
          </div>
        )}

        {/* Badge premium en haut à droite */}
        {shop.premium_level > 0 && (
          <div className="absolute top-2.5 right-2.5">
            <PremiumBadge level={shop.premium_level}/>
          </div>
        )}

        {/* Livraison */}
        {shop.has_delivery && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-xl bg-primary-600/90 backdrop-blur-sm">
            <Truck size={10} className="text-white"/>
            <span className="text-white text-[10px] font-bold">Livraison</span>
          </div>
        )}

        {/* Bouton like */}
        <button
          onClick={e => { e.stopPropagation(); onLike?.() }}
          className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart
            size={15}
            className={clsx('transition-colors', isLiked ? 'text-red-500 fill-red-500' : 'text-dark-600/50')}
          />
        </button>
      </div>

      {/* Infos */}
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="relative flex-shrink-0 -mt-7">
            <Avatar
              src={shop.owner?.avatar_url}
              name={shop.name}
              size="md"
              className="ring-2 ring-white shadow-sm"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-display font-bold text-dark-800 text-sm leading-tight truncate">
              {shop.name}
            </h3>
            <p className="text-dark-600/50 text-xs mt-0.5">
              @{shop.owner?.username}
            </p>
          </div>
        </div>

        {shop.description && (
          <p className="text-dark-600/60 text-xs mt-2 line-clamp-2 leading-relaxed">
            {shop.description}
          </p>
        )}

        {/* Footer stats */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-surface-100">
          {shop.city && (
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-dark-600/40"/>
              <span className="text-dark-600/50 text-[10px] font-medium truncate max-w-[80px]">{shop.city}</span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Users size={10} className="text-primary-500"/>
            <span className="text-dark-600/60 text-[10px] font-semibold">{shop.followers_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={10} className="text-red-400"/>
            <span className="text-dark-600/60 text-[10px] font-semibold">{shop.likes_count}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TOP SHOP CARD — Carte horizontale pour le top 5
// ============================================================
export function TopShopCard({ shop, rank }) {
  const navigate = useNavigate()

  const rankColors = {
    1: 'from-gold-500 to-gold-600',
    2: 'from-slate-400 to-slate-500',
    3: 'from-amber-700 to-amber-800',
  }

  return (
    <div
      className="flex-shrink-0 w-48 bg-white rounded-2xl shadow-card overflow-hidden cursor-pointer active:scale-95 transition-transform"
      onClick={() => navigate(`/boutique/${shop.slug}`)}
    >
      <div className="relative h-24 bg-gradient-to-br from-primary-100 to-primary-200">
        {shop.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">{shop.category?.icon || '🌿'}</div>
        }
        {/* Rang */}
        <div className={clsx(
          'absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center',
          'bg-gradient-to-br shadow-sm text-white text-xs font-black',
          rankColors[rank] || 'from-primary-500 to-primary-600'
        )}>
          {rank}
        </div>
        <PremiumBadge level={shop.premium_level}/>
      </div>
      <div className="p-2.5">
        <p className="font-bold text-dark-800 text-xs truncate">{shop.name}</p>
        <div className="flex items-center gap-1 mt-1">
          <Users size={9} className="text-primary-500"/>
          <span className="text-[10px] text-dark-600/50 font-medium">{shop.followers_count} abonnés</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PRODUCT CARD
// ============================================================
export function ProductCard({ product, shopName, onOrder, onFavorite, isFavorite = false }) {
  const AVAILABILITY_LABELS = {
    now: { label: 'Disponible', color: 'text-emerald-600 bg-emerald-50' },
    '1w': { label: 'Dans 1 semaine', color: 'text-blue-600 bg-blue-50' },
    '2w': { label: 'Dans 2 semaines', color: 'text-blue-600 bg-blue-50' },
    '1m': { label: 'Dans 1 mois', color: 'text-orange-600 bg-orange-50' },
    '2m': { label: 'Dans 2 mois', color: 'text-orange-600 bg-orange-50' },
    '3m': { label: 'Dans 3 mois', color: 'text-red-600 bg-red-50' },
    '6m': { label: 'Dans 6 mois', color: 'text-red-600 bg-red-50' },
    '1y': { label: 'Dans 1 an', color: 'text-red-600 bg-red-50' },
  }
  const avail = AVAILABILITY_LABELS[product.availability] || AVAILABILITY_LABELS.now

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-surface-100 to-surface-200">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🌿</div>
        }
        {/* Favori */}
        <button
          onClick={e => { e.stopPropagation(); onFavorite?.() }}
          className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart size={14} className={clsx(isFavorite ? 'text-red-500 fill-red-500' : 'text-dark-600/50')}/>
        </button>
        {/* Disponibilité */}
        <div className={clsx('absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold', avail.color)}>
          {avail.label}
        </div>
      </div>

      <div className="p-3">
        <h4 className="font-bold text-dark-800 text-sm truncate">{product.name}</h4>
        {product.description && (
          <p className="text-dark-600/50 text-xs mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2.5">
          <div>
            <span className="font-display font-bold text-primary-700 text-base">
              {product.price.toLocaleString('fr-FR')}
            </span>
            <span className="text-dark-600/40 text-xs ml-1">FCFA</span>
          </div>
          <button
            onClick={onOrder}
            className="px-3.5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold active:scale-95 transition-transform shadow-green"
          >
            Commander
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SHOP CARD SKELETON
// ============================================================
export function ShopCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <div className="h-36 skeleton"/>
      <div className="p-3.5 space-y-2">
        <div className="flex gap-2.5 -mt-5">
          <div className="w-11 h-11 rounded-2xl skeleton flex-shrink-0"/>
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="h-3.5 skeleton rounded-lg w-3/4"/>
            <div className="h-3 skeleton rounded-lg w-1/2"/>
          </div>
        </div>
        <div className="h-3 skeleton rounded-lg"/>
        <div className="h-3 skeleton rounded-lg w-2/3"/>
      </div>
    </div>
  )
}
