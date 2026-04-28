const { createClient } = require('@supabase/supabase-js');

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function buildKey(row) {
  return [
    String(row.source_phrase || '').trim().toLowerCase(),
    String(row.target_phrase || '').trim().toLowerCase(),
    String(row.rule_type || '').trim().toLowerCase(),
    String(row.metadata?.scope || '').trim().toLowerCase(),
  ].join('::');
}

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('translation_rules')
    .select('id, source_phrase, target_phrase, priority, rule_type, metadata, created_at')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const keep = new Set();
  const remove = [];
  for (const row of data || []) {
    const key = buildKey(row);
    if (!key || keep.has(key)) {
      remove.push(row.id);
      continue;
    }
    keep.add(key);
  }

  if (!remove.length) {
    console.log(JSON.stringify({ total: data.length, removed: 0, kept: data.length }));
    return;
  }

  const { error: deleteError } = await supabase
    .from('translation_rules')
    .delete()
    .in('id', remove);

  if (deleteError) throw deleteError;

  console.log(JSON.stringify({ total: data.length, removed: remove.length, kept: data.length - remove.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
