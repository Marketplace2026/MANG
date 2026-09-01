import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjYzMjUsImV4cCI6MjA5NTE0MjMyNX0.sOqtvVl0KiHxxJnifiZPexH4ZqZXEFj3HinoI2H1Y_c')

async function test() {
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5)
  console.log('Latest notifications:', data)
}
test()
