const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
  parseModelJsonResponse,
  normalizeGeneratedText,
  generateGeminiTextWithRetry,
} = require('./generation_utils');
const {
  searchKnowledge,
  loadTranslationRules,
} = require('./rag_retrieval');
const {
  buildBaseTerminologyGuard,
  buildRelevantTerminologyContext,
} = require('./equine_terminology');
const { GENERATION_MODEL } = require('./gemini_model_config');

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

function buildTranslationKnowledgeContext(items = []) {
  return items
    .slice(0, 4)
    .map((item) => `- [${item.category || 'knowledge'}] ${item.title || 'Untitled'}: ${item.content || ''}`)
    .join('\n');
}

function buildSafetyTerminologyGuard() {
  return [
    '- Never introduce a diagnosis, medication, dosage, or veterinary conclusion unless it is explicitly stated in the source notes.',
    '- Treat RAG knowledge as terminology guidance only; never copy factual details into the output unless the source notes also state them.',
    '- Preserve uncertainty and timing. Do not turn a plan, observation, follow-up, or reassuring finding into a completed result, guarantee, or stronger assertion.',
  ].join('\n');
}

async function buildMonthlyPromptContext(prompt) {
  const [knowledge, translationRules] = await Promise.all([
    searchKnowledge({
      prompt,
      limit: 4,
      excludeCategories: ['departure_report'],
    }),
    loadTranslationRules(),
  ]);

  console.log(JSON.stringify({
    event: 'rag.monthly_context',
    promptLength: String(prompt || '').length,
    knowledgeSource: knowledge?._ragMeta?.source || 'unknown',
    knowledgeCount: knowledge?._ragMeta?.count ?? knowledge.length ?? 0,
    knowledgeReason: knowledge?._ragMeta?.reason || null,
    translationRuleCount: translationRules?._ragMeta?.count ?? translationRules.length ?? 0,
    translationRuleReason: translationRules?._ragMeta?.reason || null,
    knowledgeTitles: (knowledge || []).map((item) => item.title).slice(0, 4),
  }));

  return {
    knowledgeContext: buildKnowledgeContext(knowledge),
    translationRuleContext: buildTranslationRuleContext(translationRules),
    terminologyGuard: [
      buildBaseTerminologyGuard(),
      buildRelevantTerminologyContext(prompt),
      buildSafetyTerminologyGuard(),
    ].filter(Boolean).join('\n'),
  };
}

async function buildStructuredReportPromptContext(prompt, reportType) {
  const excludeCategories = reportType === 'status' ? ['departure_report'] : [];
  const [knowledge, translationRules] = await Promise.all([
    searchKnowledge({
      prompt,
      limit: 6,
      excludeCategories,
    }),
    loadTranslationRules(),
  ]);

  console.log(JSON.stringify({
    event: `rag.${reportType}_context`,
    reportType,
    promptLength: String(prompt || '').length,
    knowledgeSource: knowledge?._ragMeta?.source || 'unknown',
    knowledgeCount: knowledge?._ragMeta?.count ?? knowledge.length ?? 0,
    knowledgeReason: knowledge?._ragMeta?.reason || null,
    translationRuleCount: translationRules?._ragMeta?.count ?? translationRules.length ?? 0,
    translationRuleReason: translationRules?._ragMeta?.reason || null,
    knowledgeTitles: (knowledge || []).map((item) => item.title).slice(0, 6),
  }));

  return {
    knowledgeContext: buildKnowledgeContext(knowledge),
    translationRuleContext: buildTranslationRuleContext(translationRules),
    terminologyGuard: [
      buildBaseTerminologyGuard(),
      buildRelevantTerminologyContext(prompt),
      buildSafetyTerminologyGuard(),
    ].filter(Boolean).join('\n'),
  };
}

async function buildTranslationPromptContext(text, targetLang, reportType) {
  const language = targetLang === 'ja' ? 'ja' : 'en';
  const normalizedReportType = reportType === 'care' || reportType === 'status' ? reportType : null;
  const [knowledge, translationRules] = await Promise.all([
    searchKnowledge({
      prompt: text,
      limit: 4,
      language,
      excludeCategories: ['departure_report'],
    }),
    loadTranslationRules(),
  ]);

  console.log(JSON.stringify({
    event: 'rag.translate_context',
    targetLang: language,
    reportType: normalizedReportType,
    textLength: String(text || '').length,
    knowledgeSource: knowledge?._ragMeta?.source || 'unknown',
    knowledgeCount: knowledge?._ragMeta?.count ?? knowledge.length ?? 0,
    knowledgeReason: knowledge?._ragMeta?.reason || null,
    translationRuleCount: translationRules?._ragMeta?.count ?? translationRules.length ?? 0,
    translationRuleReason: translationRules?._ragMeta?.reason || null,
    knowledgeTitles: (knowledge || []).map((item) => item.title).slice(0, 4),
  }));

  return {
    knowledgeContext: buildTranslationKnowledgeContext(knowledge),
    translationRuleContext: buildTranslationRuleContext(translationRules),
    terminologyGuard: [
      buildBaseTerminologyGuard(),
      buildRelevantTerminologyContext(text),
      buildSafetyTerminologyGuard(),
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

function normalizeStatusResponse(jsonResponse) {
  const normalizeSection = (language) => ({
    assessment: normalizeGeneratedText(jsonResponse?.[language]?.assessment || '', language),
    management: normalizeGeneratedText(jsonResponse?.[language]?.management || '', language),
    nextSteps: normalizeGeneratedText(
      jsonResponse?.[language]?.nextSteps || jsonResponse?.[language]?.next_steps || '',
      language
    ),
    comment: normalizeGeneratedText(jsonResponse?.[language]?.comment || '', language),
  });

  return {
    ja: normalizeSection('ja'),
    en: normalizeSection('en'),
  };
}

function hasValidStructuredSections(jsonResponse, fields) {
  return ['ja', 'en'].every((language) => {
    const section = jsonResponse?.[language];
    return section
      && typeof section === 'object'
      && !Array.isArray(section)
      && fields.every((field) => (
        field === 'nextSteps'
          ? typeof (section.nextSteps ?? section.next_steps) === 'string'
          : typeof section[field] === 'string'
      ));
  });
}

async function generateMonthlyReport({ prompt, apiKey }) {
  if (!apiKey) throw new Error('API Key not configured in Environment Variables');

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  const context = await buildMonthlyPromptContext(prompt);
  const model = dynamicGenAI.getGenerativeModel({
    model: GENERATION_MODEL,
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
    `Keywords:\n${prompt}`,
  ].filter(Boolean).join('\n\n');

  const text = await generateGeminiTextWithRetry(model, fullPrompt);
  const jsonResponse = parseModelJsonResponse(text);
  if (!jsonResponse?.ja || !jsonResponse?.en) {
    throw new Error('Model returned invalid monthly report JSON.');
  }

  return normalizeMonthlyResponse(jsonResponse);
}

async function generateDepartureReport({ notes, reportType, apiKey }) {
  if (!apiKey) throw new Error('API Key not configured in Environment Variables');

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  const model = dynamicGenAI.getGenerativeModel({
    model: GENERATION_MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const normalizedReportType = reportType === 'status' ? 'status' : 'departure';
  const context = await buildStructuredReportPromptContext(notes, normalizedReportType);
  const isStatusReport = normalizedReportType === 'status';

  const systemInstruction = isStatusReport
    ? `
  You are a professional racehorse trainer writing an owner-facing current-status report.
  Based only on the provided notes (bullet points or short sentences), generate concise structured content in Japanese and English.

  Output valid JSON with exactly this shape and keys:
  {
    "ja": {
      "assessment": "",
      "management": "",
      "nextSteps": "",
      "comment": ""
    },
    "en": {
      "assessment": "",
      "management": "",
      "nextSteps": "",
      "comment": ""
    }
  }

  Rules:
  - "assessment" contains only the current condition or observations explicitly stated in the notes.
  - "management" contains only care, treatment, feeding, or exercise explicitly stated in the notes.
  - "nextSteps" contains only future plans or follow-up explicitly stated in the notes; return an empty string when none is stated.
  - "comment" is a concise overall summary based only on the notes; do not add new facts.
  - Use Japanese for "ja" and English for "en", with aligned meaning.
  - Keep each field concise (1-2 sentences maximum) and return empty strings for unsupported fields.
  - Do not add diagnosis, medication, dosage, or strong conclusions that the source does not explicitly contain.
  - Return only the JSON object.
  `
    : `
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

  const fullPrompt = [
    systemInstruction,
    `Terminology guard:\n${context.terminologyGuard}`,
    context.knowledgeContext ? `Knowledge context:\n${context.knowledgeContext}` : '',
    context.translationRuleContext ? `Translation rules:\n${context.translationRuleContext}` : '',
    `Notes:\n${notes}`,
  ].filter(Boolean).join('\n\n');

  const text = await generateGeminiTextWithRetry(model, fullPrompt);
  const jsonResponse = parseModelJsonResponse(text);
  const expectedFields = isStatusReport
    ? ['assessment', 'management', 'nextSteps', 'comment']
    : ['farrier', 'worming', 'feeding', 'exercise', 'comment'];
  if (!hasValidStructuredSections(jsonResponse, expectedFields)) {
    throw new Error(`Model returned invalid ${isStatusReport ? 'status' : 'departure'} report JSON.`);
  }

  return isStatusReport ? normalizeStatusResponse(jsonResponse) : normalizeDepartureResponse(jsonResponse);
}

async function translateReportText({ text, targetLang, reportType, apiKey }) {
  if (!apiKey) throw new Error('API Key not configured in Environment Variables');

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  const model = dynamicGenAI.getGenerativeModel({ model: GENERATION_MODEL });
  const context = await buildTranslationPromptContext(text, targetLang, reportType);
  const normalizedReportType = reportType === 'care' || reportType === 'status' ? reportType : null;

  const instruction = targetLang === 'ja'
    ? [
      '以下のテキストを、日本の競馬レポート向けの自然な日本語に翻訳してください。',
      '出力は翻訳文のみ。',
      '解説、補足、注釈、見出し、箇条書き、引用符、前置き、後書きは一切不要です。',
      '入力が1段落なら出力も1段落にしてください。',
      '文体は馬主体の近況レポートに寄せてください。',
      '距離、ペース、脚元、鞍下、坂路などの競走馬文脈の用語は与えられたルールと知識コンテキストを優先してください。',
      normalizedReportType ? `${normalizedReportType}記録として、入力の事実・不確実性・予定を保ったまま翻訳してください。` : ''
    ].join('\n')
    : [
      'Translate the following text into natural English for a horse racing report.',
      'Return only the translated text.',
      'Do not add explanations, notes, headings, bullet points, quotation marks, or extra commentary.',
      'If the input is a single paragraph, return a single paragraph.',
      'Use owner-facing racehorse report wording.',
      'Prioritize the supplied terminology rules and knowledge context for equine-specific terms, training descriptions, and phrasing.',
      normalizedReportType ? `Treat this as a ${normalizedReportType} record. Preserve the source facts, uncertainty, and planned actions exactly.` : ''
    ].join('\n');

  const fullPrompt = [
    instruction,
    context.terminologyGuard ? `Terminology guard:\n${context.terminologyGuard}` : '',
    context.translationRuleContext ? `Translation rules:\n${context.translationRuleContext}` : '',
    context.knowledgeContext ? `Knowledge context:\n${context.knowledgeContext}` : '',
    `Text:\n${text}`,
  ].filter(Boolean).join('\n\n');

  const translatedText = (await generateGeminiTextWithRetry(model, fullPrompt)).trim();
  if (!translatedText) {
    throw new Error('Model returned empty translation text.');
  }
  return { translatedText: normalizeGeneratedText(translatedText, targetLang === 'ja' ? 'ja' : 'en') };
}

module.exports = {
  generateMonthlyReport,
  generateDepartureReport,
  translateReportText,
};
