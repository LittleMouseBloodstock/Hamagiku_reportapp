const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Initialize Gemini
// Note: In production, ensure GEMINI_API_KEY is set in Cloud Run environment variables.
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

app.get('/', (req, res) => {
    res.send('Multilingual Report API');
});

// Translation Endpoint
app.post('/translate', async (req, res) => {
    const { text, targetLang } = req.body;

    // Check if API key is provided in header or env
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "API Key not configured" });
    }

    // Re-init with provided key if dynamic
    const dynamicGenAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = dynamicGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const instruction = targetLang === 'ja'
            ? "以下のテキストを、日本の競馬業界の専門用語を使った自然な日本語に翻訳してください。"
            : "Translate the following text into natural English for a horse racing report.";

        const prompt = `${instruction}\n\nText: ${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text();

        res.json({ translatedText });
    } catch (e) {
        console.error("Translation Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Content Generation Endpoint
app.post('/generate', async (req, res) => {
    const { prompt, lang, apiKey: clientApiKey } = req.body;

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API Key not configured" });

    const dynamicGenAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = dynamicGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const systemInstruction = lang === 'ja'
            ? `あなたはプロの競走馬調教師です。以下のキーワードを元に月次レポート用コメントを書いてください。200文字程度。`
            : `You are a racehorse trainer. Write a monthly report comment based on these keywords. Around 100 words.`;

        const fullPrompt = `${systemInstruction}\n\nKeywords: ${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const generatedText = response.text();

        res.json({ generatedText });
    } catch (e) {
        console.error("Generation Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
