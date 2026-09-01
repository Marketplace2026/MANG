import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://dvpvtytebjywjzarkjoe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjYzMjUsImV4cCI6MjA5NTE0MjMyNX0.sOqtvVl0KiHxxJnifiZPexH4ZqZXEFj3HinoI2H1Y_c'
)

async function test() {
  const { data: user } = await supabase.from('profiles').select('id').limit(1).single()
  console.log('Testing with user:', user?.id)
  
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: user.id,
    p_type: 'shop_follow',
    p_title: 'Test',
    p_body: 'Test body',
    p_reference_id: user.id,
    p_reference_type: 'shop'
  })
  
  console.log('RPC create_notification error:', error)
  console.log('RPC create_notification data:', data)
}

test()
