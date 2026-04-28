const { createSupabaseAdminClient } = require('./supabase_admin');
const { embedText, vectorToSqlLiteral } = require('./embedding_utils');

function createAdminClient() {
  return createSupabaseAdminClient();
}

function tokenize(value) {
  const text = String(value || '').toLowerCase();
  const tokens = new Set();
  const english = text.match(/[a-z][a-z0-9_-]{2,}/g) || [];
  for (const token of english) tokens.add(token);
  const japanese = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]{2,}/gu) || [];
  for (const token of japanese) tokens.add(token);
  return Array.from(tokens);
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = haystack.match(new RegExp(escaped, 'gi'));
  return matches ? matches.length : 0;
}

function computeLexicalScore(queryText, candidateText) {
  const normalizedQuery = String(queryText || '').toLowerCase();
  const normalizedCandidate = String(candidateText || '').toLowerCase();
  if (!normalizedQuery || !normalizedCandidate) return 0;

  let score = 0;
  for (const token of tokenize(normalizedQuery)) {
    const hits = countOccurrences(normalizedCandidate, token);
    if (!hits) continue;
    score += token.length >= 4 ? hits * 3 : hits * 1.5;
  }
  return score;
}

function buildQueryText(params) {
  return JSON.stringify({
    prompt: params?.prompt || '',
    notes: params?.notes || '',
    horseNameJp: params?.horseNameJp || '',
    horseNameEn: params?.horseNameEn || '',
    horseId: params?.horseId || '',
    clientId: params?.clientId || '',
  });
}

function attachRagMeta(items, meta) {
  const result = Array.isArray(items) ? items : [];
  result._ragMeta = meta;
  return result;
}

async function safeSelect(queryBuilder) {
  try {
    const { data, error } = await queryBuilder;
    if (error) return [];
    return data || [];
  } catch (_) {
    return [];
  }
}

async function safeRpc(supabase, fn, args) {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return [];
    return data || [];
  } catch (_) {
    return [];
  }
}

async function tryEmbedQueryText(queryText) {
  try {
    const embedding = await embedText(queryText);
    return vectorToSqlLiteral(embedding);
  } catch (_) {
    return null;
  }
}

async function searchKnowledgeLexical(supabase, params, queryText) {
  const rows = await safeSelect(
    supabase
      .from('domain_knowledge')
      .select('id, category, title, content, language, metadata, updated_at')
      .eq('is_active', true)
      .limit(30)
  );

  return rows
    .map((item) => ({
      ...item,
      similarity: null,
      _score: computeLexicalScore(
        queryText,
        [
          item.title,
          item.content,
          JSON.stringify(item.metadata || {}),
          item.category,
        ].filter(Boolean).join('\n')
      ),
    }))
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, params.limit || 5);
}

async function searchSimilarReportsLexical(supabase, params, queryText) {
  const rows = await safeSelect(
    supabase
      .from('reports')
      .select('id, horse_id, body, metrics_json, created_at')
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)
  );

  return rows
    .map((item) => ({
      report_id: item.id,
      horse_id: item.horse_id,
      client_id: null,
      body: item.body,
      metrics_json: item.metrics_json,
      created_at: item.created_at,
      similarity: null,
      _score: computeLexicalScore(
        queryText,
        [
          item.body,
          JSON.stringify(item.metrics_json || {}),
        ].filter(Boolean).join('\n')
      ),
    }))
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, params.limit || 3);
}

async function searchKnowledge(params = {}) {
  const supabase = createAdminClient();
  if (!supabase) {
    return attachRagMeta([], {
      source: 'unavailable',
      count: 0,
      reason: 'missing_supabase_admin',
    });
  }

  const queryText = buildQueryText(params);
  const embeddedQuery = await tryEmbedQueryText(queryText);

  if (embeddedQuery) {
    const semanticRows = await safeRpc(supabase, 'match_knowledge_chunks', {
      query_embedding_text: embeddedQuery,
      match_count: params.limit || 5,
      filter_language: params.language || 'ja',
      filter_category: params.category || null,
    });

    if (semanticRows.length) {
      return attachRagMeta(semanticRows, {
        source: 'semantic',
        count: semanticRows.length,
      });
    }
  }

  const lexicalRows = await searchKnowledgeLexical(supabase, params, queryText);
  return attachRagMeta(lexicalRows, {
    source: 'lexical',
    count: lexicalRows.length,
    reason: embeddedQuery ? 'semantic_empty' : 'embedding_unavailable',
  });
}

async function loadTranslationRules() {
  const supabase = createAdminClient();
  if (!supabase) return attachRagMeta([], { count: 0, reason: 'missing_supabase_admin' });

  const rows = await safeSelect(
    supabase
      .from('translation_rules')
      .select('id, source_phrase, target_phrase, priority, rule_type, metadata')
      .order('priority', { ascending: true })
      .limit(30)
  );
  return attachRagMeta(rows, { count: rows.length });
}

async function searchSimilarReports(params = {}) {
  const supabase = createAdminClient();
  if (!supabase) {
    return attachRagMeta([], {
      source: 'unavailable',
      count: 0,
      reason: 'missing_supabase_admin',
    });
  }

  const queryText = buildQueryText(params);
  const embeddedQuery = await tryEmbedQueryText(queryText);

  if (embeddedQuery) {
    const semanticRows = await safeRpc(supabase, 'match_report_chunks', {
      query_embedding_text: embeddedQuery,
      match_count: params.limit || 3,
      filter_horse_id: params.horseId || null,
      filter_client_id: params.clientId || null,
    });

    if (semanticRows.length) {
      return attachRagMeta(semanticRows, {
        source: 'semantic',
        count: semanticRows.length,
      });
    }
  }

  const lexicalRows = await searchSimilarReportsLexical(supabase, params, queryText);
  return attachRagMeta(lexicalRows, {
    source: 'lexical',
    count: lexicalRows.length,
    reason: embeddedQuery ? 'semantic_empty' : 'embedding_unavailable',
  });
}

module.exports = {
  searchKnowledge,
  loadTranslationRules,
  searchSimilarReports,
};
