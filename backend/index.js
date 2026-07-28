require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createSupabaseAdminClient } = require('./supabase_admin');
const {
  generateMonthlyReport,
  generateDepartureReport,
  translateReportText,
} = require('./report_generation_service');
const { indexReport } = require('./semantic_indexer');
const { GENERATION_MODEL } = require('./gemini_model_config');

const app = express();
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)) return true;
  return /^https:\/\/(?:[a-z0-9-]+\.)?hamagiku-reportapp\.pages\.dev$/i.test(origin);
};

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 8080;
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;

function createUserRateLimiter({ limit, windowMs = AI_RATE_LIMIT_WINDOW_MS }) {
  const buckets = new Map();
  return (req, res, next) => {
    const key = req.authUser?.id;
    if (!key) return res.status(401).json({ error: 'Authentication required' });

    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    current.count += 1;
    return next();
  };
}

const aiRateLimit = createUserRateLimiter({ limit: 60 });
const indexRateLimit = createUserRateLimiter({ limit: 20 });

async function requireAllowedUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase admin environment is not configured' });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const email = String(user.email || '').trim();
    if (!email) {
      return res.status(403).json({ error: 'User email is required' });
    }

    const { data: allowedUsers, error: allowedUserError } = await supabaseAdmin
      .from('allowed_users')
      .select('email')
      .eq('email', email)
      .limit(1);

    if (allowedUserError) {
      console.error('Allowed User Check Error:', allowedUserError);
      return res.status(503).json({ error: 'Unable to verify application access' });
    }
    if (!allowedUsers?.length) {
      return res.status(403).json({ error: 'User is not allowed to access this application' });
    }

    req.authUser = user;
    req.supabaseAdmin = supabaseAdmin;
    return next();
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.status(503).json({ error: 'Unable to verify authentication' });
  }
}

function validateTextInput(value, fieldName, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return { error: `${fieldName} is required` };
  if (text.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer` };
  }
  return { text };
}

app.get('/', (req, res) => {
  res.send('Multilingual Report API');
});

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image payload');
  }
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function isAllowedStoragePath(path) {
  const normalized = String(path || '').trim();
  const reportPath = /^[0-9a-f-]{36}\/[^/]+\/main_\d+\.(jpg|jpeg|png|webp)$/i;
  const carePath = /^care-records\/[0-9a-f-]{36}\/[^/]+\/[^/]+\.(jpg|jpeg|png|webp)$/i;
  return reportPath.test(normalized) || carePath.test(normalized);
}

app.post('/storage/upload', requireAllowedUser, async (req, res) => {
  const { path, dataUrl } = req.body || {};

  if (!path || !dataUrl) {
    return res.status(400).json({ error: 'path and dataUrl are required' });
  }
  if (!isAllowedStoragePath(path)) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  try {
    const { contentType, buffer } = decodeDataUrl(dataUrl);
    if (!/^image\/(?:jpeg|png|webp)$/i.test(contentType)) {
      return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are allowed' });
    }
    const { error: uploadError } = await req.supabaseAdmin.storage
      .from('report-assets')
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = req.supabaseAdmin.storage.from('report-assets').getPublicUrl(path);
    return res.json({ url: data.publicUrl });
  } catch (e) {
    console.error('Storage Upload Error:', e);
    return res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

app.post('/translate', requireAllowedUser, aiRateLimit, async (req, res) => {
  const { text, targetLang, reportType } = req.body || {};
  const validated = validateTextInput(text, 'text', 30000);
  if (validated.error) return res.status(400).json({ error: validated.error });
  if (targetLang !== 'ja' && targetLang !== 'en') {
    return res.status(400).json({ error: 'targetLang must be ja or en' });
  }
  if (reportType && !['care', 'status', 'monthly'].includes(reportType)) {
    return res.status(400).json({ error: 'Unsupported reportType' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  try {
    res.json(await translateReportText({
      text: validated.text,
      targetLang,
      reportType,
      apiKey,
    }));
  } catch (e) {
    console.error('Translation Error:', e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

app.post('/generate', requireAllowedUser, aiRateLimit, async (req, res) => {
  const { prompt } = req.body || {};
  const validated = validateTextInput(prompt, 'prompt', 50000);
  if (validated.error) return res.status(400).json({ error: validated.error });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured in Environment Variables' });
  }

  try {
    res.json(await generateMonthlyReport({ prompt: validated.text, apiKey }));
  } catch (e) {
    console.error('Generation Error:', e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

app.post('/generate-departure', requireAllowedUser, aiRateLimit, async (req, res) => {
  const { notes, reportType } = req.body || {};
  const validated = validateTextInput(notes, 'notes', 50000);
  if (validated.error) return res.status(400).json({ error: validated.error });
  if (reportType && !['status', 'departure'].includes(reportType)) {
    return res.status(400).json({ error: 'Unsupported reportType' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured in Environment Variables' });
  }

  try {
    res.json(await generateDepartureReport({
      notes: validated.text,
      reportType,
      apiKey,
    }));
  } catch (e) {
    console.error('Departure Generation Error:', e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

app.post('/index-report', requireAllowedUser, indexRateLimit, async (req, res) => {
  const { reportId } = req.body || {};
  if (!/^[0-9a-f-]{36}$/i.test(String(reportId || ''))) {
    return res.status(400).json({ error: 'reportId is required' });
  }

  try {
    const result = await indexReport(reportId);
    res.json(result);
  } catch (e) {
    console.error('Report Index Error:', e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

app.post('/translate-name', requireAllowedUser, aiRateLimit, async (req, res) => {
  const { name, targetLang } = req.body || {};
  const validated = validateTextInput(name, 'name', 200);
  if (validated.error) return res.status(400).json({ error: validated.error });
  if (targetLang !== 'ja' && targetLang !== 'en') {
    return res.status(400).json({ error: 'targetLang must be ja or en' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API Key not configured' });

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: GENERATION_MODEL });
    const prompt = `
    Translate or transliterate the racehorse name "${validated.text}" into ${targetLang === 'ja' ? 'Katakana (Japanese)' : 'English'}.
    Return ONLY the translated name as a string. No JSON, no explanations.
    Example: "Lucky Vega" -> "ラッキーベガ"
    Example: "クロフネ" -> "Kurofune"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedName = response.text().trim();

    res.json({ translatedName });
  } catch (e) {
    console.error('Name Translation Error:', e);
    res.status(500).json({ error: e.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, isAllowedOrigin, validateTextInput };
