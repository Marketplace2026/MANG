/**
 * MANG — Local-First Cache Engine (SWR - Stale While Revalidate)
 * Inspiré de l'architecture offline / haute vitesse de WhatsApp et Facebook.
 */

// Cache en mémoire volatile (accès en 0.001 ms)
const memoryCache = new Map()

export const mangCache = {
  get(key, maxAgeMs = 15 * 60 * 1000) { // 15 min par défaut
    // 1. Essai en mémoire vive (RAM)
    if (memoryCache.has(key)) {
      const item = memoryCache.get(key)
      if (Date.now() - item.timestamp < maxAgeMs) {
        return item.data
      }
    }

    // 2. Essai en LocalStorage persistant
    try {
      const raw = localStorage.getItem(`mang_cache_${key}`)
      if (!raw) return null
      const item = JSON.parse(raw)
      if (Date.now() - item.timestamp < maxAgeMs) {
        // Restaurer en RAM
        memoryCache.set(key, item)
        return item.data
      }
    } catch (_) {}

    return null
  },

  set(key, data) {
    const entry = { data, timestamp: Date.now() }
    memoryCache.set(key, entry)
    try {
      localStorage.setItem(`mang_cache_${key}`, JSON.stringify(entry))
    } catch (_) {
      // Si quota dépassé, on garde seulement en RAM
    }
  },

  clear(key) {
    memoryCache.delete(key)
    try {
      localStorage.removeItem(`mang_cache_${key}`)
    } catch (_) {}
  }
}
