const { chunkText, embedTexts, vectorToSqlLiteral, EMBEDDING_MODEL } = require('./embedding_utils');
const { createSupabaseAdminClient } = require('./supabase_admin');

function buildReportIndexText(report) {
  return [
    report?.title,
    report?.body,
    JSON.stringify(report?.metrics_json || {}),
  ].filter(Boolean).join('\n\n');
}

async function indexReport(reportId) {
  if (!reportId) {
    throw new Error('reportId is required.');
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase admin environment variables are not configured.');
  }

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, horse_id, title, body, metrics_json, created_at')
    .eq('id', reportId)
    .maybeSingle();
  if (reportError) throw reportError;
  if (!report) {
    const error = new Error('Report not found.');
    error.statusCode = 404;
    throw error;
  }

  const chunks = chunkText(buildReportIndexText(report));
  await supabase.from('report_chunks').delete().eq('report_id', report.id);

  if (!chunks.length) {
    return { reportId: report.id, chunks: 0 };
  }

  const embeddings = await embedTexts(chunks);
  const rows = chunks.map((chunk, index) => ({
    report_id: report.id,
    horse_id: report.horse_id || null,
    client_id: null,
    language: 'mixed',
    chunk_text: chunk,
    embedding: vectorToSqlLiteral(embeddings[index] || []),
    metadata: {
      source: 'reports',
      title: report.title,
      embedding_model: EMBEDDING_MODEL,
      indexed_at: new Date().toISOString(),
    },
  }));

  const { error: insertError } = await supabase.from('report_chunks').insert(rows);
  if (insertError) throw insertError;

  return { reportId: report.id, chunks: rows.length };
}

module.exports = {
  indexReport,
};
