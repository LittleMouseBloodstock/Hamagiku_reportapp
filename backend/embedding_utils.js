const { GoogleGenerativeAI } = require('@google/generative-ai');

const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || '1536');

function getEmbeddingClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
}

function chunkText(text, maxChars = 700, overlapChars = 120) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + maxChars);
    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }
  return chunks.filter(Boolean);
}

function vectorToSqlLiteral(values) {
  if (!Array.isArray(values)) {
    throw new Error('Embedding values must be an array.');
  }
  return `[${values.join(',')}]`;
}

function normalizeEmbeddingDimensions(values) {
  if (!Array.isArray(values)) return [];
  if (values.length === EMBEDDING_DIMENSIONS) return values;
  if (values.length > EMBEDDING_DIMENSIONS) return values.slice(0, EMBEDDING_DIMENSIONS);
  return values.concat(Array.from({ length: EMBEDDING_DIMENSIONS - values.length }, () => 0));
}

async function embedText(text) {
  const model = getEmbeddingClient();
  const response = await model.embedContent(text);
  const values = response?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Embedding response did not include values.');
  }
  return normalizeEmbeddingDimensions(values);
}

async function embedTexts(texts) {
  const items = (texts || []).map((text) => String(text || '').trim()).filter(Boolean);
  if (items.length === 0) return [];

  const model = getEmbeddingClient();
  const response = await model.batchEmbedContents({
    requests: items.map((text) => ({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    })),
  });

  const embeddings = response?.embeddings || [];
  return embeddings.map((item) => normalizeEmbeddingDimensions(item?.values || []));
}

module.exports = {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  chunkText,
  vectorToSqlLiteral,
  embedText,
  embedTexts,
};
