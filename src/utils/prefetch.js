/**
 * MANG — Utilitaire de Préchargement Prédictif (Route & Data Prefetcher)
 * Permet d'éliminer toute latence au clic sur les onglets du bas (façon WhatsApp / Facebook).
 */

const prefetchedModules = new Set()

export function prefetch(moduleName, importer) {
  if (typeof window === 'undefined' || prefetchedModules.has(moduleName)) return

  const run = () => {
    if (prefetchedModules.has(moduleName)) return
    prefetchedModules.add(moduleName)
    try {
      importer()
    } catch (_) {}
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 4000 })
  } else {
    setTimeout(run, 1200)
  }
}

export function prefetchImmediate(moduleName, importer) {
  if (prefetchedModules.has(moduleName)) return
  prefetchedModules.add(moduleName)
  try {
    importer()
  } catch (_) {}
}
