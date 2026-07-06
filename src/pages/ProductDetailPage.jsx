// deploy: alibaba-pro-v2
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ShoppingBag, Store, Star, ShieldCheck,
  ChevronRight, Truck, Info, Phone, Plus, Minus, Send,
  Share2, Heart, Award, ArrowRight, ShieldAlert, BadgeCheck, CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useCartStore } from '@/store'
import { Avatar, BottomSheet, Button } from '@/components/ui'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items: cartItems, addItem } = useCartStore()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  // Favoris & Partage
  const [isFav, setIsFav] = useState(false)
  const [favProcessing, setFavProcessing] = useState(false)

  // Galerie d'images
  const [activeSlide, setActiveSlide] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  // Produits similaires
  const [similarProducts, setSimilarProducts] = useState([])
  const [similarLoading, setSimilarLoading] = useState(false)

  // Modal devis grossiste
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteQty, setQuoteQty] = useState(100)
  const [quoteDesc, setQuoteDesc] = useState('')
  const [quoteSending, setQuoteSending] = useState(false)

  // Charger le produit principal et ses dépendances
  useEffect(() => {
    if (id) {
      loadProduct()
      loadReviews()
    }
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, shop:shops(*, owner:profiles(*))')
        .eq('id', id)
        .single()
      
      if (error) throw error
      setProduct(data)
      
      // Sélectionner la première variante par défaut si disponible
      if (data?.variants?.length > 0) {
        setSelectedVariant(data.variants[0])
      }

      // Charger les favoris pour ce produit
      if (user) {
        const { data: fav } = await supabase
          .from('product_favorites')
          .select('id')
          .eq('product_id', data.id)
          .eq('user_id', user.id)
          .single()
        setIsFav(!!fav)
      }

      // Charger les produits similaires de la même boutique
      loadSimilarProducts(data.shop_id, data.id)

    } catch (err) {
      toast.error('Produit introuvable')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const loadSimilarProducts = async (shopId, currentProductId) => {
    setSimilarLoading(true)
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .neq('id', currentProductId)
        .eq('is_available', true)
        .limit(5)
      setSimilarProducts(data || [])
    } catch {}
    setSimilarLoading(false)
  }

  const loadReviews = async () => {
    setReviewsLoading(true)
    try {
      const { data } = await supabase
        .from('product_reviews')
        .select('*, user:profiles(id, username, avatar_url)')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
      
      setReviews(data || [])
      if (data?.length > 0) {
        const sum = data.reduce((s, r) => s + r.rating, 0)
        setAvgRating((sum / data.length).toFixed(1))
      } else {
        setAvgRating(0)
      }
    } catch {}
    setReviewsLoading(false)
  }

  // Gérer le clic Favoris
  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter d\'abord')
      navigate('/connexion')
      return
    }
    setFavProcessing(true)
    try {
      if (isFav) {
        await supabase
          .from('product_favorites')
          .delete()
          .eq('product_id', product.id)
          .eq('user_id', user.id)
        setIsFav(false)
        toast.success('Retiré des favoris')
      } else {
        await supabase
          .from('product_favorites')
          .insert({ product_id: product.id, user_id: user.id })
        setIsFav(true)
        toast.success('Ajouté aux favoris ! ❤️')
      }
    } catch {
      toast.error('Erreur technique')
    } finally {
      setFavProcessing(false)
    }
  }

  // Partager le produit
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Lien du produit copié dans le presse-papiers ! 🔗')
  }

  // Calcul du prix unitaire en fonction de la variante et des paliers de gros
  const getUnitPrice = () => {
    if (!product) return 0
    let price = selectedVariant ? selectedVariant.price : product.price

    // Paliers de gros
    if (product.wholesale_tiers?.length > 0) {
      const applicableTier = product.wholesale_tiers
        .filter(t => quantity >= parseInt(t.min_qty))
        .reduce((max, t) => (parseInt(t.min_qty) > parseInt(max.min_qty) ? t : max), { min_qty: 0, price })
      
      if (applicableTier.min_qty > 0) {
        price = applicableTier.price
      }
    }
    return price
  }

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour acheter')
      navigate('/connexion')
      return
    }
    addItem(product, quantity, selectedVariant)
    toast.success('Produit ajouté au panier ! 🛒')
  }

  const handleBuyNow = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour acheter')
      navigate('/connexion')
      return
    }
    addItem(product, quantity, selectedVariant)
    navigate('/panier')
  }

  const handleSendQuote = async () => {
    if (quoteQty <= 0) return toast.error('Veuillez spécifier une quantité valide')
    setQuoteSending(true)
    try {
      const { data, error } = await supabase.rpc('create_wholesale_quote', {
        p_buyer_id: user.id,
        p_product_id: product.id,
        p_quantity: quoteQty,
        p_description: quoteDesc.trim()
      })

      if (error) throw error
      if (data?.success) {
        toast.success('Demande de devis envoyée ! Notre équipe et le vendeur vont l\'étudier. 🏷️')
        setQuoteOpen(false)
        setQuoteDesc('')
      } else {
        throw new Error(data?.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      toast.error(err.message || 'Erreur d\'envoi')
    } finally {
      setQuoteSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  const unitPrice = getUnitPrice()
  const totalPrice = unitPrice * quantity
  const priceBarre = Math.round(unitPrice * 1.25)
  const isOutofStock = product.stock_quantity !== null && product.stock_quantity <= 0

  // Galerie d'images Alibaba-Style (3 slides)
  const slides = [
    product.image_url || null,
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800', // Photo champ pour la traçabilité
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800', // Inspection qualité MANG
  ].filter(Boolean)

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-surface-100 pb-36 text-dark-900 font-sans">
      
      {/* HEADER STICKY ALIBABA */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-surface-200 px-4 py-3 z-20 flex items-center justify-between max-w-[var(--content-max-width)] mx-auto">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-dark-800"/>
        </button>
        <h2 className="font-display font-black text-dark-800 text-sm max-w-[180px] truncate">{product.name}</h2>
        
        {/* Raccourci panier avec badge */}
        <button onClick={() => navigate('/panier')} className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center relative active:scale-95 transition-transform">
          <ShoppingBag size={20} className="text-dark-800"/>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 border-2 border-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: HERO GALERIE (Carrousel Swipe & Zoom) */}
      <div className="relative w-full aspect-square bg-white max-w-[var(--content-max-width)] mx-auto overflow-hidden border-b border-surface-200">
        <div className="w-full h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
          {slides.map((src, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 relative cursor-zoom-in" onClick={() => setZoomOpen(true)}>
              <img src={src} className="w-full h-full object-cover" alt={`Slide ${idx + 1}`}/>
            </div>
          ))}
        </div>

        {/* Swipe dots indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/35 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => setActiveSlide(idx)}
              className={clsx('w-2 h-2 rounded-full transition-all', activeSlide === idx ? 'bg-white scale-125' : 'bg-white/40')}/>
          ))}
        </div>

        {/* Counter floating */}
        <div className="absolute bottom-4 right-4 bg-dark-900/60 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-xl">
          {activeSlide + 1} / {slides.length}
        </div>

        {/* Float action buttons (Favoris & Share) */}
        <div className="absolute top-4 right-4 flex flex-col gap-2.5">
          <button onClick={handleToggleFavorite} disabled={favProcessing}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-surface-200 flex items-center justify-center active:scale-90 transition-transform">
            <Heart size={18} className={clsx(isFav ? 'text-red-500 fill-red-500 animate-heart-pop' : 'text-dark-600')}/>
          </button>
          <button onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-surface-200 flex items-center justify-center active:scale-90 transition-transform">
            <Share2 size={18} className="text-dark-600"/>
          </button>
        </div>

        {/* Badges marketing */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
            <CheckCircle size={10}/> En stock
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Truck size={10}/> Expédition 24h
          </span>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="px-4 mt-4 space-y-4 max-w-[var(--content-max-width)] mx-auto">
        
        {/* SECTION 2: INFOS CLÉS */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-3.5">
          <div className="space-y-1">
            <h1 className="font-display font-black text-dark-900 text-xl leading-tight">{product.name}</h1>
            
            {/* Étoiles & Sold Count */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-gold-500">
                <Star size={13} className="fill-gold-500"/>
                <span className="text-xs font-black text-dark-700">{avgRating > 0 ? avgRating : '4.8'}</span>
              </div>
              <span className="text-dark-300 text-[10px]">•</span>
              <span className="text-dark-600 text-xs font-semibold">{reviews.length} avis vérifiés</span>
              <span className="text-dark-300 text-[10px]">•</span>
              <span className="px-2 py-0.5 rounded bg-surface-50 border border-surface-150 text-[10px] text-primary-700 font-black">Vendu: 142</span>
            </div>
          </div>

          {/* Section Prix & Promo */}
          <div className="flex items-baseline gap-2.5 pt-2 border-t border-surface-100">
            <span className="font-display font-black text-primary-700 text-3xl">{unitPrice.toLocaleString('fr-FR')} F</span>
            <span className="text-dark-400 line-through text-sm font-semibold">{priceBarre.toLocaleString('fr-FR')} F</span>
            <span className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-lg">-20% PROMO</span>
          </div>

          {/* Garanties MANG */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-100 text-center">
            {[
              { icon: ShieldCheck, title: 'Garantie', desc: 'Remboursement' },
              { icon: Award,       title: 'Retours',   desc: 'Sous 7 jours' },
              { icon: Truck,       title: 'Livraison', desc: 'Sécurisée' }
            ].map((g, i) => (
              <div key={i} className="p-2 rounded-2xl bg-surface-50">
                <g.icon size={15} className="text-primary-600 mx-auto mb-1"/>
                <p className="font-bold text-[10px] text-dark-800 leading-tight">{g.title}</p>
                <p className="text-dark-600/50 text-[8px] mt-0.5">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FICHE VENDEUR */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
          <p className="text-xs font-black text-dark-600/40 uppercase tracking-wider pl-0.5">Informations du vendeur</p>
          <div className="flex items-center gap-3">
            <Avatar src={null} name={product.shop?.name} size="md"/>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-bold text-dark-800 text-sm truncate">{product.shop?.name}</p>
                {product.shop?.is_verified && (
                  <BadgeCheck size={14} className="text-emerald-500 fill-emerald-50/50"/>
                )}
              </div>
              <p className="text-dark-600/50 text-xs">Propriétaire : @{product.shop?.owner?.username}</p>
            </div>
            <button onClick={() => navigate(`/boutique/${product.shop?.slug}`)}
              className="px-3.5 py-2 rounded-xl bg-surface-50 border border-surface-200 text-dark-700 text-xs font-bold active:scale-95 transition-transform flex items-center gap-1">
              Visiter <ArrowRight size={12}/>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold pt-2.5 border-t border-surface-50">
            <div className="p-2 bg-surface-50 rounded-xl">
              <p className="text-dark-600/40 text-[9px] uppercase tracking-wider font-bold">Réponse</p>
              <p className="text-emerald-700 font-bold mt-0.5">Répond en moins de 2h</p>
            </div>
            <div className="p-2 bg-surface-50 rounded-xl">
              <p className="text-dark-600/40 text-[9px] uppercase tracking-wider font-bold">Note Vendeur</p>
              <p className="text-gold-600 font-bold mt-0.5">⭐ {product.shop?.rating_avg > 0 ? product.shop.rating_avg.toFixed(1) : '4.9'} / 5.0</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: ACTIONS ACHAT (Quantité & Variantes) */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
          
          {/* Variantes */}
          {product.variants?.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-black text-dark-600/40 uppercase tracking-wider pl-0.5">Sélectionner l'option</p>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v, i) => (
                  <button key={i} onClick={() => { setSelectedVariant(v); setQuantity(1) }}
                    className={clsx('p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
                      selectedVariant?.name === v.name
                        ? 'border-primary-600 bg-primary-50/50 text-primary-800'
                        : 'border-surface-200 bg-white text-dark-700 hover:border-surface-300'
                    )}>
                    <p className="font-bold text-xs leading-tight">{v.name}</p>
                    <p className="font-black text-sm mt-1 text-primary-600">{v.price?.toLocaleString('fr-FR')} F</p>
                    {v.stock !== undefined && (
                      <p className="text-[9px] text-dark-400 mt-0.5">Stock : {v.stock}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paliers dégressifs de gros */}
          {product.wholesale_tiers?.length > 0 && (
            <div className="p-4 bg-gold-500/10 border border-gold-300/30 rounded-2xl space-y-2 text-xs">
              <p className="font-black text-gold-700 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                🏷️ Prix de gros dégressif applicable
              </p>
              <div className="space-y-1">
                {product.wholesale_tiers.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-gold-800">
                    <span>Achetez {t.min_qty}+ unités :</span>
                    <span className="font-bold">{t.price?.toLocaleString('fr-FR')} FCFA / u</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ajusteur quantité */}
          {!isOutofStock && (
            <div className="flex items-center justify-between pt-2">
              <p className="font-bold text-dark-800 text-sm">Quantité</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-surface-100 hover:bg-surface-200 active:scale-90 flex items-center justify-center transition-all">
                  <Minus size={14} className="text-dark-700"/>
                </button>
                <span className="font-display font-black text-dark-800 text-base w-8 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 rounded-xl bg-surface-100 hover:bg-surface-200 active:scale-90 flex items-center justify-center transition-all">
                  <Plus size={14} className="text-dark-700"/>
                </button>
              </div>
            </div>
          )}

          {/* Bouton Tertiaire - Devis B2B */}
          <button onClick={() => setQuoteOpen(true)}
            className="w-full mt-2 py-3 rounded-2xl border-2 border-primary-600/20 hover:border-primary-600 text-primary-700 hover:bg-primary-50/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]">
            🏷️ Demander un devis de gros (B2B)
          </button>
        </div>

        {/* SECTION 4: SPÉCIFICATIONS TECHNIQUES */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
          <p className="text-xs font-black text-dark-600/40 uppercase tracking-wider pl-0.5">Fiche Technique & Spécifications</p>
          
          <div className="border border-surface-150 rounded-2xl overflow-hidden divide-y divide-surface-100 text-xs">
            {[
              { label: 'Origine', value: 'Bénin (Afrique de l\'Ouest)' },
              { label: 'Type de produit', value: 'Agriculture locale récoltée' },
              { label: 'Culture', value: 'Biologique / Sans pesticides chimiques' },
              { label: 'Conditionnement', value: product.variants?.map(v => v.name).join(', ') || 'Sacs ou vrac' },
              { label: 'Stock total disponible', value: product.stock_quantity !== null ? `${product.stock_quantity} unités` : 'Illimité' }
            ].map((spec, i) => (
              <div key={i} className="flex p-3">
                <span className="w-1/2 font-bold text-dark-600/70">{spec.label}</span>
                <span className="w-1/2 font-semibold text-dark-800">{spec.value}</span>
              </div>
            ))}
          </div>

          {/* Contenu du colis */}
          <div className="p-3 bg-surface-50 rounded-2xl border border-surface-100 text-xs">
            <p className="font-bold text-dark-700 mb-1">Contenu du colis :</p>
            <p className="text-dark-600 leading-normal">
              1x {product.name} (Lot de {quantity} unités, emballé sous sac étanche pour garantir la fraîcheur et la conservation).
            </p>
          </div>
        </div>

        {/* DESCRIPTION PRODUIT */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-2">
          <p className="text-xs font-black text-dark-600/40 uppercase tracking-wider pl-0.5">Description complète</p>
          <p className="text-dark-700 text-xs leading-relaxed">{product.description || 'Aucune description rédigée.'}</p>
        </div>

        {/* SECTION 5: PRODUITS SIMILAIRES (Vous pourriez aimer) */}
        {similarProducts.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-black text-dark-600/40 uppercase tracking-wider pl-0.5">Vous pourriez aussi aimer</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {similarProducts.map(sim => (
                <div key={sim.id} onClick={() => { navigate(`/produit/${sim.id}`); window.location.reload() }}
                  className="w-36 bg-white rounded-2xl overflow-hidden shadow-card border border-surface-150 p-2.5 active:scale-[0.97] transition-all cursor-pointer flex-shrink-0 space-y-2">
                  <div className="w-full aspect-square bg-surface-50 rounded-xl overflow-hidden">
                    {sim.image_url ? (
                      <img src={sim.image_url} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🌾</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-dark-800 text-[11px] truncate">{sim.name}</p>
                    <p className="font-display font-black text-primary-700 text-xs mt-1">{sim.price?.toLocaleString('fr-FR')} F</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AVIS CLIENTS */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex justify-between items-center border-b border-surface-100 pb-3">
            <p className="font-bold text-dark-800 text-xs">Avis clients ({reviews.length})</p>
            {avgRating > 0 && (
              <div className="flex items-center gap-1 text-gold-500">
                <Star size={13} className="fill-gold-500"/>
                <span className="font-black text-xs text-dark-800">{avgRating}/5</span>
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <div className="space-y-2">
              <div className="h-12 skeleton rounded-xl"/>
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center py-4 text-dark-600/40 text-xs">Aucun avis vérifié sur ce produit pour l'instant.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div key={rev.id} className="space-y-2 border-b border-surface-50 last:border-0 pb-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar src={rev.user?.avatar_url} name={rev.user?.username} size="sm"/>
                      <div>
                        <p className="font-bold text-xs text-dark-800">@{rev.user?.username}</p>
                        <p className="text-dark-600/35 text-[9px]">{new Date(rev.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="flex text-gold-400">
                      {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                    </div>
                  </div>
                  <p className="text-dark-700 text-xs leading-normal pl-8">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BARRE ACTIONS STICKY BAS ALIBABA (VERT & ORANGE) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-200 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl safe-pb max-w-[var(--content-max-width)] mx-auto">
        <div className="flex flex-col">
          <p className="text-dark-600/50 text-[9px] font-bold uppercase tracking-wider">Total à payer</p>
          <p className="font-display font-black text-primary-700 text-lg leading-none mt-1">{totalPrice.toLocaleString('fr-FR')} F</p>
        </div>

        {isOutofStock ? (
          <button disabled className="flex-1 py-3.5 rounded-2xl bg-surface-200 text-dark-600/40 font-bold text-xs cursor-not-allowed">
            Rupture de stock
          </button>
        ) : (
          <div className="flex gap-2 flex-1">
            {/* VERT - Ajouter au panier */}
            <button onClick={handleAddToCart}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-md">
              <ShoppingBag size={14}/> Ajouter au panier
            </button>
            {/* ORANGE - Acheter maintenant */}
            <button onClick={handleBuyNow}
              className="flex-1 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs shadow-md active:scale-95 transition-transform">
              Acheter maintenant
            </button>
          </div>
        )}
      </div>

      {/* MODAL IMAGE ZOOM */}
      {zoomOpen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomOpen(false)}>
          <img src={slides[activeSlide]} className="max-w-full max-h-[85vh] object-contain rounded-2xl" alt="Zoom"/>
          <button className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setZoomOpen(false)}>✕</button>
        </div>
      )}

      {/* SHEET DEMANDE DE DEVIS */}
      <BottomSheet open={quoteOpen} onClose={() => setQuoteOpen(false)} title="🏷️ Demande de devis grossiste">
        <div className="px-4 pt-2 pb-8 space-y-4">
          <div className="p-3.5 bg-gold-500/10 border border-gold-300/30 rounded-2xl text-gold-700 text-xs">
            ⚠️ <strong>Demande B2B.</strong> Envoyez vos besoins spécifiques au vendeur pour négocier un tarif préférentiel.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Quantité demandée</label>
            <input type="number" value={quoteQty} onChange={e => setQuoteQty(parseInt(e.target.value) || 0)} className="w-full bg-surface-100 border border-surface-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none"/>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Exigences spécifiques (conditionnement, livraison...)</label>
            <textarea value={quoteDesc} onChange={e => setQuoteDesc(e.target.value)} placeholder="Ex: Livraison par camion frigorifique de 10 tonnes..." rows={3} className="w-full bg-surface-100 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none resize-none"/>
          </div>

          <Button onClick={handleSendQuote} disabled={quoteSending} className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5">
            {quoteSending ? 'Envoi...' : <><Send size={14}/> Envoyer la demande</>}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
