const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjYzMjUsImV4cCI6MjA5NTE0MjMyNX0.sOqtvVl0KiHxxJnifiZPexH4ZqZXEFj3HinoI2H1Y_c');

async function test() {
  const { data: profiles } = await supabase.from('profiles').select('id, username').limit(2);
  const user1 = profiles[0];
  const user2 = profiles[1];
  
  const { data: shop } = await supabase.from('shops').select('id, owner_id, name').limit(1).single();

  const payload = {
    p_user_id: user2.id, 
    p_type: 'shop_follow',
    p_title: '👤 Nouveau abonné',
    p_body: '@' + user1.username + ' suit votre boutique "' + shop.name + '"',
    p_reference_id: shop.id, 
    p_reference_type: 'shop'
  };

  const { data, error } = await supabase.rpc('create_notification', payload);
  console.log('RPC error:', error);
  
  const supabaseAdmin = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2NjMyNSwiZXhwIjoyMDk1MTQyMzI1fQ.kKlZNkh2s51sNBr00LthtgxupZ6kwGWESgB2p54hksQ');
  const { data: notifs } = await supabaseAdmin.from('notifications').select('*').eq('user_id', user2.id).order('created_at', { ascending: false }).limit(1);
  console.log('Latest notif:', notifs);
}
test();
