const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const anonKey = envFile.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY=')).split('=')[1].trim();

async function test() {
  const supabase = createClient('https://dvpvtytebjywjzarkjoe.supabase.co', anonKey);
  const { data, error } = await supabase.rpc('create_notification', { p_user_id: 'd9f97369-ae78-4da2-844c-1c9c97b12445', p_type: 'invalid_type', p_title: 'Test', p_body: 'Test' });
  console.log('Result with invalid type:', error);
}
test();
