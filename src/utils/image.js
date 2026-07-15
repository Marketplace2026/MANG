/**
 * MANG — Utilitaire d'Optimisation des Images CDN Supabase (Task F)
 */

/**
 * Transforme une URL de stockage public Supabase en URL d'optimisation CDN à la volée.
 * 
 * @param {string} url - L'URL d'origine de l'image.
 * @param {object} options - Options d'optimisation (width, height, quality, format, resize).
 * @returns {string} - L'URL optimisée.
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url

  // Si l'URL appartient au stockage Supabase
  if (url.includes('/storage/v1/object/public/')) {
    const {
      width,
      height,
      quality = 80,
      format = 'webp',
      resize = 'cover'
    } = options

    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    const params = new URLSearchParams()
    
    if (width) params.append('width', width.toString())
    if (height) params.append('height', height.toString())
    if (quality) params.append('quality', quality.toString())
    if (format) params.append('format', format)
    if (resize) params.append('resize', resize)

    return `${renderUrl}?${params.toString()}`
  }

  return url
}
