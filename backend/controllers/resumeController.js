const fs = require('fs');
const ResumeData = require('../models/ResumeData');
const ResumeInterview = require('../models/ResumeInterview');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');
const { runResumeUpload } = require('../config/multer');
const { extractResumeText, cleanupUploadedFile } = require('../utils/fileUtils');
const { parseResumeFallback } = require('../utils/resumeParser');
const { hasGeminiKey, hasXAIKey, callGeminiChat, callXAIChat, parseAiJsonSafely } = require('../utils/ai');
const { RAGEngine } = require('../utils/ragEngine');
const { buildFallbackQuestions } = require('../utils/helpers');

const uploadResume = async (req, res) => {
  let filePath = '';
  try {
    await runResumeUpload(req, res);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    filePath = req.file.path;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const dataBuffer = fs.readFileSync(filePath);
    const rawText = await extractResumeText(filePath, req.file, dataBuffer);

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'Could not extract readable text from this resume. Please upload a text-based PDF or DOCX file.' });
    }

    let structuredData = {
      personalDetails: {}, education: [], skills: [], projects: [], experience: [],
      certifications: [], achievements: [], technologies: [], publications: []
    };

    const fallbackStructuredData = parseResumeFallback(rawText);

    if (hasGeminiKey() || hasXAIKey()) {
      const prompt = `Extract structured resume data from the following resume text.
Return ONLY a valid JSON object matching exactly the structure below. Be exhaustive and thorough.

For "skills": Extract every single programming language, framework, library, tool, database, cloud platform, and technology mentioned ANYWHERE in the resume. Return as a flat JSON array of short individual string tags like ["JavaScript", "React", "Node.js", "Python", "SQL", "Git", "Docker", "AWS"]. Do NOT group them or write long descriptions.
For "experience": Each entry should be a single string describing one job role.
For "projects": Each entry should be one sentence per project describing what was built and what tech was used.
For "education": Each entry should be one string per degree/certification.

JSON Structure:
{
  "personalDetails": {"name": "", "email": "", "phone": ""},
  "education": ["string"],
  "skills": ["string"],
  "projects": ["string"],
  "experience": ["string"],
  "certifications": ["string"],
  "achievements": ["string"],
  "technologies": ["string"],
  "publications": ["string"]
}

Resume Text:
${rawText.substring(0, 25000)}
`;
      try {
        let text;
        if (hasGeminiKey()) {
          text = await callGeminiChat(prompt);
        } else {
          text = await callXAIChat(prompt);
        }
        const parsed = parseAiJsonSafely(text, {});
        let mergedSkills = [];
        if (Array.isArray(parsed.skills)) mergedSkills.push(...parsed.skills);
        if (Array.isArray(parsed.technologies)) mergedSkills.push(...parsed.technologies);
        
        mergedSkills = mergedSkills.flatMap(s => String(s).split(/[,;|•·]/).map(p => p.replace(/[^a-zA-Z0-9+#._ -]/g, '').trim()).filter(p => p && p.length < 60));
        mergedSkills = [...new Set(mergedSkills.filter(Boolean))];

        structuredData = {
          personalDetails: parsed.personalDetails || fallbackStructuredData.personalDetails,
          education: Array.isArray(parsed.education) && parsed.education.length > 0 ? parsed.education : fallbackStructuredData.education,
          skills: mergedSkills.length > 0 ? mergedSkills : fallbackStructuredData.skills,
          projects: Array.isArray(parsed.projects) && parsed.projects.length > 0 ? parsed.projects : fallbackStructuredData.projects,
          experience: Array.isArray(parsed.experience) && parsed.experience.length > 0 ? parsed.experience : fallbackStructuredData.experience,
          certifications: Array.isArray(parsed.certifications) ? parsed.certifications : fallbackStructuredData.certifications,
          achievements: Array.isArray(parsed.achievements) ? parsed.achievements : fallbackStructuredData.achievements,
          technologies: Array.isArray(parsed.technologies) ? parsed.technologies : fallbackStructuredData.technologies,
          publications: Array.isArray(parsed.publications) ? parsed.publications : fallbackStructuredData.publications,
        };
      } catch (err) {
        console.error("AI Resume Parsing Error (using fallback parser):", err.message);
        structuredData = fallbackStructuredData;
      }
    } else {
      structuredData = fallbackStructuredData;
    }

    if (getIsMongoDBConnected()) {
      let doc = await ResumeData.findOne({ userId });
      if (doc) {
        Object.assign(doc, structuredData, { rawText, parsedAt: new Date() });
      } else {
        doc = new ResumeData({ userId, ...structuredData, rawText });
      }
      await doc.save();
    } else {
      const data = readFallbackData();
      if (!data.resumeData) data.resumeData = [];
      const idx = data.resumeData.findIndex(r => r.userId === userId);
      if (idx !== -1) {
        data.resumeData[idx] = { ...data.resumeData[idx], ...structuredData, rawText, parsedAt: new Date() };
      } else {
        data.resumeData.push({ id: Date.now().toString(), userId, ...structuredData, rawText, parsedAt: new Date() });
      }
      writeFallbackData(data);
    }

    res.json({ success: true, data: { ...structuredData, rawText, parsedAt: new Date() } });
  } catch (err) {
    console.error('Resume upload error:', err);
    const isUnsupportedFile = err.message === 'Only PDF and DOCX files are allowed';
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : isUnsupportedFile ? 400 : 500);
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Resume file is too large. Please upload a PDF or DOCX under 10MB.'
      : isUnsupportedFile
      ? 'Only PDF and DOCX files are allowed.'
      : err.message || 'Resume upload failed.';
    res.status(status).json({ error: message });
  } finally {
    cleanupUploadedFile(filePath || req.file?.path);
  }
};

const getResume = async (req, res) => {
  const { userId } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const data = await ResumeData.findOne({ userId });
      if (!data) return res.status(404).json({ error: 'Resume not found' });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const resume = (data.resumeData || []).find(r => r.userId === userId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json({ success: true, data: resume });
  }
};

const generateQuestions = async (req, res) => {
  const { userId, resumeText, difficulty, categories, countPerCategory } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

  const safeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['Skills', 'Experience'];
  const fallbackQuestions = buildFallbackQuestions(safeCategories, countPerCategory);

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, questions: fallbackQuestions });
  }

  let structuredData = null;
  if (userId) {
    try {
      if (getIsMongoDBConnected()) {
        structuredData = await ResumeData.findOne({ userId });
      } else {
        const data = readFallbackData();
        structuredData = (data.resumeData || []).find(r => r.userId === userId);
      }
    } catch (err) {
      console.warn("Could not load structured resume data for RAG:", err.message);
    }
  }

  let retrievedContext = '';
  try {
    const ragEngine = new RAGEngine(resumeText, structuredData, process.env.GEMINI_API_KEY);
    await ragEngine.initialize();
    
    const retrievedChunks = [];
    for (const cat of safeCategories) {
      const chunks = await ragEngine.retrieve(cat, 4);
      if (chunks.length > 0) {
        retrievedChunks.push(`[${cat.toUpperCase()} - Resume Context]\\n${chunks.join('\\n')}`);
      }
    }
    retrievedContext = retrievedChunks.join('\\n\\n');
  } catch (err) {
    console.error("RAG retrieval error:", err.message);
  }

  try {
    const prompt = `
You are an expert Senior Software Engineering Interviewer from India.

You must conduct this interview and ask all questions in professional Indian English.
You must only ask questions based on the candidate's uploaded resume.
Base your questions strictly on the following RAG-retrieved sections of the candidate's resume:
${retrievedContext}

Overall Resume Text:
${resumeText.substring(0, 10000)}

Generate an array of ${safeCategories.length * (countPerCategory || 1)} resume-based interview questions.
Difficulty level: ${difficulty}. 
Categories needed: ${safeCategories.join(', ')}.

Return ONLY a JSON array with this structure:
[
  { "category": "CategoryName", "question": "Question text", "idealAnswer": "Ideal answer text" }
]
`;
    let text;
    if (hasGeminiKey()) {
      text = await callGeminiChat(prompt);
    } else {
      text = await callXAIChat(prompt);
    }

    let questions = fallbackQuestions;
    const parsed = parseAiJsonSafely(text, fallbackQuestions);
    if (Array.isArray(parsed) && parsed.length > 0) {
      questions = parsed;
    }
    res.json({ success: true, questions });
  } catch (err) {
    res.json({ success: true, questions: fallbackQuestions });
  }
};

const followUp = async (req, res) => {
  const { userId, resumeText, currentQuestion, userAnswer } = req.body;
  const fallbackFollowUp = { question: "Can you give a concrete example from your resume that supports your answer?", idealAnswer: "A strong answer should cite a specific resume item and explain the impact clearly." };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, question: fallbackFollowUp });
  }

  let structuredData = null;
  if (userId) {
    try {
      if (getIsMongoDBConnected()) {
        structuredData = await ResumeData.findOne({ userId });
      } else {
        const data = readFallbackData();
        structuredData = (data.resumeData || []).find(r => r.userId === userId);
      }
    } catch (err) {}
  }

  let retrievedContext = '';
  try {
    const ragEngine = new RAGEngine(resumeText, structuredData, process.env.GEMINI_API_KEY);
    await ragEngine.initialize();
    const query = `${currentQuestion} ${userAnswer}`;
    const chunks = await ragEngine.retrieve(query, 4);
    retrievedContext = chunks.join('\\n');
  } catch (err) {}

  try {
    const prompt = `
You are an expert Senior Software Engineering Interviewer.
Generate exactly one follow-up question based on:
1. The candidate's uploaded resume.
2. The current question.
3. The candidate's answer.

Resume facts:
${retrievedContext}

General Resume:
${resumeText.substring(0, 10000)}

Current Question: ${currentQuestion}
Candidate's Answer: ${userAnswer}
Return ONLY valid JSON: { "question": "Follow-up text", "idealAnswer": "Expected answer" }
`;
    let text;
    if (hasGeminiKey()) {
      text = await callGeminiChat(prompt);
    } else {
      text = await callXAIChat(prompt);
    }
    const question = parseAiJsonSafely(text, fallbackFollowUp);
    res.json({ success: true, question });
  } catch (err) {
    res.json({ success: true, question: fallbackFollowUp });
  }
};

const evaluateAnswer = async (req, res) => {
  const { question, idealAnswer, userAnswer } = req.body;
  const fallbackEvaluation = { score: 7, feedback: "Good effort. Add a more specific example from your resume to strengthen your answer." };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, evaluation: fallbackEvaluation });
  }

  try {
    const prompt = `
You are a professional Senior Software Engineering interviewer evaluating one answer.
Evaluate only against the resume-grounded question and expected answer. Score out of 10.
Q: ${question}
Ideal: ${idealAnswer}
Answer: ${userAnswer}
Return ONLY JSON: { "score": 8, "feedback": "Short constructive feedback grounded in the resume question" }
`;
    let text;
    if (hasGeminiKey()) {
      text = await callGeminiChat(prompt);
    } else {
      text = await callXAIChat(prompt);
    }
    const evaluation = parseAiJsonSafely(text, fallbackEvaluation);
    res.json({ success: true, evaluation });
  } catch (err) {
    res.json({ success: true, evaluation: fallbackEvaluation });
  }
};

const detectAI = async (req, res) => {
  const { answer } = req.body;
  const fallbackDetection = { aiLikelihood: 10, originalityScore: 90, personalizationScore: 85, confidenceScore: 80, explanation: "Response looks personalized enough for a resume-based interview." };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, detection: fallbackDetection });
  }

  try {
    const prompt = `
Analyze this answer for AI-generation likelihood.
Answer: ${answer}
Return ONLY JSON: { "aiLikelihood": 15, "originalityScore": 85, "personalizationScore": 80, "confidenceScore": 90, "explanation": "Brief explanation" }
`;
    let text;
    if (hasGeminiKey()) {
      text = await callGeminiChat(prompt);
    } else {
      text = await callXAIChat(prompt);
    }
    const detection = parseAiJsonSafely(text, fallbackDetection);
    res.json({ success: true, detection });
  } catch (err) {
    res.json({ success: true, detection: fallbackDetection });
  }
};

const finalReport = async (req, res) => {
  const { qaList, resumeText = '' } = req.body;
  const fallbackReport = {
    technicalScore: 75, communicationScore: 75, confidenceScore: 75, resumeMatch: 80,
    strongAreas: ["Connects answers to resume experience"], weakAreas: ["Needs more measurable impact and deeper technical examples"],
    improvementSuggestions: ["Use specific metrics, design tradeoffs, and implementation details from your projects."],
    strengths: ["Connects answers to resume experience"], weaknesses: ["Needs more measurable impact and deeper technical examples"],
    sectionWisePerformance: { "Resume Match": "Good" }, hiringRecommendation: "Hire"
  };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, report: fallbackReport });
  }

  try {
    const prompt = `
You are a professional Senior Software Engineering interviewer.
Generate the final interview report based only on the candidate's uploaded resume and the Q&A.
Resume:
${resumeText.substring(0, 12000)}
Q&A History: ${JSON.stringify(qaList.map(qa => ({ q: qa.question, ideal: qa.idealAnswer, a: qa.answer, score: qa.score, feedback: qa.feedback })))}

Return ONLY JSON:
{
  "technicalScore": 0, "communicationScore": 0, "confidenceScore": 0, "resumeMatch": 0,
  "strongAreas": ["string"], "weakAreas": ["string"], "improvementSuggestions": ["string"],
  "strengths": ["string"], "weaknesses": ["string"],
  "sectionWisePerformance": { "Skills": "string feedback", "Experience": "string feedback" },
  "hiringRecommendation": "Strong Hire"
}
`;
    let text;
    if (hasGeminiKey()) {
      text = await callGeminiChat(prompt);
    } else {
      text = await callXAIChat(prompt);
    }
    const report = parseAiJsonSafely(text, fallbackReport);
    res.json({ success: true, report });
  } catch (err) {
    res.json({ success: true, report: fallbackReport });
  }
};

const saveSession = async (req, res) => {
  const entry = req.body;
  if (!entry.userId) return res.status(400).json({ error: 'userId is required' });

  if (getIsMongoDBConnected()) {
    try {
      const result = new ResumeInterview({ ...entry, date: new Date() });
      await result.save();
      res.status(201).json({ success: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeInterviews) data.resumeInterviews = [];
    const session = { ...entry, id: Date.now().toString(), date: new Date() };
    data.resumeInterviews.push(session);
    writeFallbackData(data);
    res.status(201).json({ success: true, result: session });
  }
};

const getSessionHistory = async (req, res) => {
  const { userId } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      const results = await ResumeInterview.find({ userId }).sort({ date: -1 }).limit(20);
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const results = (data.resumeInterviews || []).filter(r => r.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, results });
  }
};

const proctorViolation = async (req, res) => {
  const { userId, eventType } = req.body;
  console.log(`Proctoring violation logged for ${userId}: ${eventType}`);
  res.json({ success: true });
};

module.exports = { uploadResume, getResume, generateQuestions, followUp, evaluateAnswer, detectAI, finalReport, saveSession, getSessionHistory, proctorViolation };
