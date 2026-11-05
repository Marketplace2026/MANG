import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, Sparkles, Upload, Check, AlertCircle, Info, MapPin, Camera, Store, ChevronRight, ChevronDown, Package, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { Button, BottomSheet } from '@/components/ui'
import { generateProductDescription } from '@/lib/ai'
import { CATEGORIES, slugify, AVAILABILITY_OPTIONS, formatFCFA, PRODUCT_LIMITS } from '@/components/vendor/shared'

const PACKAGING_SUGGESTIONS = [
  'Kg',
  'Sac de 25 kg',
  'Sac de 50 kg',
  'Sac de 100 kg',
  'Panier',
  'Bassine',
  'Carton',
  'Filet',
  'Bouteille (1L)',
  'Bidon (5L)',
  'Bidon (25L)',
  'Botte',
  'Casier',
  'Tas',
  'Plateau',
  'Unité / Pièce'
]

export default function AddProductSheet({ open, onClose, shop, user, pieces, onAdded, refreshWallet }) {
  const [form, setForm] = useState({ name:'', description:'', price:'', availability:'now' })
  const [stockQuantity, setStockQuantity] = useState('')
  const [variants, setVariants] = useState([])
  const [wholesaleTiers, setWholesaleTiers] = useState([])

  // States pour ajouter de nouvelles lignes de variantes/paliers
  const [vName, setVName] = useState('')
  const [vPrice, setVPrice] = useState('')
  const [vStock, setVStock] = useState('')
  const [tQty, setTQty] = useState('')
  const [tPrice, setTPrice] = useState('')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const imgRef = useRef()

  const reset = () => {
    setForm({ name:'', description:'', price:'', availability:'now' })
    setStockQuantity('')
    setVariants([])
    setWholesaleTiers([])
    setVName(''); setVPrice(''); setVStock('')
    setTQty(''); setTPrice('')
    setImageFile(null); setImagePreview(null)
  }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addVariantLocal = () => {
    if (!vName.trim()) return toast.error('Nom de variante requis')
    if (!vPrice || isNaN(vPrice) || +vPrice <= 0) return toast.error('Prix de variante invalide')
    setVariants(prev => [...prev, {
      name: vName.trim(),
      price: Math.round(+vPrice),
      stock: vStock && !isNaN(vStock) ? parseInt(vStock) : null
    }])
    setVName(''); setVPrice(''); setVStock('')
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
    } catch (err) {
      toast.error('Erreur de génération IA')
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Nom du produit requis'); return }
    if (!imageFile) { toast.error('Photo du produit requise'); return }

    // Vérifier les conditionnements / variantes (obligatoire)
    let finalVariants = [...variants]
    if (finalVariants.length === 0 && vName.trim() && vPrice && !isNaN(vPrice) && +vPrice > 0) {
      finalVariants.push({
        name: vName.trim(),
        price: Math.round(+vPrice),
        stock: vStock && !isNaN(vStock) ? parseInt(vStock) : null
      })
    }

    if (finalVariants.length === 0) {
      toast.error('Veuillez obligatoirement définir le conditionnement (ex: Sac de 50kg, Kg...) avec son prix');
      return;
    }

    const calculatedPrice = Math.min(...finalVariants.map(v => v.price))
    if ((pieces?.balance || 0) < 5) { toast.error('Pièces insuffisantes (5 🪙 requis)'); return }

    // Vérifier la limite de produits selon l'abonnement
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

      const { error } = await supabase.from('products').insert({
        shop_id: shop.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: calculatedPrice,
        image_url: imageUrl,
        availability: form.availability,
        is_available: true,
        stock_quantity: stockQuantity ? parseInt(stockQuantity) : null,
        variants: finalVariants,
        wholesale_tiers: wholesaleTiers
      })
      if (error) throw error

      const { data: piecesData2 } = await supabase
        .from('pieces').select('balance').eq('user_id', user.id).single()
      const currentBalance2 = piecesData2?.balance || 0
      await supabase.from('pieces')
        .update({ balance: currentBalance2 - 5 })
        .eq('user_id', user.id)

      toast.success('Produit ajouté ! ')
      reset()
      if (refreshWallet) await refreshWallet()
      onAdded()
      onClose()
    } catch { toast.error('Erreur lors de l\'ajout') }
    finally { setLoading(false) }
  }

  if (!shop) return null

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title={` Ajouter un produit`}>
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Boutique info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary-50">
          <Store size={16} className="text-primary-600"/>
          <span className="text-primary-700 font-semibold text-sm">{shop.name}</span>
          <span className="ml-auto text-xs text-gold-600 font-bold bg-gold-50 px-2 py-0.5 rounded-lg">5 🪙</span>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-bold text-dark-700 mb-2">Photo du produit *</label>
          <button onClick={() => imgRef.current?.click()}
            className="w-full h-32 rounded-2xl overflow-hidden border-2 border-dashed border-surface-300 bg-surface-50 flex flex-col items-center justify-center active:scale-[0.98] transition-transform relative">
            {imagePreview
              ? <img loading="lazy" src={imagePreview} className="w-full h-full object-cover"/>
              : <><Camera size={24} className="text-dark-600/30 mb-1.5"/><p className="text-dark-600/50 text-sm">Appuyer pour ajouter</p></>}
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Nom du produit *</label>
          <input type="text" placeholder="Ex: Maïs jaune local" value={form.name}
            onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field"/>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-dark-700">Description</label>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generatingAI || !form.name.trim()}
              className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-emerald-200 transition-all active:scale-95"
            >
              <Sparkles size={13} className={generatingAI ? 'animate-spin text-amber-500' : 'text-amber-500'} />
              <span>{generatingAI ? 'Rédaction IA...' : "✨ Rédiger avec l'IA"}</span>
            </button>
          </div>
          <textarea placeholder="Détails, conditionnement, qualité..." value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))}
            className="input-field resize-none" rows={4}/>
        </div>

        {/* CONDITIONNEMENTS & VARIANTES (OBLIGATOIRE) */}
        <div className="bg-surface-50 dark:bg-dark-800 border-2 border-primary-200 dark:border-primary-900/60 rounded-3xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-dark-900 dark:text-white uppercase tracking-wider">
                📦 Conditionnement & Prix (Obligatoire) *
              </p>
              <p className="text-[11px] text-dark-500 dark:text-gray-400 mt-0.5">
                Précisez l'unité ou le format de vente (ex: Sac de 50kg, au Kg, Panier...) avec son prix
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-600 text-white shadow-xs">
              {variants.length} format{variants.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Suggestions de conditionnements rapides */}
          <div>
            <label className="block text-[10px] font-bold text-dark-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Suggestions rapides en 1-clic :
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PACKAGING_SUGGESTIONS.map(sug => {
                const isSelected = vName.toLowerCase() === sug.toLowerCase()
                return (
                  <button
                    type="button"
                    key={sug}
                    onClick={() => setVName(sug)}
                    className={clsx(
                      'px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 border',
                      isSelected
                        ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                        : 'bg-white dark:bg-dark-700 text-dark-700 dark:text-gray-200 border-surface-200 dark:border-dark-600 hover:border-primary-400'
                    )}
                  >
                    {sug}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Formulaire d'ajout d'une variante */}
          <div className="bg-white dark:bg-dark-900 rounded-2xl p-3 border border-surface-200 dark:border-dark-700 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-dark-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Format / Unité *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sac de 50 kg"
                  value={vName}
                  onChange={e => setVName(e.target.value)}
                  className="input-field text-xs py-2 px-3"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-dark-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Prix (FCFA) *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 15000"
                  value={vPrice}
                  onChange={e => setVPrice(e.target.value)}
                  className="input-field text-xs py-2 px-3"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold text-dark-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Stock (optionnel)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ex: 50"
                  value={vStock}
                  onChange={e => setVStock(e.target.value)}
                  className="input-field text-xs py-2 px-3"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addVariantLocal}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Valider ce format / conditionnement</span>
            </button>
          </div>

          {/* Liste des formats / conditionnements enregistrés */}
          {variants.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-bold text-dark-500 dark:text-gray-400 uppercase tracking-wider">
                Formats qui seront affichés aux acheteurs :
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white dark:bg-dark-900 border border-primary-200 dark:border-primary-900/50 p-2.5 rounded-xl text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-dark-900 dark:text-white">{v.name}</p>
                        <p className="text-[10px] text-dark-500 dark:text-gray-400">
                          {v.stock !== null ? `Stock disponible : ${v.stock}` : 'Stock illimité'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-lg border border-primary-200 dark:border-primary-900/50">
                        {formatFCFA(v.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVariants(prev => prev.filter((_, i) => i !== idx))}
                        className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="Supprimer ce format"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
              <AlertCircle size={14} className="shrink-0 text-amber-600" />
              <span>Ajoutez au moins 1 format (ex: Sac de 50 kg à 15 000 F) pour activer la mise en vente.</span>
            </p>
          )}
        </div>

        {/* COMPOSANT GESTIONNAIRE DE PALIERS DE GROS */}
        <div className="bg-surface-50 border border-surface-200 rounded-3xl p-4 space-y-3">
          <p className="text-xs font-bold text-dark-700 uppercase tracking-wider pl-0.5">Paliers de gros (prix dégressifs)</p>
          
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Qté minimale" value={tQty} onChange={e => setTQty(e.target.value)} className="input-field text-xs py-2 px-3"/>
            <input type="number" placeholder="Prix unitaire (FCFA)" value={tPrice} onChange={e => setTPrice(e.target.value)} className="input-field text-xs py-2 px-3"/>
          </div>
          <button onClick={addTierLocal} className="w-full py-2 bg-gold-500/10 text-gold-700 text-xs font-bold rounded-xl active:scale-[0.98] transition-transform">
            ＋ Ajouter le palier grossiste
          </button>

          {wholesaleTiers.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-surface-200">
              {wholesaleTiers.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white border border-surface-150 p-2 rounded-xl text-xs">
                  <p className="font-semibold text-dark-800">Dès {t.min_qty} unités : {t.price} F / unité</p>
                  <button onClick={() => setWholesaleTiers(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-1.5 py-0.5"></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Disponibilité</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setForm(p => ({...p, availability: opt.value}))}
                className={clsx('p-2.5 rounded-xl text-xs font-semibold text-left transition-all active:scale-95 border-2',
                  form.availability === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-dark-600')}>
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

