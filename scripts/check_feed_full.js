const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(path) {
  const text = fs.readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      process.env[m[1]] = m[2];
    }
  }
}

loadEnv('./.env.local');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data, error } = await supabase
    .from('water_logs')
    .select(`
      id, user_id, amount_ml, photo_url, caption, created_at,
      profile:profiles!user_id(display_name, avatar_url),
      reactions(emoji, user_id),
      comments!comments_log_id_fkey(id, body, created_at, user_id, profile:profiles!user_id(display_name, avatar_url))
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Rows:', data.length);
  console.dir(data, { depth: 4 });
})();
