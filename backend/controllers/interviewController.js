const InterviewResult = require('../models/InterviewResult');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');
const { hasXAIKey, prefersXAI, callXAIChat, callGeminiChat, hasGroqKey, parseAiJsonSafely, cleanAIJsonText } = require('../utils/ai');
const Groq = require("groq-sdk");

const generateInterview = async (req, res) => {
  const { topic, numQuestions } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  const count = numQuestions || 10;

  if (!process.env.GEMINI_API_KEY && !hasXAIKey() && (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here')) {
    const dummyQuestions = Array.from({ length: count }).map((_, i) => ({
      question: `(Dummy) Can you explain a core concept in ${topic}? (Question ${i + 1})`,
      idealAnswer: `(Dummy) The ideal answer would explain the core concept in detail.`
    }));
    return res.json({ success: true, questions: dummyQuestions });
  }

  try {
    const prompt = `
      You are an expert technical interviewer. Generate ${count} interview questions about "${topic}".
      Return the response strictly as a JSON array of objects with the following format, and nothing else (no markdown blocks, no intro text):
      [
        {
          "question": "The interview question text",
          "idealAnswer": "A comprehensive but concise ideal answer expected from a candidate"
        }
      ]
    `;

    let cleanedText;
    if (prefersXAI()) {
      try {
        cleanedText = await callXAIChat(prompt);
      } catch (err) {
        console.log("xAI API Error. Falling back to Gemini/Groq...", err.message);
      }
    }

    if (!cleanedText && process.env.GEMINI_API_KEY) {
      try {
        cleanedText = await callGeminiChat(prompt);
      } catch (err) {
        console.log("Gemini API Error. Falling back to xAI/Groq...");
      }
    }

    if (!cleanedText && hasXAIKey()) {
      try {
        cleanedText = await callXAIChat(prompt);
      } catch (err) {
        console.log("xAI API Error. Falling back to Groq Llama 3...", err.message);
      }
    }

    if (!cleanedText) {
      if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
        const dummyQuestions = Array.from({ length: count }).map((_, i) => ({
          question: `(Simulated due to API limit) Can you explain a core concept in ${topic}? (Question ${i + 1})`,
          idealAnswer: `(Simulated) The ideal answer would explain the core concept in detail.`
        }));
        return res.json({ success: true, questions: dummyQuestions });
      }
      
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
      });
      cleanedText = cleanAIJsonText(chatCompletion.choices[0].message.content);
    }

    const questions = parseAiJsonSafely(cleanedText, []);
    res.json({ success: true, questions });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: "Failed to generate interview questions" });
  }
};

const evaluateInterview = async (req, res) => {
  const { questions, userAnswers } = req.body;
  if (!questions || !userAnswers) return res.status(400).json({ error: 'Questions and userAnswers required' });

  if (!process.env.GEMINI_API_KEY && !hasXAIKey() && (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here')) {
    const dummyEvaluation = questions.map(() => ({ score: 7, feedback: "Dummy feedback" }));
    return res.json({ success: true, evaluation: dummyEvaluation });
  }

  try {
    const prompt = `
      You are an expert technical interviewer evaluating a candidate's answers.
      Here are the questions, the ideal answers, and the candidate's answers.
      For each question, provide a score from 0 to 10 based on how well the candidate's answer matches the ideal answer. Also provide brief feedback.
      If the user's answer is empty or nonsense, score it 0.
      
      Return strictly a JSON array of objects with the exact length of ${questions.length}:
      [
        {
          "score": 8,
          "feedback": "Short feedback here..."
        }
      ]
      
      Data to evaluate:
      ${questions.map((q, i) => `
        Q${i + 1}: ${q.question}
        Ideal: ${q.idealAnswer}
        User Answer: ${userAnswers[i] || ""}
      `).join('\\n')}
    `;

    let cleanedText;
    if (prefersXAI()) {
      try {
        cleanedText = await callXAIChat(prompt);
      } catch (err) {
        console.log("xAI API Error. Falling back to Gemini/Groq...", err.message);
      }
    }

    if (!cleanedText && process.env.GEMINI_API_KEY) {
      try {
        cleanedText = await callGeminiChat(prompt);
      } catch (err) {
        console.log("Gemini API Error. Falling back to xAI/Groq...");
      }
    }

    if (!cleanedText && hasXAIKey()) {
      try {
        cleanedText = await callXAIChat(prompt);
      } catch (err) {
        console.log("xAI API Error. Falling back to Groq...", err.message);
      }
    }

    if (!cleanedText) {
      if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
        const dummyEvaluation = questions.map(() => ({ score: 7, feedback: "Simulated feedback" }));
        return res.json({ success: true, evaluation: dummyEvaluation });
      }

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
      });
      cleanedText = cleanAIJsonText(chatCompletion.choices[0].message.content);
    }

    const evaluation = parseAiJsonSafely(cleanedText, []);
    res.json({ success: true, evaluation });
  } catch (error) {
    console.error("AI Evaluation Error:", error);
    res.status(500).json({ error: "Failed to evaluate answers" });
  }
};

const saveInterview = async (req, res) => {
  const { userId, topic, overallScore, communicationScore, technicalScore, confidenceScore, feedbackSummary, strengths, areasForImprovement, questionCount } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const entry = {
    userId, topic: topic || '', overallScore: overallScore || 0,
    communicationScore: communicationScore || 0, technicalScore: technicalScore || 0,
    confidenceScore: confidenceScore || 0, feedbackSummary: feedbackSummary || '',
    strengths: strengths || [], areasForImprovement: areasForImprovement || [],
    questionCount: questionCount || 0, date: new Date()
  };

  if (getIsMongoDBConnected()) {
    try {
      const result = new InterviewResult(entry);
      await result.save();
      res.status(201).json({ success: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.interviewResults) data.interviewResults = [];
    entry.id = Date.now().toString();
    data.interviewResults.push(entry);
    writeFallbackData(data);
    res.status(201).json({ success: true, result: entry });
  }
};

const getInterviewHistory = async (req, res) => {
  const { userId } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const results = await InterviewResult.find({ userId }).sort({ date: -1 }).limit(50);
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const results = (data.interviewResults || []).filter(r => r.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, results });
  }
};

module.exports = { generateInterview, evaluateInterview, saveInterview, getInterviewHistory };
