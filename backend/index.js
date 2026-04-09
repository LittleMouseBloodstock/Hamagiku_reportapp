const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
const {
  generateMonthlyReport,
  generateDepartureReport,
} = require('./report_generation_service');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Multilingual Report API');
});

app.post('/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  const dynamicGenAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = dynamicGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const instruction = targetLang === 'ja'
      ? [
        '以下のテキストを、日本の競馬レポート向けの自然な日本語に翻訳してください。',
        '出力は翻訳文のみ。',
        '解説、補足、注釈、見出し、箇条書き、引用符、前置き、後書きは一切不要です。',
        '入力が1段落なら出力も1段落にしてください。'
      ].join('\n')
      : [
        'Translate the following text into natural English for a horse racing report.',
        'Return only the translated text.',
        'Do not add explanations, notes, headings, bullet points, quotation marks, or extra commentary.',
        'If the input is a single paragraph, return a single paragraph.'
      ].join('\n');

    const prompt = `${instruction}\n\nText: ${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text().trim();

    res.json({ translatedText });
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
