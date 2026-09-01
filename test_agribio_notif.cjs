const { createClient } = require('@supabase/supabase-js');
async function test() {
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2NjMyNSwiZXhwIjoyMDk1MTQyMzI1fQ.kKlZNkh2s51sNBr00LthtgxupZ6kwGWESgB2p54hksQ';
  const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', serviceKey);
  
  const payload = {
    p_user_id: 'd9f97369-ae78-4da2-844c-1c9c97b12445', 
    p_type: 'shop_follow',
    p_title: '👤 Nouveau abonné',
    p_body: 'test suit votre boutique "Agri Bio"',
    p_reference_id: '217a5eff-7d74-49f1-ace7-61657e96b55f',
    p_reference_type: 'shop'
  };

  const { data, error } = await supabase.rpc('create_notification', payload);
  console.log('RPC Error:', error);
  
  const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', payload.p_user_id).order('created_at', { ascending: false }).limit(1);
  console.log('Latest notif:', notifs);
}
test();
