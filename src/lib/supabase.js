import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Create a .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Storage buckets
export const BUCKETS = {
  AVATARS: 'avatars',
  COVERS: 'shop-covers',
  PRODUCTS: 'product-images',
  MESSAGES: 'message-files',
}

// Upload avec compression automatique et fallback de bucket
export async function uploadImage(bucket, file, path) {
  const doUpload = (targetBucket) => {
    return Promise.race([
      supabase.storage.from(targetBucket).upload(path, file, { cacheControl: '3600', upsert: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Délai d\'envoi dépassé (connexion trop lente)')), 15000))
    ])
  }

  let { data, error } = await doUpload(bucket).catch(err => ({ data: null, error: err }))

  // Fallback si le bucket porte un nom alternatif dans Supabase
  if (error && (error.message?.includes('not found') || error.statusCode === '404' || error.status === 404)) {
    const fallbackBuckets = {
      'shop-covers': 'covers',
      'covers': 'shop-covers',
      'product-images': 'products',
      'products': 'product-images',
      'message-files': 'messages',
      'messages': 'message-files'
    }
    const altBucket = fallbackBuckets[bucket]
    if (altBucket) {
      console.warn(`[Storage] Bucket '${bucket}' non trouvé, tentative sur '${altBucket}'...`)
      const resAlt = await doUpload(altBucket).catch(err => ({ data: null, error: err }))
      if (!resAlt.error && resAlt.data) {
        const { data: { publicUrl } } = supabase.storage.from(altBucket).getPublicUrl(resAlt.data.path)
        return publicUrl
      }
    }
  }

  if (error) {
    console.error(`[UploadImage Error on ${bucket}]`, error)
    throw error
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return publicUrl
}

// Compresser une image avant upload de manière ultra-rapide et sécurisée
export async function compressImage(file, maxWidth = 650, quality = 0.7) {
  if (!file) return file
  return new Promise((resolve) => {
    // Timeout de sécurité de 3s max
    const timer = setTimeout(() => {
      console.warn('[compressImage] Timeout dépassé, envoi direct du fichier')
      resolve(file)
    }, 3000)

    try {
      const img = new Image()
      img.onerror = (e) => {
        clearTimeout(timer)
        console.warn('[compressImage] Erreur image, fallback fichier', e)
        resolve(file)
      }
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxWidth / (img.width || maxWidth))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * ratio) || img.width
          canvas.height = Math.round(img.height * ratio) || img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            clearTimeout(timer)
            resolve(file)
            return
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              clearTimeout(timer)
              resolve(blob || file)
            },
            'image/jpeg',
            quality
          )
        } catch (err) {
          clearTimeout(timer)
          resolve(file)
        }
      }
      img.src = URL.createObjectURL(file)
    } catch (err) {
      clearTimeout(timer)
      resolve(file)
    }
  })
}
