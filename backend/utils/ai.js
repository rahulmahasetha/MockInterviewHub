const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require("groq-sdk");

const cleanAIJsonText = (text) => {
  let cleaned = String(text || '').replace(/\\s*```json/g, '').replace(/```/g, '').trim();
  const startObj = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  
  let start = -1;
  if (startObj !== -1 && startArr !== -1) start = Math.min(startObj, startArr);
  else if (startObj !== -1) start = startObj;
  else if (startArr !== -1) start = startArr;

  const endObj = cleaned.lastIndexOf('}');
  const endArr = cleaned.lastIndexOf(']');
  
  let end = -1;
  if (endObj !== -1 && endArr !== -1) end = Math.max(endObj, endArr);
  else if (endObj !== -1) end = endObj;
  else if (endArr !== -1) end = endArr;

  if (start !== -1 && end !== -1 && end >= start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
};

const parseAiJsonSafely = (text, fallback) => {
  try {
    const cleaned = cleanAIJsonText(text);
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (err) {
    console.warn("AI JSON parse warning, falling back:", err.message);
    return fallback;
  }
};

const isValidGeminiKey = (key) => typeof key === 'string' && key.length > 30 && key !== 'your_gemini_api_key_here';
const hasGroqKey = () => Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
const hasGeminiKey = () => isValidGeminiKey(process.env.GEMINI_API_KEY);
const hasXAIKey = () => Boolean(process.env.XAI_API_KEY && process.env.XAI_API_KEY !== 'your_xai_api_key_here');
const prefersXAI = () => process.env.AI_PROVIDER?.toLowerCase() === 'xai' && hasXAIKey();

const callGroqChat = async (prompt, options = {}) => {
  if (!hasGroqKey()) throw new Error('GROQ_API_KEY is not configured');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "openai/gpt-oss-120b",
  });
  return cleanAIJsonText(chatCompletion.choices[0].message.content);
};

const callGeminiChat = async (prompt, options = {}) => {
  const key = process.env.GEMINI_API_KEY;
  if (!isValidGeminiKey(key)) {
    if (hasGroqKey()) {
      console.log('Invalid Gemini key, falling back to Groq...');
      return callGroqChat(prompt, options);
    }
    throw new Error('Invalid or missing Gemini API key. Please check your .env file.');
  }
  const genAI = new GoogleGenerativeAI(key);
  const modelNames = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
  let lastErr;
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return cleanAIJsonText(result.response.text());
    } catch (err) {
      lastErr = err;
      if (err.message && (err.message.includes('not found') || err.message.includes('404') || err.message.includes('deprecated'))) {
        continue;
      }
      break;
    }
  }
  
  if (hasGroqKey()) {
    console.log('Gemini calls failed, falling back to Groq...');
    return callGroqChat(prompt, options);
  }
  
  throw lastErr;
};

const callXAIChat = async (prompt, options = {}) => {
  if (!hasXAIKey()) {
    throw new Error('XAI_API_KEY is not configured');
  }

  const response = await fetch(process.env.XAI_API_URL || 'https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || 'grok-2-latest',
      temperature: options.temperature ?? 0.3,
      messages: [
        { role: 'system', content: options.system || 'Return only valid JSON. Do not include markdown.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`xAI API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return cleanAIJsonText(data.choices?.[0]?.message?.content || '');
};

module.exports = { cleanAIJsonText, parseAiJsonSafely, hasGeminiKey, hasGroqKey, hasXAIKey, prefersXAI, callGeminiChat, callGroqChat, callXAIChat };
