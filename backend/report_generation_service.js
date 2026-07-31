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

function normalizeStatusNarrative(text) {
  return String(text || '')
    .replace(/```(?:json|markdown)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*#+\s*/gm, '')
    .replace(/^\s*"(?:report|narrative)"\s*:\s*/gim, '')
    .replace(/^[>"'`]+|[>"'`]+$/gm, '')
    .replace(/\r\n/g, '\n')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildLegacyStatusNarrative(section, language) {
  const headings = language === 'ja'
    ? [
      ['assessment', '現在の状態'],
      ['management', '治療・管理'],
      ['nextSteps', '今後の方針'],
      ['comment', '総括'],
    ]
    : [
      ['assessment', 'Current condition'],
      ['management', 'Treatment and management'],
      ['nextSteps', 'Next steps'],
      ['comment', 'Summary'],
    ];
  const separator = language === 'ja' ? '．' : '. ';

  return headings
    .map(([field, heading]) => ({
      heading,
      body: String(
        field === 'nextSteps'
          ? section?.nextSteps ?? section?.next_steps ?? ''
          : section?.[field] ?? ''
      ).trim(),
    }))
    .filter((item) => item.body)
    .map((item, index) => `${index + 1}${separator}${item.heading}\n${item.body}`)
    .join('\n\n');
}

function normalizeStatusResponse(jsonResponse) {
  const normalizeLanguage = (language) => {
    const section = jsonResponse?.[language];
    const report = typeof section === 'string'
      ? section
      : section?.report || section?.narrative || buildLegacyStatusNarrative(section, language);
    return { report: normalizeStatusNarrative(report) };
  };

  return {
    ja: normalizeLanguage('ja'),
    en: normalizeLanguage('en'),
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

function hasValidStatusNarratives(jsonResponse) {
  return ['ja', 'en'].every((language) => {
    const section = jsonResponse?.[language];
    if (typeof section === 'string') return Boolean(section.trim());
    return Boolean(
      section
      && typeof section === 'object'
      && !Array.isArray(section)
      && typeof (section.report ?? section.narrative) === 'string'
      && String(section.report ?? section.narrative).trim()
    );
  });
}

function hasValidStatusDraft(jsonResponse) {
  return hasValidStatusNarratives(jsonResponse)
    || hasValidStructuredSections(
      jsonResponse,
      ['assessment', 'management', 'nextSteps', 'comment']
    );
}

function buildStatusSystemInstruction() {
  return `
  Role:
  You write owner- and trainer-facing racehorse treatment and diagnostic progress reports.

  Goal:
  Reorganize the source notes into one complete chronological report in Japanese and English without changing, merging away, or inventing medical facts.

  Return valid JSON with exactly this shape:
  {
    "ja": {
      "report": "1．見出し\\n本文..."
    },
    "en": {
      "report": "1. Heading\\nBody..."
    }
  }

  Non-negotiable fidelity rules:
  - The source notes are the sole authority for facts. RAG knowledge and translation rules may guide terminology only.
  - When a later sentence explicitly corrects or clarifies an earlier statement, use the later correction and do not repeat the superseded statement as fact.
  - Apply a correction silently in the final report. Do not say "correction", "previous report", or similar unless the source explicitly asks for that disclosure.
  - Preserve every distinct treatment, management period, examination, diagnostic block, image finding, result, and planned action that is stated in the source.
  - Preserve chronology, laterality, bilateral versus unilateral findings, anatomical level, modality, clinician or facility wording, duration, response, uncertainty, and pending status.
  - Keep separately performed procedures as separate events with their individual results. Do not collapse them into a broad summary.
  - For each diagnostic nerve block, use a separate sentence that states its exact name, described anatomical level or region, limb scope, and individual outcome.
  - Translate anatomical detail supplied in either source language into both reports; do not omit a parenthetical clarification just because it is written in the other language.
  - Preserve named procedures exactly as written. For example, Low palmar nerve block, High palmar nerve block, and sub-carpal nerve block are not interchangeable. Never replace one with another.
  - In Japanese, retain an English technical procedure name when it appears in the source and add a concise Japanese explanation only when useful.
  - Do not invent a veterinarian's first name, facility name, diagnosis, anatomical interpretation, causal conclusion, treatment, dosage, contact route, or sign-off.
  - Preserve uncertainty such as suspected, possible, awaiting, or no significant abnormality. Do not strengthen or weaken it.

  Structure and style:
  - Produce one continuous report with numbered section headings and paragraphs, not assessment/management/nextSteps/comment cards.
  - Use only as many sections as the source supports, normally 3 to 7, in chronological order.
  - Keep distinct phases in distinct sections when present: treatment and management, distal examinations, diagnostic anaesthesia or nerve blocks, proximal imaging, and current status or next steps.
  - The final section should state the current status and next steps when those facts are present.
  - Each Japanese heading line must start with "1．", "2．", and so on. Each English heading line must start with "1.", "2.", and so on.
  - Do not use Markdown headings, bullets, tables, a duplicate summary, or a generic comment section.
  - Be concise, but completeness and factual fidelity take priority. There is no 1-2 sentence limit.
  - Keep the Japanese and English reports aligned section by section and fact by fact.

  Before returning JSON, silently compare every source statement and every later correction against both reports. Repair any omission, substitution, changed result, changed anatomical location, changed laterality, or invented detail.
  Return only the JSON object.
  `;
}

function buildStatusFidelityRepairPrompt({
  notes,
  draft,
  terminologyGuard,
  translationRuleContext,
}) {
  return `
  Role:
  You are the final factual fidelity checker for a bilingual racehorse treatment and diagnostic progress report.

  Goal:
  Compare the complete multilingual source notes with the Japanese and English draft. Return a corrected draft in which both languages preserve every supported fact and no unsupported fact remains.

  Return valid JSON with exactly this shape:
  {
    "ja": {
      "report": "1．見出し\\n本文..."
    },
    "en": {
      "report": "1. Heading\\nBody..."
    }
  }

  Required checks:
  - Treat all languages in the source notes as one evidence set. A fact written only in Japanese must also be represented in English, and vice versa.
  - Apply later explicit corrections silently. Remove the superseded fact and do not mention that a correction or previous report existed.
  - Preserve chronology, duration, laterality, limb scope, anatomical level, modality, named procedure, clinician or facility wording, each individual result, uncertainty, and pending plan.
  - Keep Low palmar nerve block, High palmar nerve block, and sub-carpal nerve block distinct. Never substitute or collapse them.
  - For every diagnostic nerve block, use a separate sentence in both languages that includes the exact procedure name, the source-described anatomical region or level, and that block's own result.
  - Do not add a first name, renamed facility, diagnosis, anatomical interpretation, causal conclusion, treatment, contact route, or sign-off that is absent from the source.
  - Keep the unified numbered-section layout. Do not return assessment/management/nextSteps/comment fields.
  - If the draft already satisfies a source fact, preserve it. Change only what is needed for fidelity and aligned meaning.

  ${terminologyGuard ? `Terminology guard:\n${terminologyGuard}` : ''}
  ${translationRuleContext ? `Translation rules:\n${translationRuleContext}` : ''}

  Source notes:
  ${notes}

  Draft to verify and repair:
  ${JSON.stringify(draft)}

  Return only the corrected JSON object.
  `;
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
    ? buildStatusSystemInstruction()
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
  const isValid = isStatusReport
    ? hasValidStatusDraft(jsonResponse)
    : hasValidStructuredSections(jsonResponse, ['farrier', 'worming', 'feeding', 'exercise', 'comment']);
  if (!isValid) {
    throw new Error(`Model returned invalid ${isStatusReport ? 'status' : 'departure'} report JSON.`);
  }

  if (isStatusReport) {
    const draft = normalizeStatusResponse(jsonResponse);
    const repairPrompt = buildStatusFidelityRepairPrompt({
      notes,
      draft,
      terminologyGuard: context.terminologyGuard,
      translationRuleContext: context.translationRuleContext,
    });
    const repairedText = await generateGeminiTextWithRetry(model, repairPrompt);
    const repairedJson = parseModelJsonResponse(repairedText);
    if (!hasValidStatusNarratives(repairedJson)) {
      throw new Error('Model returned invalid status report JSON during fidelity verification.');
    }
    return normalizeStatusResponse(repairedJson);
  }

  return normalizeDepartureResponse(jsonResponse);
}

async function translateReportText({ text, targetLang, reportType, apiKey }) {
  if (!apiKey) throw new Error('API Key not configured in Environment Variables');

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);
  const model = dynamicGenAI.getGenerativeModel({ model: GENERATION_MODEL });
  const context = await buildTranslationPromptContext(text, targetLang, reportType);
  const normalizedReportType = reportType === 'care' || reportType === 'status' ? reportType : null;
  const isStatusTranslation = normalizedReportType === 'status';

  const instruction = targetLang === 'ja'
    ? [
      '以下のテキストを、日本の競馬レポート向けの自然な日本語に翻訳してください。',
      '出力は翻訳文のみ。',
      isStatusTranslation
        ? '番号付き見出し、見出し順、段落、改行を維持してください。見出しや手順を削除・統合しないでください。'
        : '解説、補足、注釈、見出し、箇条書き、引用符、前置き、後書きは一切不要です。',
      isStatusTranslation
        ? 'Low palmar nerve blockなどの英語の固有手技名は原文どおり残し、解剖学的位置、左右、実施順序、各結果、不確実性を変えないでください。'
        : '入力が1段落なら出力も1段落にしてください。',
      isStatusTranslation ? '文体は治療・診断経過報告書に寄せてください。' : '文体は馬主体の近況レポートに寄せてください。',
      '距離、ペース、脚元、鞍下、坂路などの競走馬文脈の用語は与えられたルールと知識コンテキストを優先してください。',
      normalizedReportType ? `${normalizedReportType}記録として、入力の事実・不確実性・予定を保ったまま翻訳してください。` : ''
    ].join('\n')
    : [
      'Translate the following text into natural English for a horse racing report.',
      'Return only the translated text.',
      isStatusTranslation
        ? 'Preserve numbered headings, heading order, paragraphs, and line breaks. Do not delete or merge headings or procedures.'
        : 'Do not add explanations, notes, headings, bullet points, quotation marks, or extra commentary.',
      isStatusTranslation
        ? 'Keep named procedures exactly as written and preserve anatomical level, laterality, sequence, each result, and uncertainty.'
        : 'If the input is a single paragraph, return a single paragraph.',
      isStatusTranslation ? 'Use owner-facing treatment and diagnostic report wording.' : 'Use owner-facing racehorse report wording.',
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
  return {
    translatedText: isStatusTranslation
      ? normalizeStatusNarrative(translatedText)
      : normalizeGeneratedText(translatedText, targetLang === 'ja' ? 'ja' : 'en'),
  };
}

module.exports = {
  generateMonthlyReport,
  generateDepartureReport,
  translateReportText,
  buildStatusSystemInstruction,
  buildStatusFidelityRepairPrompt,
  normalizeStatusNarrative,
  normalizeStatusResponse,
  hasValidStatusDraft,
};
