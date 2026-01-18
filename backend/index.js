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
        const model = dynamicGenAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
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

// Content Generation Endpoint (Dual Language)
app.post('/generate', async (req, res) => {
    const { prompt, apiKey: clientApiKey } = req.body;

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    console.log("Debug: /generate called");
    console.log("Debug: Env GEMINI_API_KEY present?", !!process.env.GEMINI_API_KEY);
    console.log("Debug: Client API Key provided?", !!clientApiKey);

    if (!apiKey) {
        console.error("Error: API Key is missing in both Env and Request body");
        return res.status(500).json({ error: "API Key not configured in Environment Variables" });
    }

    const dynamicGenAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = dynamicGenAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemInstruction = `
        You are a professional racehorse trainer.
        Based on the provided keywords, write a monthly report comment (approx 150-200 characters for Japanese, 50-80 words for English).
        
        Output valid JSON with exactly these keys:
        {
          "ja": "Japanese comment here (professional tone)",
          "en": "English comment here (professional, natural translation of the Japanese)"
        }
        
        Ensure the English and Japanese meanings align.
        `;

        const fullPrompt = `${systemInstruction}\n\nKeywords: ${prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON
        const jsonResponse = JSON.parse(text);

        res.json(jsonResponse);
    } catch (e) {
        console.error("Generation Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Name Translation Endpoint
app.post('/translate-name', async (req, res) => {
    const { name, targetLang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: "API Key not configured" });

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        // Prompt for Name conversion
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
        console.error("Name Translation Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
