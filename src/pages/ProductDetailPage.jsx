import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ShoppingBag, Store, Star, MessageCircle, ShieldCheck,
  ChevronRight, Truck, Info, Phone, Plus, Minus, Send, Image as ImageIcon, Camera
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { useCartStore } from '@/store'
import { Avatar, BottomSheet, Button } from '@/components/ui'
import toast from 'react-hot-toast'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { addItem } = useCartStore()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  // Modal devis grossiste
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteQty, setQuoteQty] = useState(100)
  const [quoteDesc, setQuoteDesc] = useState('')
  const [quoteSending, setQuoteSending] = useState(false)

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
    } catch (err) {
      toast.error('Produit introuvable')
      navigate(-1)
    } finally {
      setLoading(false)
    }
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
        toast.success('Demande de devis envoyée avec succès ! 🏷️')
        setQuoteOpen(false)
        setQuoteDesc('')
      } else {
        throw new Error(data?.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      toast.error(err.message || 'Erreur d\'envoi du devis')
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
  const isOutofStock = product.stock_quantity !== null && product.stock_quantity <= 0

  return (
    <div className="min-h-screen bg-surface-50 pb-28">
      {/* HEADER STICKY */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-surface-100 px-4 py-3 z-20 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={20} className="text-dark-800"/>
        </button>
        <h2 className="font-display font-black text-dark-800 text-base max-w-[200px] truncate">{product.name}</h2>
        <button onClick={() => navigate('/panier')} className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center relative active:scale-95 transition-transform">
          <ShoppingBag size={20} className="text-dark-800"/>
          {/* Badge panier à connecter */}
        </button>
      </div>

      {/* GALERIE D'IMAGES */}
      <div className="relative aspect-video w-full bg-surface-100 overflow-hidden max-w-[var(--content-max-width)] mx-auto border-b border-surface-200">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-primary-50 text-primary-300">🌾</div>
        )}
        <div className="absolute bottom-3 left-3 bg-dark-900/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
          1 / 1
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4 max-w-[var(--content-max-width)] mx-auto">
        {/* TITRE & PRIX */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="font-display font-black text-dark-900 text-xl leading-tight">{product.name}</h1>
              {avgRating > 0 ? (
                <div className="flex items-center gap-1 mt-1 text-gold-500">
                  <Star size={13} className="fill-gold-500"/>
                  <span className="text-xs font-black text-dark-700">{avgRating}</span>
                  <span className="text-dark-600/35 text-[10px]">({reviews.length} avis)</span>
                </div>
              ) : (
                <p className="text-dark-600/40 text-xs mt-1">Aucun avis pour l'instant</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-display font-black text-primary-700 text-2xl">{unitPrice.toLocaleString('fr-FR')} F</p>
              <p className="text-dark-600/40 text-[9px] uppercase tracking-wider font-semibold">FCFA / unité</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-100">
            {product.availability === 'now' ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                ✓ Disponible immédiatement
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-bold">
                ⏳ Dispo sous {product.availability}
              </span>
            )}
            {product.stock_quantity !== null && (
              <span className={clsx('px-2.5 py-1 rounded-lg text-[10px] font-bold',
                product.stock_quantity > 10 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
              )}>
                📦 Stock : {product.stock_quantity} unités
              </span>
            )}
          </div>
        </div>

        {/* SÉLECTEUR DE VARIANTES */}
        {product.variants?.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <p className="text-xs font-bold text-dark-600/50 uppercase tracking-wider mb-3">Variantes disponibles</p>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedVariant(v)}
                  className={clsx(
                    'p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
                    selectedVariant?.name === v.name
                      ? 'border-primary-600 bg-primary-50/50 text-primary-800'
                      : 'border-surface-200 bg-white text-dark-700 hover:border-surface-300'
                  )}
                >
                  <p className="font-bold text-sm leading-tight">{v.name}</p>
                  <p className="font-black text-xs mt-1 text-primary-600">{v.price?.toLocaleString('fr-FR')} F</p>
                  {v.stock !== undefined && (
                    <p className="text-[10px] text-dark-400 mt-0.5">Stock : {v.stock}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PRIX DE GROS DEGRESSIFS (ALIBABA STYLE) */}
        {product.wholesale_tiers?.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-card border border-gold-300/30 bg-gradient-to-br from-white to-gold-50/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏷️</span>
              <p className="text-xs font-black text-gold-700 uppercase tracking-wider">Tarifs grossistes (Dégressifs)</p>
            </div>
            <div className="space-y-2">
              {product.wholesale_tiers.map((t, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-surface-100 last:border-0">
                  <p className="text-dark-700 text-sm font-semibold">À partir de <span className="font-bold text-primary-600">{t.min_qty} unités</span></p>
                  <p className="font-display font-black text-dark-800 text-sm">{t.price?.toLocaleString('fr-FR')} FCFA / u</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEMANDE DE DEVIS (GROSSISTES) */}
        <div className="bg-gradient-to-r from-dark-800 to-dark-900 rounded-3xl p-5 shadow-card text-white flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm">Acheteur professionnel ?</p>
            <p className="text-xs text-white/60 mt-1 leading-normal">Faites une demande de devis personnalisé pour obtenir les meilleurs prix de gros.</p>
          </div>
          <button onClick={() => setQuoteOpen(true)}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-dark-900 font-bold text-xs transition-colors">
            Demander un devis
          </button>
        </div>

        {/* QUANTITÉ */}
        {!isOutofStock && (
          <div className="bg-white rounded-3xl p-5 shadow-card flex items-center justify-between">
            <p className="font-bold text-dark-800 text-sm">Quantité</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl bg-surface-100 hover:bg-surface-200 active:scale-90 flex items-center justify-center transition-all"
              >
                <Minus size={15} className="text-dark-700"/>
              </button>
              <span className="font-display font-black text-dark-800 text-lg w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-xl bg-surface-100 hover:bg-surface-200 active:scale-90 flex items-center justify-center transition-all"
              >
                <Plus size={15} className="text-dark-700"/>
              </button>
            </div>
          </div>
        )}

        {/* DESCRIPTION */}
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <p className="text-xs font-bold text-dark-600/50 uppercase tracking-wider mb-2">Description</p>
          <p className="text-dark-700 text-sm leading-relaxed">{product.description || 'Aucune description fournie.'}</p>
        </div>

        {/* INFOS BOUTIQUE */}
        <div className="bg-white rounded-3xl p-4 shadow-card flex items-center gap-3 active:scale-[0.99] transition-all"
          onClick={() => navigate(`/boutique/${product.shop?.slug}`)}>
          <Avatar src={null} name={product.shop?.name} size="md"/>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-dark-800 text-sm truncate">{product.shop?.name}</p>
            <p className="text-dark-600/40 text-xs">Propriétaire : @{product.shop?.owner?.username}</p>
          </div>
          <ChevronRight size={16} className="text-dark-400"/>
        </div>

        {/* AVIS CLIENTS */}
        <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex justify-between items-center border-b border-surface-100 pb-3">
            <p className="font-bold text-dark-800 text-sm">Avis clients ({reviews.length})</p>
            {avgRating > 0 && (
              <div className="flex items-center gap-1 text-gold-500">
                <Star size={14} className="fill-gold-500"/>
                <span className="font-black text-sm text-dark-800">{avgRating}/5</span>
              </div>
            )}
          </div>

          {reviewsLoading ? (
            <div className="space-y-2">
              <div className="h-12 skeleton rounded-xl"/>
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center py-4 text-dark-600/40 text-xs">Aucun avis vérifié sur ce produit.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div key={rev.id} className="space-y-2 border-b border-surface-50 last:border-0 pb-3">
                  <div className="flex items-center justify-between">
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
                  {rev.photo_urls?.length > 0 && (
                    <div className="flex gap-1.5 pl-8 pt-1">
                      {rev.photo_urls.map((url, index) => (
                        <img key={index} src={url} className="w-12 h-12 object-cover rounded-lg border border-surface-200" alt="review"/>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BARRE ACTIONS STICKY BAS */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-200 px-4 py-3 flex items-center justify-between gap-3 shadow-2xl safe-pb max-w-[var(--content-max-width)] mx-auto">
        <div className="flex flex-col">
          <p className="text-dark-600/50 text-[10px] font-bold uppercase tracking-wider">Total estimé</p>
          <p className="font-display font-black text-primary-700 text-xl">{totalPrice.toLocaleString('fr-FR')} F</p>
        </div>

        {isOutofStock ? (
          <button disabled className="flex-1 py-3.5 rounded-2xl bg-surface-200 text-dark-600/40 font-bold text-sm cursor-not-allowed">
            Rupture de stock
          </button>
        ) : (
          <div className="flex gap-2 flex-1">
            <button onClick={handleAddToCart}
              className="flex-1 py-3.5 rounded-2xl border-2 border-primary-600 text-primary-700 font-bold text-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5">
              <ShoppingBag size={14}/> Panier
            </button>
            <button onClick={handleBuyNow}
              className="flex-1 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-xs shadow-green active:scale-95 transition-transform">
              Acheter direct
            </button>
          </div>
        )}
      </div>

      {/* SHEET DEMANDE DE DEVIS */}
      <BottomSheet open={quoteOpen} onClose={() => setQuoteOpen(false)} title="🏷️ Demande de devis grossiste">
        <div className="px-4 pt-2 pb-8 space-y-4">
          <div className="p-3.5 bg-gold-500/10 border border-gold-300/30 rounded-2xl text-gold-700 text-xs">
            ⚠️ <strong>Réservé aux achats en gros.</strong> Indiquez la quantité désirée et vos exigences spécifiques. Le vendeur répondra en proposant un prix de gros.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Quantité minimale demandée</label>
            <input
              type="number"
              value={quoteQty}
              onChange={e => setQuoteQty(parseInt(e.target.value) || 0)}
              className="w-full bg-surface-100 border border-surface-200 rounded-xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Exigences spécifiques (conditionnement, transport...)</label>
            <textarea
              value={quoteDesc}
              onChange={e => setQuoteDesc(e.target.value)}
              placeholder="Ex: Nous souhaitons un conditionnement en sacs de 100kg avec transport inclus jusqu'à Cotonou..."
              rows={4}
              className="w-full bg-surface-100 border border-surface-200 rounded-xl px-4 py-3.5 text-sm font-medium outline-none focus:border-primary-500 resize-none"
            />
          </div>

          <Button onClick={handleSendQuote} disabled={quoteSending} className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-green">
            {quoteSending ? 'Envoi...' : <><Send size={15}/> Envoyer ma demande</>}
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
