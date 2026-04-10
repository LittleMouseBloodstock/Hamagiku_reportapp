const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  parseModelJsonResponse,
  normalizeGeneratedText,
  generateGeminiTextWithRetry,
} = require('./generation_utils');
const {
  searchKnowledge,
  loadTranslationRules,
  searchSimilarReports,
} = require('./rag_retrieval');
const {
  buildBaseTerminologyGuard,
  buildRelevantTerminologyContext,
} = require('./equine_terminology');

function buildKnowledgeContext(items = []) {
  return items
    .map((item) => `- [${item.category || 'knowledge'}] ${item.title || 'Untitled'}: ${item.content || ''}`)
    .join('\n');
}

function buildTranslationRuleContext(items = []) {
  return items
    .slice(0, 8)
    .map((item) => `- ${item.source_phrase} => ${item.target_phrase}`)
    .join('\n');
}

function buildSimilarReportContext(items = []) {
  return items
    .slice(0, 3)
    .map((item, index) => `Example ${index + 1}: ${String(item.body || item.final_text || item.generated_text || '').slice(0, 600)}`)
    .join('\n\n');
}

async function buildMonthlyPromptContext(prompt) {
  const [knowledge, translationRules, similarReports] = await Promise.all([
    searchKnowledge({ prompt, limit: 4 }),
    loadTranslationRules(),
    searchSimilarReports({ prompt, limit: 2 }),
  ]);

  return {
    knowledgeContext: buildKnowledgeContext(knowledge),
    translationRuleContext: buildTranslationRuleContext(translationRules),
    similarReportContext: buildSimilarReportContext(similarReports),
    terminologyGuard: [
      buildBaseTerminologyGuard(),
      buildRelevantTerminologyContext(prompt),
    ].filter(Boolean).join('\n'),
  };
}

function normalizeMonthlyResponse(jsonResponse) {
  return {
    ja: normalizeGeneratedText(jsonResponse?.ja || '', 'ja'),
    en: normalizeGeneratedText(jsonResponse?.en || '', 'en'),
  };
}

function normalizeDepartureResponse(jsonResponse) {
  return {
    ja: {
      farrier: normalizeGeneratedText(jsonResponse?.ja?.farrier || '', 'ja'),
      worming: normalizeGeneratedText(jsonResponse?.ja?.worming || '', 'ja'),
      feeding: normalizeGeneratedText(jsonResponse?.ja?.feeding || '', 'ja'),
      exercise: normalizeGeneratedText(jsonResponse?.ja?.exercise || '', 'ja'),
      comment: normalizeGeneratedText(jsonResponse?.ja?.comment || '', 'ja'),
    },
    en: {
      farrier: normalizeGeneratedText(jsonResponse?.en?.farrier || '', 'en'),
      worming: normalizeGeneratedText(jsonResponse?.en?.worming || '', 'en'),
      feeding: normalizeGeneratedText(jsonResponse?.en?.feeding || '', 'en'),
      exercise: normalizeGeneratedText(jsonResponse?.en?.exercise || '', 'en'),
      comment: normalizeGeneratedText(jsonResponse?.en?.comment || '', 'en'),
    },
  };
}

async function generateMonthlyReport({ prompt, apiKey }) {
  if (!apiKey) throw new Error('API Key not configured in Environment Variables');

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  const context = await buildMonthlyPromptContext(prompt);
  const model = dynamicGenAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const systemInstruction = `
  You are a professional racehorse trainer writing owner-facing monthly reports.
  Based on the provided keywords, write a concise monthly report comment.

  Return valid JSON with exactly these keys:
  {
    "ja": "Japanese comment here",
    "en": "English comment here"
  }

  Requirements:
  - Japanese should read like a professional racehorse farm update.
  - English should be natural owner-facing English, not literal translation.
  - Keep JA and EN aligned in meaning.
  - Do not add headings, bullets, notes, diagnosis details, or JSON fragments outside the object.
  - Preserve caution. Do not invent stronger diagnoses than the source supports.
  `;

  const fullPrompt = [
    systemInstruction,
    context.terminologyGuard ? `Terminology guard:\n${context.terminologyGuard}` : '',
    context.knowledgeContext ? `Knowledge context:\n${context.knowledgeContext}` : '',
    context.translationRuleContext ? `Translation rules:\n${context.translationRuleContext}` : '',
    context.similarReportContext ? `Reference style examples:\n${context.similarReportContext}` : '',
    `Keywords:\n${prompt}`,
  ].filter(Boolean).join('\n\n');

  const text = await generateGeminiTextWithRetry(model, fullPrompt);
  const jsonResponse = parseModelJsonResponse(text);
  if (!jsonResponse?.ja || !jsonResponse?.en) {
    throw new Error('Model returned invalid monthly report JSON.');
  }

  return normalizeMonthlyResponse(jsonResponse);
}

async function generateDepartureReport({ notes, apiKey }) {
  if (!apiKey) throw new Error('API Key not configured in Environment Variables');

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  const model = dynamicGenAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const systemInstruction = `
  You are a professional racehorse trainer.
  Based on the provided notes (bullet points or short sentences), generate concise content for a departure report.

  Output valid JSON with exactly this shape and keys:
  {
    "ja": {
      "farrier": "",
      "worming": "",
      "feeding": "",
      "exercise": "",
      "comment": ""
    },
    "en": {
      "farrier": "",
      "worming": "",
      "feeding": "",
      "exercise": "",
      "comment": ""
    }
  }

  Rules:
  - Use Japanese for "ja" and English for "en".
  - If notes do NOT mention a field, return an empty string for that field.
  - Keep each field concise (1-2 sentences maximum).
  - English must match the meaning of Japanese.
  - Do not add diagnosis details or medication details that the source does not explicitly contain.
  - Return only the JSON object.
  `;

  const terminologyGuard = [
    buildBaseTerminologyGuard(),
    buildRelevantTerminologyContext(notes),
  ].filter(Boolean).join('\n');
  const fullPrompt = `${systemInstruction}\n\nTerminology guard:\n${terminologyGuard}\n\nNotes: ${notes}`;

  const text = await generateGeminiTextWithRetry(model, fullPrompt);
  const jsonResponse = parseModelJsonResponse(text);
  if (!jsonResponse?.ja || !jsonResponse?.en) {
    throw new Error('Model returned invalid departure report JSON.');
  }

  return normalizeDepartureResponse(jsonResponse);
}

module.exports = {
  generateMonthlyReport,
  generateDepartureReport,
};
