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
  let { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

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
      const resAlt = await supabase.storage
        .from(altBucket)
        .upload(path, file, { cacheControl: '3600', upsert: true })
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

// Compresser une image avant upload
export async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}
