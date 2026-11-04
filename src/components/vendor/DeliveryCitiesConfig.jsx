import React, { useState } from 'react'
import { Plus, Trash2, MapPin, AlertCircle, Check, DollarSign } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { BENIN_CITIES, formatDeliveryPrice } from '@/utils/delivery'

export default function DeliveryCitiesConfig({ cities = [], onChange }) {
  const [cityName, setCityName] = useState('')
  const [cityPrice, setCityPrice] = useState('1000')

  const handleAdd = () => {
    const trimmed = cityName.trim()
    if (!trimmed) {
      toast.error('Veuillez entrer ou sélectionner une ville')
      return
    }

    // Vérifier si la ville existe déjà
    const exists = cities.some(c => c.city.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      toast.error(`La ville de ${trimmed} est déjà dans votre liste`)
      return
    }

    const priceNum = Math.max(0, parseInt(cityPrice, 10) || 0)
    const updated = [...cities, { city: trimmed, price: priceNum }]
    onChange(updated)
    setCityName('')
    setCityPrice('1000')
    toast.success(`Ville "${trimmed}" ajoutée (${formatDeliveryPrice(priceNum)})`)
  }

  const handleRemove = (index) => {
    const removed = cities[index]
    const updated = cities.filter((_, i) => i !== index)
    onChange(updated)
    if (removed) toast.success(`Ville "${removed.city}" retirée`)
  }

  const selectSuggestion = (city) => {
    setCityName(city)
  }

  return (
    <div className="bg-surface-50 dark:bg-dark-800 rounded-2xl p-4 border-2 border-primary-200 dark:border-primary-900/60 space-y-4 transition-all">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <MapPin size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-dark-900 dark:text-white uppercase tracking-wider">
            Villes et tarifs de livraison
          </h4>
          <p className="text-[11px] text-dark-500 dark:text-dark-400">
            Définissez chaque ville où vous livrez avec son prix de livraison
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary-600 text-white shadow-xs">
          {cities.length} ville{cities.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Suggestions rapides de villes du Bénin */}
      <div>
        <label className="block text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-1.5">
          Suggestions rapides :
        </label>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {BENIN_CITIES.map(city => {
            const isAlreadyAdded = cities.some(c => c.city.toLowerCase() === city.toLowerCase())
            const isSelected = cityName.toLowerCase() === city.toLowerCase()
            return (
              <button
                type="button"
                key={city}
                onClick={() => !isAlreadyAdded && selectSuggestion(city)}
                disabled={isAlreadyAdded}
                className={clsx(
                  'px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95',
                  isAlreadyAdded
                    ? 'bg-surface-200 dark:bg-dark-700/50 text-dark-400 dark:text-dark-500 line-through cursor-not-allowed opacity-50'
                    : isSelected
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-white dark:bg-dark-700 text-dark-700 dark:text-gray-200 border border-surface-200 dark:border-dark-600 hover:border-primary-400'
                )}
              >
                {isAlreadyAdded && <Check size={10} />}
                <span>{city}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Formulaire d'ajout d'une ville */}
      <div className="bg-white dark:bg-dark-900 rounded-xl p-3 border border-surface-200 dark:border-dark-700 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Nom de la ville */}
          <div>
            <label className="block text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-1">
              Nom de la ville *
            </label>
            <input
              type="text"
              placeholder="Ex: Cotonou, Calavi, Parakou..."
              value={cityName}
              onChange={e => setCityName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-surface-50 dark:bg-dark-800 border border-surface-200 dark:border-dark-700 text-dark-800 dark:text-white outline-none focus:border-primary-500"
            />
          </div>

          {/* Tarif de livraison */}
          <div>
            <label className="block text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-1">
              Prix de livraison (FCFA) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                placeholder="1000"
                value={cityPrice}
                onChange={e => setCityPrice(e.target.value)}
                className="w-full pl-3 pr-12 py-2 text-xs font-semibold rounded-lg bg-surface-50 dark:bg-dark-800 border border-surface-200 dark:border-dark-700 text-dark-800 dark:text-white outline-none focus:border-primary-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-dark-400">
                FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Boutons prix rapides */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-dark-400">Tarifs fréquents :</span>
          {[0, 500, 1000, 1500, 2000, 2500].map(val => (
            <button
              type="button"
              key={val}
              onClick={() => setCityPrice(val.toString())}
              className={clsx(
                'px-2 py-0.5 rounded text-[10px] font-bold transition-all',
                cityPrice === val.toString()
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 dark:bg-dark-800 text-dark-600 dark:text-gray-300 hover:bg-surface-200'
              )}
            >
              {val === 0 ? 'Gratuit' : `${val.toLocaleString('fr-FR')} F`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>Ajouter cette ville de livraison</span>
        </button>
      </div>

      {/* Liste des villes configurées */}
      {cities.length === 0 ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Veuillez ajouter au moins une ville pour enregistrer votre service de livraison.</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <p className="text-[10px] font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
            Villes actuellement desservies ({cities.length}) :
          </p>
          {cities.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-700 text-xs transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <MapPin size={12} />
                </div>
                <span className="font-bold text-dark-800 dark:text-white truncate">
                  {item.city}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                  {formatDeliveryPrice(item.price)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 hover:bg-red-100 flex items-center justify-center active:scale-90 transition-transform"
                  title="Supprimer cette ville"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
