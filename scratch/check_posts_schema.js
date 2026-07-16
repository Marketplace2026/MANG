import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dvpvtytebjywjzarkjoe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjYzMjUsImV4cCI6MjA5NTE0MjMyNX0.sOqtvVl0KiHxxJnifiZPexH4ZqZXEFj3HinoI2H1Y_c'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  try {
    // Let's try to insert a dummy post with image_url and shop_id
    // But since RLS might require authentication, let's check if the error is PGRST204 (column not found) or 42501 (RLS policy violation)
    const { error: errImage } = await supabase
      .from('posts')
      .insert({ image_url: 'test' })
    console.log('Result for image_url:', errImage ? errImage.message : 'Success or other error')

    const { error: errShop } = await supabase
      .from('posts')
      .insert({ shop_id: '00000000-0000-0000-0000-000000000000' })
    console.log('Result for shop_id:', errShop ? errShop.message : 'Success or other error')
  } catch (err) {
    console.error(err)
  }
}

run()
