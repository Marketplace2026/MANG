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

// Upload avec compression automatique
export async function uploadImage(bucket, file, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })
  if (error) throw error

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
