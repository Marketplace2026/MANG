import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Trash2, MapPin, Phone, ShieldCheck, Wallet,
  Lock, ShoppingCart, ShoppingBag, Plus, Minus, CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { useCartStore } from '@/store/useCartStore'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'

// Hachage SHA-256 pour vérifier le PIN du Wallet
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export default function CartPage() {
  const navigate = useNavigate()
  const { user, wallet, refreshWallet } = useAuthStore()
  const { items, removeItem, updateQuantity, clearCart } = useCartStore()
  const cartItems = Array.isArray(items) ? items : (items && Array.isArray(items.items) ? items.items : [])
  console.log("cartItems:", cartItems)

  const [address, setAddress] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [note, setNote] = useState('')
  const [pin, setPin] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1) // 1: Panier, 2: Livraison & Paiement, 3: Confirmation

  useEffect(() => {
    if (user) {
      refreshWallet()
    }
  }, [user])

  // Calcul du prix unitaire d'un produit avec variante et paliers de gros
  const getItemUnitPrice = (item) => {
    if (!item) return 0
    const p = item.product || item || {}
    let price = item.variant ? item.variant.price : (p.price || 0)

    // Paliers de gros
    if (p.wholesale_tiers && p.wholesale_tiers.length > 0) {
      const applicableTier = p.wholesale_tiers
        .filter(t => item.quantity >= parseInt(t.min_qty || 0))
        .reduce((max, t) => (parseInt(t.min_qty || 0) > parseInt(max.min_qty || 0) ? t : max), { min_qty: 0, price })
      
      if (applicableTier.min_qty > 0) {
        price = applicableTier.price
      }
    }
    return price || 0
  }

  // Calcul des totaux
  const cartSubtotal = cartItems.reduce((sum, item) => sum + getItemUnitPrice(item) * item.quantity, 0)
  const platformFee = 0 // Pas de frais supplémentaires affichés
  const cartTotal = cartSubtotal

  // Regrouper les articles par boutique pour l'affichage
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!item) return acc
    const product = item.product || item
    const shopId = product.shop_id || 'no-shop'
    const shopName = product.shop?.name || 'Boutique MANG'
    if (!acc[shopId]) {
      acc[shopId] = { shopName, items: [] }
    }
    acc[shopId].items.push(item)
    return acc
  }, {})

  const handleCheckout = async () => {
    if (!address.trim()) return toast.error('Veuillez renseigner une adresse de livraison')
    if (!deliveryPhone.trim()) return toast.error('Veuillez renseigner un téléphone de livraison')

    setCheckingOut(true)
    try {
      // Passer la commande pour chaque article du panier
      for (const item of cartItems) {
        const product = item.product || item
        const { data, error } = await supabase.rpc('place_order', {
          p_buyer_id: user.id,
          p_product_id: product.id,
          p_quantity: item.quantity,
          p_delivery_address: address.trim(),
          p_delivery_phone: deliveryPhone.trim(),
          p_note: note.trim() || null,
          p_variant_name: item.variant ? item.variant.name : null
        })

        if (error) throw error
        if (!data?.success) {
          throw new Error(data?.error || 'Erreur lors de la validation')
        }
      }

      // Succès
      clearCart()
      setCheckoutStep(3)
      toast.success('Commande(s) enregistrée(s) avec succès ! 📦')
    } catch (err) {
      toast.error(err.message || 'Erreur technique lors de la validation')
    } finally {
      setCheckingOut(false)
    }
  }

  if (cartItems.length === 0 && checkoutStep !== 3) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4">
          <ShoppingCart size={40} className="text-primary-600"/>
        </div>
        <h2 className="font-display font-black text-dark-800 text-lg">Votre panier est vide</h2>
        <p className="text-dark-600/50 text-xs mt-1 max-w-xs leading-normal">
          Explorez la marketplace pour ajouter des récoltes et produits agricoles à votre panier.
        </p>
        <Button onClick={() => navigate('/marketplace')} className="mt-6 px-6 bg-primary-600 text-white font-bold rounded-2xl shadow-green">
          Découvrir les produits
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-36">
      {/* HEADER */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-surface-100 px-4 py-3.5 z-20 flex items-center gap-3">
        {checkoutStep < 3 && (
          <button onClick={() => checkoutStep === 2 ? setCheckoutStep(1) : navigate(-1)} className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center transition-colors">
            <ArrowLeft size={18} className="text-dark-800"/>
          </button>
        )}
        <h1 className="font-display font-black text-dark-800 text-lg">
          {checkoutStep === 1 ? 'Mon Panier' : checkoutStep === 2 ? 'Livraison & Paiement' : 'Confirmation'}
        </h1>
      </div>

      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
        {/* ÉTAPE 1 : LISTE DU PANIER */}
        {checkoutStep === 1 && (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([shopId, shopData]) => (
              <div key={shopId} className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                {/* Vendeur Header */}
                <div className="flex items-center gap-2 pb-2.5 border-b border-surface-50">
                  <Store size={14} className="text-primary-600"/>
                  <span className="font-bold text-xs text-dark-800">{shopData.shopName}</span>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {shopData.items.map(item => {
                    const product = item.product || item
                    const unitPrice = getItemUnitPrice(item)
                    const itemSubtotal = unitPrice * item.quantity
                    const isBulkDiscount = product.wholesale_tiers?.some(t => item.quantity >= parseInt(t.min_qty || 0))

                    return (
                      <div key={item.id} className="flex gap-3 items-center py-2 border-b border-surface-50 last:border-0 last:pb-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-100 flex-shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl opacity-35 bg-primary-50">🌿</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-dark-800 text-xs truncate">{product.name}</p>
                          {item.variant && (
                            <p className="text-[10px] text-dark-500 font-semibold mt-0.5">Variante : {item.variant.name}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="font-display font-black text-primary-700 text-xs">
                              {unitPrice.toLocaleString('fr-FR')} F
                            </span>
                            {isBulkDiscount && (
                              <span className="text-[8px] bg-gold-400/20 text-gold-700 font-black px-1.5 py-0.5 rounded-md">GROS</span>
                            )}
                          </div>
                        </div>

                        {/* Quantité & Supprimer */}
                        <div className="flex flex-col items-end gap-2">
                          <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={13}/>
                          </button>
                          <div className="flex items-center gap-2 bg-surface-100 rounded-lg p-1">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-dark-600 active:scale-75 transition-transform">
                              <Minus size={11}/>
                            </button>
                            <span className="text-xs font-bold text-dark-800 w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-dark-600 active:scale-75 transition-transform">
                              <Plus size={11}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* TOTAL ET CTA ÉTAPE 1 */}
            <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-dark-600/50">Sous-total</span>
                <span className="text-dark-800">{cartSubtotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="h-px bg-surface-100"/>
              <div className="flex justify-between items-center">
                <span className="font-bold text-dark-800 text-sm">Montant Total</span>
                <span className="font-display font-black text-primary-700 text-lg">{cartTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <button
                onClick={() => setCheckoutStep(2)}
                className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-sm tracking-wide shadow-green active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Commander
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : LIVRAISON & PAIEMENT */}
        {checkoutStep === 2 && (
          <div className="space-y-4">
            {/* Infos livraison */}
            <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
              <p className="text-xs font-black text-dark-600/50 uppercase tracking-wider pl-0.5">Adresse & livraison</p>

              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400"/>
                <input
                  type="text"
                  placeholder="Adresse précise (ex: Cotonou, quartier Fidjrossè)"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-dark-800 placeholder-dark-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400"/>
                <input
                  type="tel"
                  placeholder="Téléphone de contact pour livraison"
                  value={deliveryPhone}
                  onChange={e => setDeliveryPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl text-dark-800 placeholder-dark-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <textarea
                  placeholder="Note pour le livreur (optionnel)..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-dark-800 placeholder-dark-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            {/* Paiement MANG Wallet */}
            <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
              <p className="text-xs font-black text-dark-600/50 uppercase tracking-wider pl-0.5 flex items-center gap-1.5">
                <Wallet size={13} className="text-primary-600"/> Paiement Sécurisé MANG Wallet
              </p>

              <div className="flex justify-between items-center p-3 bg-primary-50/50 border border-primary-100 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <div>
                    <p className="text-dark-700 font-bold">Disponible</p>
                    <p className="text-primary-700 font-black mt-0.5">{(wallet?.balance_available || 0).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-dark-700 font-bold">À payer</p>
                  <p className="text-dark-900 font-black mt-0.5">{cartTotal.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>



              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-2xl text-[10px] text-emerald-800 font-bold">
                <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0"/>
                <p>Vos fonds restent bloqués en escrow et ne seront libérés au vendeur qu'après confirmation de votre livraison.</p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut}
                className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-sm tracking-wide shadow-green active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {checkingOut ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                ) : (
                  `Confirmer la commande (${cartTotal.toLocaleString('fr-FR')} F)`
                )}
              </button>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : CONFIRMATION */}
        {checkoutStep === 3 && (
          <div className="bg-white rounded-3xl p-6 shadow-card text-center space-y-5 animate-fade-in py-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle size={45}/>
            </div>
            <div>
              <h2 className="font-display font-black text-dark-900 text-xl">Commande passée !</h2>
              <p className="text-dark-600/50 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
                Vos commandes ont été créées avec succès et sont en attente d'acceptation par les vendeurs respectifs.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-2">
              <button onClick={() => navigate('/commandes')}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl shadow-green transition-all active:scale-95 text-sm">
                Voir mes commandes
              </button>
              <button onClick={() => navigate('/marketplace')}
                className="w-full py-3.5 bg-surface-100 hover:bg-surface-200 text-dark-700 font-bold rounded-2xl transition-all active:scale-95 text-sm">
                Continuer mes achats
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
