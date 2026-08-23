import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, Upload, Check, AlertCircle, Info, MapPin, Camera, Store, ChevronRight, ChevronDown, Package, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { Button, BottomSheet } from '@/components/ui'
import { CATEGORIES, slugify, AVAILABILITY_OPTIONS, formatFCFA } from '@/components/vendor/shared'

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

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    if (!form.price || isNaN(+form.price) || +form.price <= 0) { toast.error('Prix invalide'); return }
    if (!imageFile) { toast.error('Photo requise'); return }
    if ((pieces?.balance || 0) < 5) { toast.error('Pièces insuffisantes (5 🪙 requis)'); return }

    setLoading(true)
    try {
      const compressed = await compressImage(imageFile, 800, 0.75)
      const path = `${shop.id}/${Date.now()}.jpg`
      const imageUrl = await uploadImage(BUCKETS.PRODUCTS, compressed, path)

      const { error } = await supabase.from('products').insert({
        shop_id: shop.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Math.round(+form.price),
        image_url: imageUrl,
        availability: form.availability,
        is_available: true,
        stock_quantity: stockQuantity ? parseInt(stockQuantity) : null,
        variants: variants,
        wholesale_tiers: wholesaleTiers
      })
      if (error) throw error

      const { data: piecesData2 } = await supabase
        .from('pieces').select('balance').eq('user_id', user.id).single()
      const currentBalance2 = piecesData2?.balance || 0
      await supabase.from('pieces')
        .update({ balance: currentBalance2 - 5 })
        .eq('user_id', user.id)

      toast.success('Produit ajouté ! 📦')
      reset()
      if (refreshWallet) await refreshWallet()
      onAdded()
      onClose()
    } catch { toast.error('Erreur lors de l\'ajout') }
    finally { setLoading(false) }
  }

  if (!shop) return null

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title={`➕ Ajouter un produit`}>
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
              ? <img src={imagePreview} className="w-full h-full object-cover"/>
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
          <label className="block text-sm font-bold text-dark-700">Description</label>
          <textarea placeholder="Détails, conditionnement, qualité..." value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))}
            className="input-field resize-none" rows={2}/>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-dark-700">Prix unitaire (FCFA) *</label>
            <input type="number" placeholder="Ex: 5000" min="0" value={form.price}
              onChange={e => setForm(p => ({...p, price: e.target.value}))} className="input-field"/>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-dark-700">Stock général (optionnel)</label>
            <input type="number" placeholder="Ex: 250 (vide = infini)" min="0" value={stockQuantity}
              onChange={e => setStockQuantity(e.target.value)} className="input-field"/>
          </div>
        </div>

        {/* COMPOSANT GESTIONNAIRE DE VARIANTES */}
        <div className="bg-surface-50 border border-surface-200 rounded-3xl p-4 space-y-3">
          <p className="text-xs font-bold text-dark-700 uppercase tracking-wider pl-0.5">Variantes (ex: 50kg, 100kg, sac)</p>
          
          <div className="grid grid-cols-3 gap-1.5">
            <input type="text" placeholder="Nom" value={vName} onChange={e => setVName(e.target.value)} className="input-field text-xs py-2 px-3"/>
            <input type="number" placeholder="Prix" value={vPrice} onChange={e => setVPrice(e.target.value)} className="input-field text-xs py-2 px-3"/>
            <input type="number" placeholder="Stock" value={vStock} onChange={e => setVStock(e.target.value)} className="input-field text-xs py-2 px-3"/>
          </div>
          <button onClick={addVariantLocal} className="w-full py-2 bg-primary-100 text-primary-700 text-xs font-bold rounded-xl active:scale-[0.98] transition-transform">
            ＋ Ajouter la variante
          </button>

          {variants.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-surface-200">
              {variants.map((v, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white border border-surface-150 p-2 rounded-xl text-xs">
                  <p className="font-semibold text-dark-800">{v.name} - {v.price} F {v.stock !== null ? `(${v.stock} en stock)` : ''}</p>
                  <button onClick={() => setVariants(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-1.5 py-0.5">✕</button>
                </div>
              ))}
            </div>
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
                  <button onClick={() => setWholesaleTiers(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-1.5 py-0.5">✕</button>
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

