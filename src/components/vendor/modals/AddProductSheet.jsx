import React, { useState, useRef } from 'react'
import { Plus, X, Sparkles, AlertCircle, Info, Camera, Store, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { Button, BottomSheet } from '@/components/ui'
import { generateProductDescription } from '@/lib/ai'
import { AVAILABILITY_OPTIONS, formatFCFA, PRODUCT_LIMITS } from '@/components/vendor/shared'

const UNIT_SUGGESTIONS = [
  '1 kg',
  '1 sac',
  '1 sac de 50 kg',
  '1 sac de 25 kg',
  '1 sac de 100 kg',
  '1 panier',
  '1 bassine',
  '1 carton',
  '1 filet',
  '1 bidon 5L',
  '1 bidon 25L',
  '1 botte',
  '1 casier',
  '1 tas',
  '1 plateau',
  '1 unité'
]

export default function AddProductSheet({ open, onClose, shop, user, pieces, onAdded, refreshWallet }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    unit: '1 kg',
    availability: 'now'
  })
  const [stockQuantity, setStockQuantity] = useState('')
  const [wholesaleTiers, setWholesaleTiers] = useState([])
  const [tQty, setTQty] = useState('')
  const [tPrice, setTPrice] = useState('')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const imgRef = useRef()

  const reset = () => {
    setForm({ name: '', description: '', price: '', unit: '1 kg', availability: 'now' })
    setStockQuantity('')
    setWholesaleTiers([])
    setTQty(''); setTPrice('')
    setImageFile(null); setImagePreview(null)
  }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addTierLocal = () => {
    if (!tQty || isNaN(tQty) || +tQty <= 0) return toast.error('Quantité minimale invalide')
    if (!tPrice || isNaN(tPrice) || +tPrice <= 0) return toast.error('Prix grossiste invalide')
    setWholesaleTiers(prev => [...prev, {
      min_qty: parseInt(tQty),
      price: Math.round(+tPrice)
    }])
    setTQty(''); setTPrice('')
  }

  const handleGenerateWithAI = async () => {
    if (!form.name.trim()) return toast.error('Veuillez d\'abord saisir le nom du produit')
    setGeneratingAI(true)
    try {
      const desc = await generateProductDescription({
        productName: form.name,
        price: form.price,
        originCity: shop?.city
      })
      if (desc) {
        setForm(prev => ({ ...prev, description: desc }))
        toast.success('Fiche produit générée par le Copilote IA ! ✨')
      }
    } catch {
      toast.error('Erreur de génération IA')
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Nom du produit requis'); return }
    if (!imageFile) { toast.error('Photo du produit requise'); return }
    if (!form.price || isNaN(form.price) || +form.price <= 0) {
      toast.error('Veuillez indiquer un prix unitaire valide en FCFA')
      return
    }
    if (!form.unit.trim()) {
      toast.error('Veuillez indiquer la quantité ou conditionnement (ex: 1kg, 1 sac, 1 panier...)')
      return
    }

    if ((pieces?.balance || 0) < 5) { toast.error('Pièces insuffisantes (5 🪙 requis)'); return }

    // Limite de produits selon l'abonnement
    const limit = PRODUCT_LIMITS[shop?.premium_level || 0] ?? 5
    if (limit !== Infinity) {
      const { count, error: countErr } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
      if (!countErr && (count || 0) >= limit) {
        toast.error(`Limite atteinte (${limit} produits max). Passez à l'abonnement supérieur !`)
        return
      }
    }

    setLoading(true)
    try {
      const compressed = await compressImage(imageFile, 800, 0.75)
      const path = `${shop.id}/${Date.now()}.jpg`
      const imageUrl = await uploadImage(BUCKETS.PRODUCTS, compressed, path)

      const cleanPrice = Math.round(+form.price)
      const cleanUnit = form.unit.trim()
      const cleanStock = stockQuantity && !isNaN(stockQuantity) ? parseInt(stockQuantity) : null

      // Rétrocompatibilité totale avec les fonctions RPC qui lisent `variants`
      const defaultVariants = [{
        name: cleanUnit,
        price: cleanPrice,
        stock: cleanStock
      }]

      const payload = {
        shop_id: shop.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: cleanPrice,
        unit: cleanUnit,
        image_url: imageUrl,
        availability: form.availability,
        is_available: true,
        stock_quantity: cleanStock,
        variants: defaultVariants,
        wholesale_tiers: wholesaleTiers
      }

      let { error } = await supabase.from('products').insert(payload)

      // Si la colonne unit n'est pas encore créée en base via SQL, fallback automatique sans crash
      if (error && error.message && error.message.toLowerCase().includes('unit')) {
        const fallbackPayload = { ...payload }
        delete fallbackPayload.unit
        const res = await supabase.from('products').insert(fallbackPayload)
        error = res.error
      }

      if (error) throw error

      const { data: piecesData2 } = await supabase
        .from('pieces').select('balance').eq('user_id', user.id).single()
      const currentBalance2 = piecesData2?.balance || 0
      await supabase.from('pieces')
        .update({ balance: currentBalance2 - 5 })
        .eq('user_id', user.id)

      toast.success('Produit ajouté avec succès !')
      reset()
      if (refreshWallet) await refreshWallet()
      onAdded()
      onClose()
    } catch {
      toast.error('Erreur lors de l\'ajout du produit')
    } finally {
      setLoading(false)
    }
  }

  if (!shop) return null

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title="Ajouter un produit">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Boutique info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary-50 dark:bg-emerald-950/40 border border-primary-200/50 dark:border-emerald-900/50">
          <Store size={16} className="text-primary-600 dark:text-emerald-400"/>
          <span className="text-primary-700 dark:text-emerald-300 font-semibold text-sm">{shop.name}</span>
          <span className="ml-auto text-xs text-gold-600 font-bold bg-gold-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-gold-200/50">5 🪙</span>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-bold text-dark-700 dark:text-gray-200 mb-2">Photo du produit *</label>
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            className="w-full h-32 rounded-2xl overflow-hidden border-2 border-dashed border-surface-300 dark:border-dark-600 bg-surface-50 dark:bg-dark-800 flex flex-col items-center justify-center active:scale-[0.98] transition-transform relative"
          >
            {imagePreview
              ? <img loading="lazy" src={imagePreview} className="w-full h-full object-cover" alt="Aperçu"/>
              : <><Camera size={24} className="text-dark-600/30 mb-1.5"/><p className="text-dark-600/50 dark:text-gray-400 text-sm">Appuyer pour ajouter une photo</p></>}
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700 dark:text-gray-200">Nom du produit *</label>
          <input
            type="text"
            placeholder="Ex: Maïs jaune local, Tomate fraîche..."
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="input-field"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-dark-700 dark:text-gray-200">Description</label>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generatingAI || !form.name.trim()}
              className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 disabled:opacity-40 px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95"
            >
              <Sparkles size={13} className={generatingAI ? 'animate-spin text-amber-500' : 'text-amber-500'} />
              <span>{generatingAI ? 'Rédaction IA...' : "✨ Rédiger avec l'IA"}</span>
            </button>
          </div>
          <textarea
            placeholder="Détails sur la récolte, qualité, provenance..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="input-field resize-none"
            rows={3}
          />
        </div>

        {/* PRIX UNITAIRE & QUANTITÉ / CONDITIONNEMENT */}
        <div className="bg-surface-50 dark:bg-dark-800 border-2 border-emerald-500/30 dark:border-emerald-700/40 rounded-3xl p-4 space-y-3.5">
          <div>
            <p className="text-xs font-black text-dark-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>💰 Prix unitaire & Quantité</span>
            </p>
            <p className="text-[11px] text-dark-500 dark:text-gray-400 mt-0.5">
              Le vendeur indique le prix et la quantité correspondante (ex: 15 000 F pour 1 sac)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Prix unitaire */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
                Prix unitaire (FCFA) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 15000"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className="input-field font-bold text-sm pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-dark-400 dark:text-gray-400">
                  FCFA
                </span>
              </div>
            </div>

            {/* Devant ça : Quantité / Conditionnement */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
                Quantité / Conditionnement *
              </label>
              <input
                type="text"
                placeholder="Ex: 1 sac, 1 kg, 1 panier..."
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                className="input-field font-bold text-sm"
              />
            </div>
          </div>

          {/* Exemples rapides en 1 clic */}
          <div className="pt-1">
            <label className="block text-[10px] font-bold text-dark-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Exemples rapides en 1 clic :
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {UNIT_SUGGESTIONS.map(sug => {
                const isSelected = form.unit.trim().toLowerCase() === sug.toLowerCase()
                return (
                  <button
                    type="button"
                    key={sug}
                    onClick={() => setForm(p => ({ ...p, unit: sug }))}
                    className={clsx(
                      'px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 border',
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-dark-700 text-dark-700 dark:text-gray-200 border-surface-200 dark:border-dark-600 hover:border-emerald-500'
                    )}
                  >
                    {sug}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stock disponible */}
          <div className="pt-2 border-t border-surface-200/60 dark:border-dark-700">
            <label className="block text-xs font-bold text-dark-700 dark:text-gray-300 mb-1">
              Stock total disponible <span className="font-normal text-dark-400 text-[11px]">(optionnel)</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder={`Ex: 50 (${form.unit || 'unités'} en réserve)`}
              value={stockQuantity}
              onChange={e => setStockQuantity(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>
        </div>

        {/* Paliers dégressifs de gros (optionnel) */}
        <div className="bg-surface-50 dark:bg-dark-800 border border-surface-200 dark:border-dark-700 rounded-3xl p-4 space-y-3">
          <p className="text-xs font-bold text-dark-700 dark:text-gray-300 uppercase tracking-wider pl-0.5">
            Paliers de gros (optionnel)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Dès (ex: 10 unités)"
              value={tQty}
              onChange={e => setTQty(e.target.value)}
              className="input-field text-xs py-2 px-3"
            />
            <input
              type="number"
              placeholder="Prix spécial (FCFA)"
              value={tPrice}
              onChange={e => setTPrice(e.target.value)}
              className="input-field text-xs py-2 px-3"
            />
          </div>
          <button
            type="button"
            onClick={addTierLocal}
            className="w-full py-2 bg-gold-500/10 text-gold-700 dark:text-amber-400 text-xs font-bold rounded-xl active:scale-[0.98] transition-transform"
          >
            ＋ Ajouter ce tarif de gros
          </button>

          {wholesaleTiers.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-surface-200 dark:border-dark-700">
              {wholesaleTiers.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white dark:bg-dark-900 border border-surface-150 dark:border-dark-700 p-2 rounded-xl text-xs">
                  <p className="font-semibold text-dark-800 dark:text-gray-200">Dès {t.min_qty} : {formatFCFA(t.price)} / {form.unit || 'u'}</p>
                  <button type="button" onClick={() => setWholesaleTiers(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-1.5 py-0.5">
                    <Trash2 size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disponibilité */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700 dark:text-gray-200">Disponibilité</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setForm(p => ({ ...p, availability: opt.value }))}
                className={clsx(
                  'p-2.5 rounded-xl text-xs font-semibold text-left transition-all active:scale-95 border-2',
                  form.availability === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-emerald-950/60 text-primary-700 dark:text-emerald-300'
                    : 'border-surface-200 dark:border-dark-700 text-dark-600 dark:text-gray-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full" size="lg" loading={loading} onClick={handleAdd}>
          Ajouter le produit — 5 🪙
        </Button>
      </div>
    </BottomSheet>
  )
}
