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

const envPath = './.env.local';
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found');
  process.exit(1);
}
loadEnv(envPath);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  try {
    const { data, error } = await supabase
      .from('water_logs')
      .select('id, user_id, amount_ml, caption, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }
    console.log('Fetched', (data || []).length, 'rows. Sample:');
    console.log(data);
  } catch (e) {
    console.error('Unexpected error', e);
    process.exit(1);
  }
})();
