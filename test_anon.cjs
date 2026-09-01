const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const anonKey = envFile.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY=')).split('=')[1].trim();

async function test() {
  const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', anonKey);
  
  const payload = {
    p_user_id: 'd9f97369-ae78-4da2-844c-1c9c97b12445', 
    p_type: 'shop_follow',
    p_title: '👤 Nouveau abonné',
    p_body: 'test suit votre boutique',
    p_reference_id: '217a5eff-7d74-49f1-ace7-61657e96b55f',
    p_reference_type: 'shop'
  };

  const { error } = await supabase.rpc('create_notification', payload);
  console.log('RPC Error using Anon Key:', error);
}
test();
