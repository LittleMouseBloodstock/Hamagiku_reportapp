const { createClient } = require('@supabase/supabase-js');

function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) return null;

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
  });
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

async function searchKnowledge(params = {}) {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const queryText = buildQueryText(params);
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
      _score: computeLexicalScore(queryText, [
        item.title,
        item.content,
        JSON.stringify(item.metadata || {}),
        item.category,
      ].filter(Boolean).join('\n')),
    }))
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, params.limit || 5);
}

async function loadTranslationRules() {
  const supabase = createAdminClient();
  if (!supabase) return [];

  return safeSelect(
    supabase
      .from('translation_rules')
      .select('id, source_phrase, target_phrase, priority, rule_type, metadata')
      .order('priority', { ascending: true })
      .limit(30)
  );
}

async function searchSimilarReports(params = {}) {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const queryText = buildQueryText(params);
  const rows = await safeSelect(
    supabase
      .from('report_documents')
      .select('id, final_text, generated_text, metadata, created_at')
      .not('final_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)
  );

  return rows
    .map((item) => ({
      ...item,
      _score: computeLexicalScore(queryText, [
        item.final_text,
        item.generated_text,
        JSON.stringify(item.metadata || {}),
      ].filter(Boolean).join('\n')),
    }))
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, params.limit || 3);
}

module.exports = {
  searchKnowledge,
  loadTranslationRules,
  searchSimilarReports,
};
