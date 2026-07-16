/**
 * MANG — Utilitaire d'Optimisation des Images CDN Supabase (Task F)
 */

// Passez à `true` UNIQUEMENT si l'add-on "Image Transformations" est activé
// sur votre projet Supabase (Project Settings > Add-ons). Sinon laissez à false :
// l'app servira les images brutes (pas de resize/webp automatique, mais ça marche
// sur tous les plans, y compris gratuit).
const SUPABASE_IMAGE_TRANSFORM_ENABLED = false

/**
 * Transforme une URL de stockage public Supabase en URL d'optimisation CDN à la volée.
 *
 * @param {string} url - L'URL d'origine de l'image.
 * @param {object} options - Options d'optimisation (width, height, quality, format, resize).
 * @returns {string} - L'URL optimisée (ou l'URL d'origine si la transformation n'est pas dispo).
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url

  // Si la fonctionnalité n'est pas activée sur le projet Supabase, on ne
  // touche pas à l'URL : mieux vaut une image non optimisée qu'une image cassée.
  if (!SUPABASE_IMAGE_TRANSFORM_ENABLED) return url

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
