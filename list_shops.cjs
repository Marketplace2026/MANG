const { createClient } = require('@supabase/supabase-js');
async function test() {
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2NjMyNSwiZXhwIjoyMDk1MTQyMzI1fQ.kKlZNkh2s51sNBr00LthtgxupZ6kwGWESgB2p54hksQ';
  const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', serviceKey);
  const { data: shops } = await supabase.from('shops').select('id, owner_id, name').limit(100);
  console.log('Shops:', shops.map(s => s.name));
}
test();
