import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, Upload, Check, AlertCircle, Info, MapPin, Camera, Store, ChevronRight, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { Button, BottomSheet } from '@/components/ui'
import { CATEGORIES, slugify, AVAILABILITY_OPTIONS, formatFCFA } from '@/components/vendor/shared'

export default function CreateShopSheet({ open, onClose, user, pieces, onCreated, refreshWallet }) {
  const [form, setForm] = useState({ name:'', description:'', city:'', quarter:'', address:'', whatsapp:'', has_delivery: false })
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [dbCategories, setDbCategories] = useState([])
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState(null)
  const coverRef = useRef()

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('sort_order')
      setDbCategories(data || [])
    }
    fetchCats()
  }, [])

  const reset = () => {
    setForm({ name:'', description:'', city:'', quarter:'', address:'', whatsapp:'', has_delivery: false })
    setSelectedCategory(null); setCoverFile(null); setCoverPreview(null); setCoords(null)
  }

  const handleCover = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async ({ coords: c }) => {
      setCoords({ latitude: c.latitude, longitude: c.longitude })
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${c.latitude}&lon=${c.longitude}&format=json`)
        const data = await res.json()
        const city = data.address?.city || data.address?.town || data.address?.village || ''
        const quarter = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || ''
        setForm(p => ({ ...p, city, quarter }))
        toast.success(`📍 ${quarter ? `${quarter}, ${city}` : city}`)
      } catch { toast.success('Position enregistrée') }
      setLocating(false)
    }, () => { toast.error('GPS inaccessible'); setLocating(false) })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    if (!selectedCategory) { toast.error('Catégorie requise'); return }
    if (!coverFile) { toast.error('Photo de la boutique requise'); return }
    if (!form.city.trim()) { toast.error('Ville requise'); return }
    if (!form.quarter.trim()) { toast.error('Quartier requis'); return }
    if (!form.address.trim()) { toast.error('Adresse exacte requise'); return }
    if (!coords) { toast.error('Veuillez cliquer sur le bouton "GPS" pour localiser précisément votre boutique'); return }
    if ((pieces?.balance || 0) < 10) { toast.error('Pièces insuffisantes (10 🪙 requis)'); return }

    setLoading(true)
    try {
      // Upload cover
      const compressed = await compressImage(coverFile, 900, 0.75)
      const path = `${user.id}/${Date.now()}.jpg`
      const coverUrl = await uploadImage(BUCKETS.COVERS, compressed, path)

      // Slug unique
      let slug = slugify(form.name)
      const { count } = await supabase.from('shops').select('id', { count: 'exact' }).eq('slug', slug)
      if (count > 0) slug = `${slug}-${Date.now()}`

      const fullLocationString = `${form.address.trim()} (${form.quarter.trim()}, ${form.city.trim()})`
      const { error } = await supabase.from('shops').insert({
        owner_id: user.id,
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        city: fullLocationString,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        cover_url: coverUrl,
        has_delivery: form.has_delivery,
        whatsapp: form.whatsapp.trim() || null,
        category_id: selectedCategory.id,
      })

      if (error) throw error

      // Déduire pièces (récupérer le vrai solde depuis Supabase)
      const { data: piecesData } = await supabase
        .from('pieces').select('balance').eq('user_id', user.id).single()
      const currentBalance = piecesData?.balance || 0
      await supabase.from('pieces')
        .update({ balance: currentBalance - 10 })
        .eq('user_id', user.id)

      // Notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'order_new',
        title: '🏪 Boutique créée !',
        body: `Votre boutique "${form.name}" est maintenant en ligne.`,
      })

      toast.success('Boutique créée avec succès ! 🎉')
      reset()
      // Recharger les pièces depuis Supabase
      if (refreshWallet) await refreshWallet()
      onCreated()
    } catch (err) {
      toast.error(err.message?.includes('23505') ? 'Ce nom de boutique existe déjà' : 'Erreur lors de la création')
    } finally { setLoading(false) }
  }

  // Groupement par group_name dynamique et filtrage de recherche
  const groupMap = {}
  dbCategories.forEach(cat => {
    const matchesSearch = !catSearch 
      || cat.name.toLowerCase().includes(catSearch.toLowerCase()) 
      || cat.group_name.toLowerCase().includes(catSearch.toLowerCase())
      
    if (matchesSearch) {
      if (!groupMap[cat.group_name]) {
        groupMap[cat.group_name] = {
          name: cat.group_name,
          icon: cat.icon || '🌱',
          items: []
        }
      }
      groupMap[cat.group_name].items.push(cat)
    }
  })
  const filtered = Object.values(groupMap)

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title="🏪 Créer une boutique">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Alerte pièces */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gold-50 border border-gold-200">
          <span className="text-2xl">🪙</span>
          <div>
            <p className="text-gold-800 font-bold text-sm">Coût : 10 pièces</p>
            <p className="text-gold-600 text-xs">Solde actuel : {pieces?.balance || 0} pièces</p>
          </div>
        </div>

        {/* Photo cover */}
        <div>
          <label className="block text-sm font-bold text-dark-700 mb-2">Photo de la boutique *</label>
          <button onClick={() => coverRef.current?.click()}
            className="w-full h-36 rounded-2xl overflow-hidden border-2 border-dashed border-surface-300 bg-surface-50 flex flex-col items-center justify-center active:scale-[0.98] transition-transform relative">
            {coverPreview ? (
              <img src={coverPreview} className="w-full h-full object-cover"/>
            ) : (
              <>
                <Camera size={28} className="text-dark-600/30 mb-2"/>
                <p className="text-dark-600/50 text-sm font-medium">Appuyer pour ajouter une photo</p>
              </>
            )}
            {coverPreview && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-bold">Changer la photo</p>
              </div>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCover} className="hidden"/>
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Nom de la boutique *</label>
          <input type="text" placeholder="Ex: Ferme Agro-Béninoise" value={form.name}
            onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field"/>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Description</label>
          <textarea placeholder="Décrivez votre boutique..." value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))}
            className="input-field resize-none" rows={3}/>
        </div>

        {/* Catégorie */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Catégorie *</label>
          <button onClick={() => setCatOpen(true)}
            className={clsx('input-field text-left flex items-center justify-between', !selectedCategory && 'text-dark-600/40')}>
            <span>{selectedCategory ? `${selectedCategory.group_name} · ${selectedCategory.name}` : 'Choisir une catégorie'}</span>
            <ChevronDown size={16} className="text-dark-600/40"/>
          </button>
        </div>

        {/* Ville * + GPS */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Ville *</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
              <input type="text" required placeholder="Ex: Cotonou" value={form.city}
                onChange={e => setForm(p => ({...p, city: e.target.value}))} className="input-field pl-10"/>
            </div>
            <button onClick={handleLocate} disabled={locating}
              className={clsx(
                "px-4 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2",
                coords ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "bg-primary-50 text-primary-700"
              )}>
              {locating ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
              ) : coords ? (
                <>✓ Localisé</>
              ) : (
                <><MapPin size={15}/> GPS</>
              )}
            </button>
          </div>
        </div>

        {/* Quartier * */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Quartier / Zone *</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
            <input type="text" required placeholder="Ex: Fidjrossé" value={form.quarter}
              onChange={e => setForm(p => ({...p, quarter: e.target.value}))} className="input-field pl-10"/>
          </div>
        </div>

        {/* Adresse exacte * */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Adresse exacte *</label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
            <input type="text" required placeholder="Ex: En face de la pharmacie, maison verte" value={form.address}
              onChange={e => setForm(p => ({...p, address: e.target.value}))} className="input-field pl-10"/>
          </div>
        </div>

        {/* Livraison + WhatsApp */}
        <div className="space-y-3">
          <button onClick={() => setForm(p => ({...p, has_delivery: !p.has_delivery}))}
            className={clsx('w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all',
              form.has_delivery ? 'border-primary-500 bg-primary-50' : 'border-surface-200')}>
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              form.has_delivery ? 'bg-primary-500 text-white' : 'bg-surface-100 text-dark-600')}>
              <Truck size={16}/>
            </div>
            <span className={clsx('flex-1 text-left text-sm font-bold', form.has_delivery ? 'text-primary-700' : 'text-dark-700')}>
              Livraison disponible
            </span>
            <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              form.has_delivery ? 'border-primary-500 bg-primary-500' : 'border-surface-300')}>
              {form.has_delivery && <Check size={12} className="text-white" strokeWidth={3}/>}
            </div>
          </button>

          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
            <input type="tel" placeholder="Numéro WhatsApp (+229...)" value={form.whatsapp}
              onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} className="input-field pl-10"/>
          </div>
        </div>

        <Button variant="primary" className="w-full" size="lg" loading={loading} onClick={handleCreate}>
          Créer la boutique — 10 🪙
        </Button>
      </div>

      {/* Modal catégories */}
      {catOpen && (
        <>
          <div className="fixed inset-0 bg-dark-900/60 z-[60] backdrop-blur-sm" onClick={() => setCatOpen(false)}/>
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl max-w-[480px] mx-auto shadow-modal animate-slide-up">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-surface-300"/></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
              <h3 className="font-display text-lg font-bold">Catégorie</h3>
              <button onClick={() => setCatOpen(false)} className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center"><X size={16}/></button>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
                <input type="text" placeholder="Rechercher..." value={catSearch} onChange={e => setCatSearch(e.target.value)} className="input-field pl-10 text-sm"/>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] px-4 pb-6 space-y-2">
              {filtered.map(group => (
                <div key={group.name} className="rounded-2xl border-2 border-surface-200 overflow-hidden">
                  <button onClick={() => setExpandedGroup(expandedGroup === group.name ? null : group.name)}
                    className="w-full flex items-center justify-between p-3 bg-surface-50 active:bg-surface-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <span className="font-bold text-dark-800 text-sm">{group.name}</span>
                    </div>
                    <ChevronDown size={15} className={clsx('text-dark-600/40 transition-transform', expandedGroup === group.name && 'rotate-180')}/>
                  </button>
                  {expandedGroup === group.name && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-white">
                      {group.items.map(cat => (
                        <button key={cat.id} onClick={() => { setSelectedCategory(cat); setCatOpen(false); setCatSearch('') }}
                          className={clsx('flex items-center gap-2 p-2.5 rounded-xl text-left transition-all active:scale-[0.98]',
                            selectedCategory?.id === cat.id ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-surface-50 active:bg-primary-50')}>
                          <span>{cat.icon || '🌱'}</span>
                          <span className="text-xs font-bold text-dark-700 truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </BottomSheet>
  )
}

