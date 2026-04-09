require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chunkText, embedTexts, vectorToSqlLiteral, EMBEDDING_MODEL } = require('./embedding_utils');

function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Supabase admin environment variables are not configured.');
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseArgs(argv) {
  const args = { scope: 'all', limit: 100, help: false };
  for (const item of argv) {
    if (item === '--help' || item === '-h') args.help = true;
    if (item.startsWith('--scope=')) args.scope = item.split('=')[1] || 'all';
    if (item.startsWith('--limit=')) args.limit = Number(item.split('=')[1] || '100');
  }
  return args;
}

async function rebuildKnowledgeChunks(supabase, args) {
  const { data, error } = await supabase
    .from('domain_knowledge')
    .select('id, workspace_id, title, content, language, category, metadata')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(args.limit);

  if (error) throw error;

  let processed = 0;
  for (const item of data || []) {
    const chunks = chunkText([item.title, item.content].filter(Boolean).join('\n\n'));
    await supabase.from('knowledge_chunks').delete().eq('knowledge_id', item.id);
    if (chunks.length === 0) continue;

    const embeddings = await embedTexts(chunks);
    const rows = chunks.map((chunk, index) => ({
      knowledge_id: item.id,
      workspace_id: item.workspace_id || null,
      chunk_text: chunk,
      embedding: vectorToSqlLiteral(embeddings[index] || []),
      metadata: {
        language: item.language,
        category: item.category,
        source: 'domain_knowledge',
        embedding_model: EMBEDDING_MODEL,
      },
    }));

    const { error: insertError } = await supabase.from('knowledge_chunks').insert(rows);
    if (insertError) throw insertError;
    processed += 1;
    console.log(`knowledge ${processed}: ${item.id}`);
  }

  return processed;
}

async function rebuildReportChunks(supabase, args) {
  const { data, error } = await supabase
    .from('reports')
    .select('id, horse_id, client_id, title, body, metrics_json, created_at')
    .not('body', 'is', null)
    .order('created_at', { ascending: false })
    .limit(args.limit);

  if (error) throw error;

  let processed = 0;
  for (const item of data || []) {
    const baseText = [
      item.title,
      item.body,
      JSON.stringify(item.metrics_json || {}),
    ].filter(Boolean).join('\n\n');
    const chunks = chunkText(baseText);
    await supabase.from('report_chunks').delete().eq('report_id', item.id);
    if (chunks.length === 0) continue;

    const embeddings = await embedTexts(chunks);
    const rows = chunks.map((chunk, index) => ({
      report_id: item.id,
      horse_id: item.horse_id || null,
      client_id: item.client_id || null,
      language: 'mixed',
      chunk_text: chunk,
      embedding: vectorToSqlLiteral(embeddings[index] || []),
      metadata: {
        source: 'reports',
        title: item.title,
        embedding_model: EMBEDDING_MODEL,
      },
    }));

    const { error: insertError } = await supabase.from('report_chunks').insert(rows);
    if (insertError) throw insertError;
    processed += 1;
    console.log(`report ${processed}: ${item.id}`);
  }

  return processed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log([
      'Usage:',
      '  node backfill_semantic_embeddings.js [--scope=all|knowledge|reports] [--limit=100]',
    ].join('\n'));
    return;
  }

  const supabase = createAdminClient();
  const result = { knowledge: 0, reports: 0, scope: args.scope };

  if (args.scope === 'all' || args.scope === 'knowledge') {
    result.knowledge = await rebuildKnowledgeChunks(supabase, args);
  }
  if (args.scope === 'all' || args.scope === 'reports') {
    result.reports = await rebuildReportChunks(supabase, args);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
