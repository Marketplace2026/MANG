const { createClient } = require('@supabase/supabase-js');
async function test() {
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjYzMjUsImV4cCI6MjA5NTE0MjMyNX0.sOqtvVl0KiHxxJnifiZPexH4ZqZXEFj3HinoI2H1Y_c';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2NjMyNSwiZXhwIjoyMDk1MTQyMzI1fQ.kKlZNkh2s51sNBr00LthtgxupZ6kwGWESgB2p54hksQ';
  
  const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', serviceKey);
  const { data: shops } = await supabase.from('shops').select('id, owner_id, name').limit(100);
  
  const agribio = shops ? shops.find(s => s.name.toLowerCase().includes('agri')) : null;
  console.log('Shop found:', agribio);
  
  if (agribio) {
    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', agribio.owner_id).order('created_at', { ascending: false }).limit(5);
    console.log('Notifs for owner:', notifs);
  }
}
test();
