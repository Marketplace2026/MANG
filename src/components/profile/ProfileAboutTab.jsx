import { MapPin, Phone, Store, Clock, ShieldCheck, Award, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProfileAboutTab({ profile, shop }) {
  const navigate = useNavigate()
  const locationText = shop?.city || profile?.city || 'Cotonou, Bénin'
  const whatsappNumber = shop?.phone || profile?.phone || ''

  return (
    <div className="p-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
      {/* 1. Carte Localisation & Contact */}
      <div className="p-5 bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 space-y-4 shadow-xs">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
          📍 Localisation & Contact
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <MapPin size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-gray-900 dark:text-white">{locationText}</p>
              <p className="text-[11px] text-gray-400">Zone de livraison principale : Grand Cotonou</p>
            </div>
          </div>

          {whatsappNumber && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Phone size={18} />
              </div>
              <div>
                <p className="font-bold text-xs text-gray-900 dark:text-white">+{whatsappNumber.replace(/[^0-9]/g, '')}</p>
                <p className="text-[11px] text-gray-400">WhatsApp professionnel certifié</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <p className="font-bold text-xs text-gray-900 dark:text-white">7j/7 · 07h00 - 20h00</p>
              <p className="text-[11px] text-gray-400">Réponse rapide garantie sur WhatsApp & Chat</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Boutique associée */}
      {shop && (
        <div className="p-5 bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 space-y-3 shadow-xs">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
            🏪 Boutique officielle MANG
          </h3>
          <div className="flex items-center justify-between p-3 bg-surface-50 dark:bg-dark-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl font-black">
                🌿
              </div>
              <div>
                <p className="font-bold text-xs text-gray-900 dark:text-white">{shop.name}</p>
                <p className="text-[11px] text-gray-400">@{shop.slug}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/boutique/${shop.slug}`)}
              className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl text-xs active:scale-95 transition-transform"
            >
              Visiter →
            </button>
          </div>
        </div>
      )}

      {/* 3. Garanties MANG Pay */}
      <div className="p-5 bg-gradient-to-br from-emerald-900 via-primary-900 to-dark-900 rounded-3xl text-white space-y-3 shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-amber-400" />
          <h4 className="font-bold text-sm">Protection des achats MANG Pay</h4>
        </div>
        <p className="text-xs text-emerald-100/90 leading-relaxed">
          Toutes les commandes effectuées avec cet utilisateur bénéficient de la garantie de remboursement sous séquestre MANG Escrow jusqu'à la livraison effective.
        </p>
      </div>
    </div>
  )
}
