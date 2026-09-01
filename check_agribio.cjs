const { createClient } = require('@supabase/supabase-js');
async function test() {
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2NjMyNSwiZXhwIjoyMDk1MTQyMzI1fQ.kKlZNkh2s51sNBr00LthtgxupZ6kwGWESgB2p54hksQ';
  const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', serviceKey);
  const { data: shops } = await supabase.from('shops').select('id, owner_id, name').eq('name', 'Agri Bio').limit(1);
  if (shops && shops.length > 0) {
    const ownerId = shops[0].owner_id;
    console.log('Agri Bio Owner ID:', ownerId);
    
    // Check their latest notifications
    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(5);
    console.log('Notifs:', notifs);
    
    // Check shop followers
    const { data: followers } = await supabase.from('shop_followers').select('*').eq('shop_id', shops[0].id);
    console.log('Followers in DB:', followers);
  }
}
test();
