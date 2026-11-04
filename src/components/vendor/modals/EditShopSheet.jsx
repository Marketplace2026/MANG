import React, { useState, useEffect } from 'react'
import { Truck, Phone, MapPin, Store, Check, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button, BottomSheet } from '@/components/ui'
import DeliveryCitiesConfig from '@/components/vendor/DeliveryCitiesConfig'
import { getShopDeliveryCities, getCleanShopDescription, embedDeliveryCitiesInDescription } from '@/utils/delivery'

export default function EditShopSheet({ open, onClose, shop, onUpdated }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    whatsapp: '',
    has_delivery: false
  })
  const [deliveryCities, setDeliveryCities] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (shop) {
      const cleanDesc = getCleanShopDescription(shop.description || '')
      const cities = getShopDeliveryCities(shop)
      setForm({
        name: shop.name || '',
        description: cleanDesc,
        city: shop.city || '',
        whatsapp: shop.whatsapp || '',
        has_delivery: !!shop.has_delivery
      })
      setDeliveryCities(cities)
    }
  }, [shop, open])

  const handleSave = async () => {
    if (!shop?.id) return
    if (!form.name.trim()) {
      toast.error('Le nom de la boutique est requis')
      return
    }

    if (form.has_delivery && (!deliveryCities || deliveryCities.length === 0)) {
      toast.error('Veuillez ajouter au moins une ville avec son tarif de livraison')
      return
    }

    setLoading(true)
    try {
      const finalDescription = form.has_delivery
        ? embedDeliveryCitiesInDescription(form.description.trim(), deliveryCities)
        : (form.description.trim() || null)

      const updatePayload = {
        name: form.name.trim(),
        description: finalDescription,
        has_delivery: !!form.has_delivery,
        whatsapp: form.whatsapp.trim() || null,
        city: form.city.trim() || null,
      }

      if (form.has_delivery) {
        updatePayload.delivery_cities = deliveryCities
      } else {
        updatePayload.delivery_cities = []
      }

      let { error } = await supabase
        .from('shops')
        .update(updatePayload)
        .eq('id', shop.id)

      // Fallback si la colonne delivery_cities n'existe pas encore en DB
      if (error && error.message && error.message.includes('delivery_cities')) {
        delete updatePayload.delivery_cities
        const retry = await supabase.from('shops').update(updatePayload).eq('id', shop.id)
        error = retry.error
      }

      if (error) throw error

      toast.success('Boutique et livraisons mises à jour !')
      if (onUpdated) onUpdated()
      onClose()
    } catch (err) {
      console.error('[EditShop Error]', err)
      toast.error(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  if (!shop) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier la boutique & livraisons">
      <div className="px-4 pt-2 pb-8 space-y-4 max-h-[82vh] overflow-y-auto">
        {/* Nom */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
            Nom de la boutique *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="input-field"
            placeholder="Nom de la boutique"
          />
        </div>

        {/* Localisation / Ville */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
            Adresse / Localisation boutique
          </label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
            <input
              type="text"
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              className="input-field pl-10 text-xs"
              placeholder="Ex: Cotonou, Akpakpa..."
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="input-field resize-none text-xs"
            placeholder="Présentez votre boutique, vos produits..."
          />
        </div>

        {/* Contact WhatsApp */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
            Numéro WhatsApp
          </label>
          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
            <input
              type="tel"
              value={form.whatsapp}
              onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
              className="input-field pl-10 text-xs"
              placeholder="Ex: +229 97 00 00 00"
            />
          </div>
        </div>

        {/* Livraison Toggle */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, has_delivery: !p.has_delivery }))}
            className={clsx(
              'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all',
              form.has_delivery
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                : 'border-surface-200 dark:border-dark-700'
            )}
          >
            <div
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                form.has_delivery ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-dark-700 text-dark-600 dark:text-gray-300'
              )}
            >
              <Truck size={16} />
            </div>
            <div className="flex-1 text-left">
              <p className={clsx('text-xs font-bold', form.has_delivery ? 'text-primary-700 dark:text-primary-400' : 'text-dark-800 dark:text-white')}>
                Livraison disponible
              </p>
              <p className="text-[10px] text-dark-500 dark:text-dark-400">
                {form.has_delivery ? 'Vos clients peuvent demander la livraison selon vos tarifs' : 'Retrait en magasin uniquement'}
              </p>
            </div>
            <div
              className={clsx(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                form.has_delivery ? 'border-primary-500 bg-primary-500' : 'border-surface-300 dark:border-dark-600'
              )}
            >
              {form.has_delivery && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
          </button>

          {/* Configuration des villes et tarifs de livraison si actif */}
          {form.has_delivery && (
            <DeliveryCitiesConfig
              cities={deliveryCities}
              onChange={setDeliveryCities}
            />
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-[2]"
            loading={loading}
            onClick={handleSave}
          >
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
