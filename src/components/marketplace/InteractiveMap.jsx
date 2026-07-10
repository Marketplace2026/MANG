import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navigation } from 'lucide-react'

export default function InteractiveMap({ shops, userLocation, userCity }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    // S'assurer que Leaflet (window.L) est chargé
    if (!window.L || !mapContainerRef.current) return

    const L = window.L

    // Centrer par défaut sur le Bénin ou sur la position de l'user
    const centerLat = userLocation?.lat || 6.3654
    const centerLon = userLocation?.lon || 2.4183

    // 1. Initialiser la carte si elle n'existe pas
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([centerLat, centerLon], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapRef.current)

      // Ajouter le bouton de contrôle du zoom en bas à droite
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)
    } else {
      // Si la carte existe déjà, recentrer s'il y a un changement de position user
      mapRef.current.setView([centerLat, centerLon])
    }

    const map = mapRef.current

    // 2. Nettoyer les anciens marqueurs
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    // 3. Définir des icônes personnalisées
    // Icône Client (Bleu)
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 bg-blue-500 rounded-full opacity-35 animate-ping"></div>
          <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })

    // Icône Boutique (Verte)
    const shopIcon = (icon) => L.divIcon({
      className: 'custom-shop-marker',
      html: `
        <div class="w-8 h-8 rounded-2xl bg-green-700 border-2 border-white shadow-lg flex items-center justify-center active:scale-95 transition">
          <span class="text-sm">${icon || '🏪'}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })

    // 4. Ajouter le marqueur utilisateur
    if (userLocation?.lat && userLocation?.lon) {
      const userMarker = L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
        .addTo(map)
        .bindPopup(`
          <div class="text-xs font-semibold text-dark-800">
            📍 Vous êtes ici : <br/>
            <span class="text-green-700 font-bold">${userCity || "Votre position"}</span>
          </div>
        `)
      markersRef.current.push(userMarker)
    }

    // 5. Ajouter les boutiques
    const bounds = []
    if (userLocation?.lat && userLocation?.lon) {
      bounds.push([userLocation.lat, userLocation.lon])
    }

    shops.forEach(shop => {
      if (!shop.latitude || !shop.longitude) return

      const pos = [shop.latitude, shop.longitude]
      bounds.push(pos)

      const marker = L.marker(pos, { icon: shopIcon(shop.category?.icon) })
        .addTo(map)
        .bindPopup(`
          <div class="p-1 min-w-[140px] text-dark-800">
            <p class="text-xs font-black leading-tight text-green-800">${shop.name}</p>
            <p class="text-[9px] text-dark-600/60 mt-0.5">${shop.city || "Ville non précisée"}</p>
            ${shop.distance !== undefined && shop.distance !== null ? `
              <span class="inline-block mt-1 bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded">
                📍 à ${shop.distance.toFixed(1)} km
              </span>
            ` : ''}
            <button 
              id="btn-goto-shop-${shop.id}"
              class="w-full h-7 mt-2 bg-green-700 text-white font-bold text-[10px] rounded-lg active:scale-95 transition shadow-sm"
            >
              Voir la boutique
            </button>
          </div>
        `)

      // Écouter l'ouverture du popup pour attacher le clic sur le bouton
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-goto-shop-${shop.id}`)
        if (btn) {
          btn.addEventListener('click', () => {
            navigate(`/boutique/${shop.slug}`)
          })
        }
      })

      markersRef.current.push(marker)
    })

    // 6. Ajuster les limites de la carte pour tout afficher
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [shops, userLocation, userCity])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div className="relative w-full h-[calc(100vh-270px)] min-h-[350px] rounded-3xl overflow-hidden border border-surface-200 shadow-inner bg-surface-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Overlay info rapide */}
      <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none flex justify-between">
        <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-2xl shadow-sm border border-surface-200 flex items-center gap-1.5">
          <Navigation size={12} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold text-dark-800">
            {shops.length} boutique{shops.length > 1 ? 's' : ''} à proximité
          </span>
        </div>
      </div>
    </div>
  )
}
