/**
 * MANG — Utilitaire de Gestion des Livraisons par Ville
 */

export const BENIN_CITIES = [
  'Cotonou',
  'Abomey-Calavi',
  'Porto-Novo',
  'Parakou',
  'Bohicon',
  'Ouidah',
  'Abomey',
  'Allada',
  'Sèmè-Kpodji',
  'Lokossa',
  'Djougou',
  'Natitingou',
  'Dassa-Zoumè',
  'Kandi',
  'Pobè',
  'Malanville',
  'Savalou'
]

const FALLBACK_DELIVERY_TAG = '<!--MANG_DELIVERY_CITIES:'

/**
 * Récupère la liste des villes et tarifs de livraison d'une boutique
 * @param {object} shop 
 * @returns {Array<{city: string, price: number}>}
 */
export function getShopDeliveryCities(shop) {
  if (!shop) return []

  // 1. Si présent directement dans la colonne delivery_cities (format JSONB ou string JSON)
  if (shop.delivery_cities) {
    if (Array.isArray(shop.delivery_cities)) {
      return shop.delivery_cities.filter(c => c && c.city)
    }
    if (typeof shop.delivery_cities === 'string') {
      try {
        const parsed = JSON.parse(shop.delivery_cities)
        if (Array.isArray(parsed)) return parsed.filter(c => c && c.city)
      } catch (e) {}
    }
  }

  // 2. Fallback de sécurité : extrait depuis la description si la colonne n'est pas encore migrée
  if (shop.description && typeof shop.description === 'string' && shop.description.includes(FALLBACK_DELIVERY_TAG)) {
    try {
      const start = shop.description.indexOf(FALLBACK_DELIVERY_TAG) + FALLBACK_DELIVERY_TAG.length
      const end = shop.description.indexOf('-->', start)
      if (end > start) {
        const jsonStr = shop.description.substring(start, end)
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed)) return parsed.filter(c => c && c.city)
      }
    } catch (e) {}
  }

  return []
}

/**
 * Nettoie la description pour retirer le tag de fallback de livraison s'il existe
 */
export function getCleanShopDescription(description) {
  if (!description || typeof description !== 'string') return ''
  const tagIdx = description.indexOf(FALLBACK_DELIVERY_TAG)
  if (tagIdx === -1) return description
  return description.substring(0, tagIdx).trim()
}

/**
 * Encode les villes de livraison pour insertion de secours
 */
export function embedDeliveryCitiesInDescription(description, cities) {
  const clean = getCleanShopDescription(description)
  if (!cities || !cities.length) return clean
  return `${clean}\n\n${FALLBACK_DELIVERY_TAG}${JSON.stringify(cities)}-->`
}

/**
 * Formate un tarif de livraison
 */
export function formatDeliveryPrice(price) {
  const num = Number(price) || 0
  if (num <= 0) return 'Gratuit'
  return `${num.toLocaleString('fr-FR')} FCFA`
}
