const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
const { createSupabaseAdminClient } = require('./supabase_admin');
const {
  generateMonthlyReport,
  generateDepartureReport,
  translateReportText,
} = require('./report_generation_service');
const { indexReport } = require('./semantic_indexer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 8080;

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

app.post('/storage/upload', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const { path, dataUrl } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  if (!path || !dataUrl) {
    return res.status(400).json({ error: 'path and dataUrl are required' });
  }
  if (!isAllowedStoragePath(path)) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    const { contentType, buffer } = decodeDataUrl(dataUrl);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('report-assets')
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabaseAdmin.storage.from('report-assets').getPublicUrl(path);
    return res.json({ url: data.publicUrl });
  } catch (e) {
    console.error('Storage Upload Error:', e);
    return res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

app.post('/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  try {
    res.json(await translateReportText({ text, targetLang, apiKey }));
  } catch (e) {
    console.error('Translation Error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/generate', async (req, res) => {
  const { prompt, apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured in Environment Variables' });
  }

  try {
    res.json(await generateMonthlyReport({ prompt, apiKey }));
  } catch (e) {
    console.error('Generation Error:', e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

app.post('/generate-departure', async (req, res) => {
  const { notes, apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured in Environment Variables' });
  }

  try {
    res.json(await generateDepartureReport({ notes, apiKey }));
  } catch (e) {
    console.error('Departure Generation Error:', e);
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

app.post('/index-report', async (req, res) => {
  const { reportId } = req.body || {};
  if (!reportId) {
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

app.post('/translate-name', async (req, res) => {
  const { name, targetLang } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API Key not configured' });

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
    Translate or transliterate the racehorse name "${name}" into ${targetLang === 'ja' ? 'Katakana (Japanese)' : 'English'}.
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
