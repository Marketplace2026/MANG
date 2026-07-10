import { useState, useEffect } from 'react'
import { MapPin, X, Navigation, Check } from 'lucide-react'
import { BENIN_CITIES, BENIN_CITY_COORDS } from '@/utils/beninCities'
import { clsx } from 'clsx'

export default function LocationModal({ open, onClose, onSelect, forceMandatory = false }) {
  const [mode, setMode] = useState('choice') // 'choice', 'gps', 'manual'
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState(false)

  // Réinitialiser le mode à l'ouverture
  useEffect(() => {
    if (open) {
      setMode('choice')
      setGpsError(false)
      setGpsLoading(false)
    }
  }, [open])

  if (!open) return null

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setGpsError(true)
      setMode('choice')
      return
    }
    setGpsLoading(true)
    setGpsError(false)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          // Appel reverse geocoding via Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
          const data = await res.json()
          let cityName = "Commune inconnue"
          if (data && data.address) {
            const quartier = data.address.suburb || data.address.neighbourhood || data.address.quarter || ""
            const ville = data.address.city || data.address.town || data.address.village || data.address.county || ""
            if (quartier && ville) cityName = `${quartier}, ${ville}`
            else if (ville) cityName = ville
            else if (quartier) cityName = quartier
          }
          onSelect(cityName, latitude, longitude)
          setGpsLoading(false)
          onClose()
        } catch {
          // Fallback si l'API reverse-geocoding échoue
          onSelect("Bénin (GPS)", latitude, longitude)
          setGpsLoading(false)
          onClose()
        }
      },
      () => {
        setGpsLoading(false)
        setGpsError(true)
        setMode('manual') // Auto-switch vers saisie manuelle si le GPS est refusé ou échoue
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    )
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!selectedCity || !selectedQuarter) return
    const coords = BENIN_CITY_COORDS[selectedCity] || { lat: 6.3654, lon: 2.4183 }
    const formattedName = `${selectedQuarter}, ${selectedCity}`
    onSelect(formattedName, coords.lat, coords.lon)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in max-w-[480px] mx-auto">
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-surface-200 animate-slide-up">
        
        {/* En-tête du modal */}
        <div className="bg-green-700 p-5 text-white relative">
          {!forceMandatory && (
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition active:scale-90">
              <X size={16} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <MapPin size={22} className="text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-base tracking-wide uppercase leading-none">Localisation MANG</h3>
              <p className="text-white/60 text-[10px] mt-1 font-medium">Pour des boutiques et produits ultra-proches</p>
            </div>
          </div>
        </div>

        {/* Corps du modal */}
        <div className="p-6">
          {mode === 'choice' && (
            <div className="space-y-4">
              <p className="text-dark-800 text-xs font-semibold leading-relaxed text-center">
                Choisissez comment définir votre position pour obtenir les meilleurs frais de livraison et boutiques à proximité.
              </p>
              
              <button 
                onClick={handleGpsDetect}
                disabled={gpsLoading}
                className="w-full h-12 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
              >
                {gpsLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation size={15} />
                )}
                Activer ma localisation GPS
              </button>

              <div className="flex items-center justify-center gap-2 py-1">
                <span className="h-px bg-surface-200 flex-1" />
                <span className="text-[10px] text-dark-600/40 font-bold uppercase tracking-wider">Ou</span>
                <span className="h-px bg-surface-200 flex-1" />
              </div>

              <button 
                onClick={() => setMode('manual')}
                className="w-full h-12 rounded-2xl border-2 border-surface-200 hover:border-green-600 hover:bg-green-50/10 text-dark-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <MapPin size={15} className="text-green-700" />
                Choisir ma ville manuellement
              </button>
            </div>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {gpsError && (
                <div className="p-3 rounded-2xl bg-red-50 text-red-700 text-[10px] font-bold border border-red-200 leading-normal">
                  ⚠️ Impossible d'accéder au GPS. Veuillez choisir votre ville et quartier manuellement ci-dessous.
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-600/40 uppercase pl-1">Sélectionner votre Ville</label>
                <select 
                  required
                  value={selectedCity}
                  onChange={e => { setSelectedCity(e.target.value); setSelectedQuarter('') }}
                  className="w-full h-11 px-3.5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-green-600 font-semibold text-xs text-dark-800"
                >
                  <option value="">-- Choisir une ville --</option>
                  {Object.keys(BENIN_CITIES).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-dark-600/40 uppercase pl-1">Sélectionner votre Quartier</label>
                <select 
                  required
                  disabled={!selectedCity}
                  value={selectedQuarter}
                  onChange={e => setSelectedQuarter(e.target.value)}
                  className="w-full h-11 px-3.5 bg-surface-50 border border-surface-200 rounded-xl outline-none focus:border-green-600 font-semibold text-xs text-dark-800 disabled:opacity-50"
                >
                  <option value="">-- Choisir un quartier --</option>
                  {selectedCity && BENIN_CITIES[selectedCity].map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                disabled={!selectedCity || !selectedQuarter}
                className="w-full h-11 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none"
              >
                <Check size={14} /> Valider la localisation
              </button>

              <button 
                type="button" 
                onClick={() => setMode('choice')}
                className="w-full text-center text-[10px] font-bold text-dark-600/40 hover:text-green-700 py-1"
              >
                Retour aux choix
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
