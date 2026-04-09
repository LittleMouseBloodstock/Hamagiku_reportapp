function sanitizeJsonText(rawText) {
  return String(rawText || '')
    .replace(/^\uFEFF/, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
}

function extractJsonObject(rawText) {
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return rawText;
  }
  return rawText.slice(firstBrace, lastBrace + 1);
}

function parseModelJsonResponse(rawText) {
  const candidates = [
    rawText,
    sanitizeJsonText(rawText),
    extractJsonObject(rawText),
    extractJsonObject(sanitizeJsonText(rawText)),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // next
    }
  }

  return null;
}

function normalizeGeneratedText(text, language) {
  const containsJapanese = (value) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(value);
  const containsEnglish = (value) => /[A-Za-z]/.test(value);

  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/^\s*"(generated_text|rationale|internal_notes)"\s*:\s*/gim, '')
    .replace(/^\s*(generated_text|rationale|internal_notes)\s*:\s*/gim, '')
    .replace(/^[>"'`]+|[>"'`]+$/gm, '')
    .replace(/^[*-]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/,\s*$/gm, '')
    .replace(/^"+|"+$/gm, '')
    .replace(/\r\n/g, '\n')
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      if (language === 'ja') return containsJapanese(part);
      if (language === 'en') return containsEnglish(part) && !containsJapanese(part);
      return true;
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayMs(message = '') {
  const retryMatch = String(message).match(/retry in\s+([\d.]+)s/i);
  if (!retryMatch) return null;
  const seconds = Number(retryMatch[1]);
  if (!Number.isFinite(seconds)) return null;
  return Math.ceil(seconds * 1000);
}

function buildGeminiError(error) {
  const message = error?.message || String(error || 'Gemini request failed.');
  const retryDelayMs = extractRetryDelayMs(message);
  const quotaExceeded = /\b429\b|quota exceeded|Too Many Requests/i.test(message);
  const temporarilyUnavailable = /\b503\b|Service Unavailable|currently experiencing high demand/i.test(message);

  const wrapped = new Error(message);
  wrapped.statusCode = quotaExceeded ? 429 : temporarilyUnavailable ? 503 : 500;
  wrapped.retryAfterSeconds = retryDelayMs ? Math.ceil(retryDelayMs / 1000) : null;
  wrapped.retryable = quotaExceeded || temporarilyUnavailable;
  return wrapped;
}

async function generateGeminiTextWithRetry(model, prompt, maxAttempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      const wrapped = buildGeminiError(error);
      lastError = wrapped;

      if (!wrapped.retryable || attempt >= maxAttempts) {
        throw wrapped;
      }

      const waitMs = wrapped.retryAfterSeconds
        ? wrapped.retryAfterSeconds * 1000
        : attempt * 2000;
      await sleep(waitMs);
    }
  }

  throw lastError || new Error('Gemini request failed.');
}

module.exports = {
  sanitizeJsonText,
  extractJsonObject,
  parseModelJsonResponse,
  normalizeGeneratedText,
  generateGeminiTextWithRetry,
};
