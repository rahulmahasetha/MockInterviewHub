const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require("groq-sdk");
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

// --- Multer Setup for Resume Upload ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `resume_${Date.now()}_${safeName}`);
  }
});
const allowedResumeExts = ['.pdf', '.docx'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedResumeExts.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'));
  }
});

const resumeUpload = upload.single('resume');

const runResumeUpload = (req, res) => new Promise((resolve, reject) => {
  resumeUpload(req, res, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const isPdfBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer.subarray(0, 4).toString('latin1').startsWith('%PDF');
};

const isDocxBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
};

const validateResumeFile = (file, buffer) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedResumeExts.includes(ext)) {
    throw createHttpError(400, 'Only PDF and DOCX files are allowed.');
  }
  if (!buffer || buffer.length === 0) {
    throw createHttpError(400, 'Uploaded resume file is empty.');
  }
  if (ext === '.pdf' && !isPdfBuffer(buffer)) {
    throw createHttpError(400, 'Invalid or corrupted PDF file. Please upload a valid PDF resume.');
  }
  if (ext === '.docx' && !isDocxBuffer(buffer)) {
    throw createHttpError(400, 'Invalid or corrupted DOCX file. Please upload a valid Word resume.');
  }
  return ext;
};

const normalizeResumeParseError = (err, ext) => {
  const message = String(err?.message || '').toLowerCase();
  if (
    message.includes('invalid pdf') ||
    message.includes('bad xref') ||
    message.includes('xref') ||
    message.includes('endobj') ||
    message.includes('corrupt') ||
    message.includes('encrypted')
  ) {
    return createHttpError(400, 'Could not read this PDF. It appears to be corrupted, encrypted, or not a valid PDF resume.');
  }
  if (ext === '.docx') {
    return createHttpError(400, 'Could not read this DOCX file. It appears to be corrupted or not a valid Word resume.');
  }
  return createHttpError(400, 'Could not extract resume text from the uploaded file.');
};

const extractResumeText = async (filePath, file, buffer) => {
  const ext = validateResumeFile(file, buffer);
  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });
      return (data.text || '').trim();
    }
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  } catch (err) {
    throw normalizeResumeParseError(err, ext);
  }
};

const cleanupUploadedFile = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Could not delete uploaded resume file:', err.message);
  }
};

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/triviatrek';

const formatScoreTimestamp = () => new Date().toLocaleString(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\$&');

const cleanAIJsonText = (text) => {
  let cleaned = String(text || '').replace(/\s*```json/g, '').replace(/```/g, '').trim();
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

const { parseResumeFallback } = require('./utils/resumeParser');
const { RAGEngine } = require('./utils/ragEngine');

/**
 * Validates a Gemini API key.
 */
const isValidGeminiKey = (key) => typeof key === 'string' && key.length > 30 && key !== 'your_gemini_api_key_here';
const hasGroqKey = () => Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');

const callGroqChat = async (prompt, options = {}) => {
  if (!hasGroqKey()) throw new Error('GROQ_API_KEY is not configured');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "openai/gpt-oss-120b",
  });
  return cleanAIJsonText(chatCompletion.choices[0].message.content);
};

/**
 * Calls Gemini generative AI with model fallback chain.
 * Tries gemini-1.5-flash first (stable), then gemini-pro as last resort.
 */
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
        continue; // try next model
      }
      break; // For other errors like quota, try fallback immediately
    }
  }
  
  if (hasGroqKey()) {
    console.log('Gemini calls failed, falling back to Groq...');
    return callGroqChat(prompt, options);
  }
  
  throw lastErr;
};

const hasGeminiKey = () => isValidGeminiKey(process.env.GEMINI_API_KEY);

const buildFallbackQuestions = (categories = [], countPerCategory = 1) => {
  const safeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['Skills', 'Experience'];
  const perCategory = Math.max(1, Number(countPerCategory) || 1);

  return safeCategories.flatMap((category, index) =>
    Array.from({ length: perCategory }, (_, questionIndex) => ({
      category,
      question: `Based on your resume, please explain one ${String(category).toLowerCase()} item you listed and the impact it had${questionIndex > 0 ? ` (follow-up ${questionIndex + 1})` : ''}.`,
      idealAnswer: `A strong answer should reference the exact resume item, explain the candidate's role, decisions, technical details, impact, and lessons learned.`
    }))
  );
};

const hasXAIKey = () => Boolean(process.env.XAI_API_KEY && process.env.XAI_API_KEY !== 'your_xai_api_key_here');

const prefersXAI = () => process.env.AI_PROVIDER?.toLowerCase() === 'xai' && hasXAIKey();

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

const dedupeLeaderboardRows = (rows) => {
  const byKey = new Map();

  for (const row of rows) {
    if (!row.name) continue;
    const key = `${row.name.toLowerCase()}_${row.type || 'quiz'}_${row.topic || ''}`;

    const existing = byKey.get(key);
    if (!existing || Number(row.score) > Number(existing.score)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => Number(b.score) - Number(a.score));
};

const createInitialCategoryProgress = () => {
  return QUIZ_CATEGORIES.reduce((acc, category) => {
    acc[category.slug] = { passed: [], score: 0 };
    return acc;
  }, {});
};

const LEVELS_PER_CATEGORY = 10;

const buildLevels = (questions) => {
  const levels = [];
  for (let i = 0; i < LEVELS_PER_CATEGORY; i++) {
    const item = questions[i % questions.length] || { question: 'Question not available', options: [], answer: '', hint: '' };
    levels.push({
      level: i + 1,
      question: item.question,
      options: item.options,
      answer: item.answer,
      hint: item.hint
    });
  }
  return levels;
};

const QUIZ_CATEGORIES = [
  {
    slug: 'science',
    name: 'Java Programming Quiz',
    legacyName: 'Science',
    label: 'JAVA',
    color: '#E0F2FE',
    iconColor: '#0284C7',
    description: 'Practice Java basics, OOP, collections, and syntax.',
    levels: buildLevels([
      { question: 'In Java, which keyword is used to create a class?', options: ['class', 'struct', 'define', 'object'], answer: 'class', hint: 'Every Java program commonly starts by declaring this type.' },
      { question: 'Which method is the standard entry point of a Java application?', options: ['main', 'start', 'run', 'init'], answer: 'main', hint: 'It is usually written as public static void main.' },
      { question: 'Which Java keyword creates an object instance?', options: ['new', 'make', 'create', 'malloc'], answer: 'new', hint: 'It calls a constructor.' },
      { question: 'Which Java type stores true or false values?', options: ['boolean', 'bool', 'bit', 'truth'], answer: 'boolean', hint: 'Java uses the full word, not bool.' },
      { question: 'Which Java collection stores key-value pairs?', options: ['HashMap', 'ArrayList', 'Stack', 'StringBuilder'], answer: 'HashMap', hint: 'It maps keys to values.' }
    ])
  },
  {
    slug: 'jungle',
    name: 'C Programming Quiz',
    legacyName: 'Jungle',
    label: 'C',
    color: '#DCFCE7',
    iconColor: '#16A34A',
    description: 'Review C fundamentals, pointers, memory, and printf.',
    levels: buildLevels([
      { question: 'Which function is the entry point of a C program?', options: ['main', 'start', 'init', 'program'], answer: 'main', hint: 'Execution begins from this function.' },
      { question: 'Which header file is needed for printf?', options: ['stdio.h', 'stdlib.h', 'string.h', 'math.h'], answer: 'stdio.h', hint: 'It stands for standard input/output.' },
      { question: 'Which operator gives the address of a variable in C?', options: ['&', '*', '%', '#'], answer: '&', hint: 'It is also called the address-of operator.' },
      { question: 'Which function is commonly used to allocate memory dynamically in C?', options: ['malloc', 'new', 'allocObject', 'memory'], answer: 'malloc', hint: 'It comes from stdlib.h.' },
      { question: 'Which format specifier prints an integer using printf?', options: ['%d', '%s', '%f', '%c'], answer: '%d', hint: 'It is used for decimal integers.' }
    ])
  },
  {
    slug: 'math',
    name: 'C++ Programming Quiz',
    legacyName: 'Math',
    label: 'C++',
    color: '#EEF2FF',
    iconColor: '#4F46E5',
    description: 'Practice C++ OOP, STL, scope, and dynamic allocation.',
    levels: buildLevels([
      { question: 'Which C++ feature allows multiple functions to share the same name with different parameters?', options: ['Function overloading', 'Inheritance', 'Encapsulation', 'Namespace locking'], answer: 'Function overloading', hint: 'The compiler chooses based on the parameter list.' },
      { question: 'Which C++ keyword is used to create a class object dynamically?', options: ['new', 'malloc', 'make', 'object'], answer: 'new', hint: 'It calls the constructor and returns a pointer.' },
      { question: 'Which standard library container is a dynamic array?', options: ['vector', 'map', 'set', 'queue'], answer: 'vector', hint: 'It grows as elements are added.' },
      { question: 'Which concept lets a derived class reuse a base class?', options: ['Inheritance', 'Compilation', 'Tokenization', 'Linking'], answer: 'Inheritance', hint: 'It models an is-a relationship.' },
      { question: 'Which operator is used for scope resolution in C++?', options: ['::', '->', '.', '&&'], answer: '::', hint: 'It is used with namespaces and class members.' }
    ])
  },
  {
    slug: 'history',
    name: 'Python Programming Quiz',
    legacyName: 'History',
    label: 'PY',
    color: '#FEF3C7',
    iconColor: '#D97706',
    description: 'Learn Python functions, lists, dictionaries, and modules.',
    levels: buildLevels([
      { question: 'Which keyword defines a function in Python?', options: ['def', 'func', 'function', 'lambda-only'], answer: 'def', hint: 'It appears before the function name.' },
      { question: 'Which Python data type stores key-value pairs?', options: ['dict', 'list', 'tuple', 'set-only'], answer: 'dict', hint: 'It is short for dictionary.' },
      { question: 'Which keyword is used to handle exceptions in Python?', options: ['try', 'check', 'guard', 'catch-only'], answer: 'try', hint: 'It is usually paired with except.' },
      { question: 'Which method adds an item to the end of a Python list?', options: ['append', 'push', 'addLast', 'insertEnd'], answer: 'append', hint: 'It is called on the list object.' },
      { question: 'Which Python statement imports a module?', options: ['import', 'include', 'require', 'using'], answer: 'import', hint: 'It loads modules such as math or os.' }
    ])
  },
  {
    slug: 'html',
    name: 'HTML Programming Quiz',
    label: 'HTML',
    color: '#FFEDD5',
    iconColor: '#EA580C',
    description: 'Practice semantic HTML elements, forms, links, and images.',
    levels: buildLevels([
      { question: 'Which HTML element is used for the main heading on a page?', options: ['<h1>', '<head>', '<title>', '<header-only>'], answer: '<h1>', hint: 'It is the largest semantic heading element.' },
      { question: 'Which attribute provides alternate text for an image?', options: ['alt', 'src', 'href', 'title-only'], answer: 'alt', hint: 'Screen readers use this when describing an image.' },
      { question: 'Which tag creates a clickable hyperlink?', options: ['<a>', '<link>', '<button-link>', '<href>'], answer: '<a>', hint: 'It usually uses an href attribute.' },
      { question: 'Which HTML element is best for a numbered list?', options: ['<ol>', '<ul>', '<li-only>', '<list>'], answer: '<ol>', hint: 'The letter o stands for ordered.' },
      { question: 'Which input type should be used for an email field?', options: ['email', 'mailbox', 'text-email', 'address'], answer: 'email', hint: 'Browsers can validate this format automatically.' }
    ])
  },
  {
    slug: 'css',
    name: 'CSS Programming Quiz',
    label: 'CSS',
    color: '#DBEAFE',
    iconColor: '#2563EB',
    description: 'Practice selectors, layout, spacing, and CSS units.',
    levels: buildLevels([
      { question: 'Which CSS property changes text color?', options: ['color', 'font-color', 'text-paint', 'foreground'], answer: 'color', hint: 'It directly controls the foreground text color.' },
      { question: 'Which CSS property controls the space inside an element border?', options: ['padding', 'margin', 'gap', 'outline'], answer: 'padding', hint: 'Margin is outside; this one is inside.' },
      { question: 'Which display value enables flexbox layout?', options: ['flex', 'grid-flex', 'inline-grid', 'block-flex'], answer: 'flex', hint: 'Use display with this value.' },
      { question: "Which selector targets an element with id='app'?", options: ['#app', '.app', 'app', '*app'], answer: '#app', hint: 'IDs use the hash symbol.' },
      { question: 'Which unit is relative to the root element font size?', options: ['rem', 'px', 'vh', 'percent-only'], answer: 'rem', hint: 'It means root em.' }
    ])
  },
  {
    slug: 'react',
    name: 'React Programming Quiz',
    label: 'RCT',
    color: '#E0F2FE',
    iconColor: '#0891B2',
    description: 'Practice React hooks, props, JSX, effects, and rendering.',
    levels: buildLevels([
      { question: 'Which React hook stores component state?', options: ['useState', 'useRoute', 'useClass', 'useStyle'], answer: 'useState', hint: 'It returns a value and a setter function.' },
      { question: 'What syntax lets React describe UI inside JavaScript?', options: ['JSX', 'SQL', 'YAML', 'Bash'], answer: 'JSX', hint: 'It looks like HTML, but lives in JavaScript.' },
      { question: 'Which prop is required when rendering lists of elements?', options: ['key', 'idOnly', 'indexOnly', 'name'], answer: 'key', hint: 'React uses it to identify list items efficiently.' },
      { question: 'Which hook runs side effects after render?', options: ['useEffect', 'useState', 'useMemoOnly', 'useEventLoop'], answer: 'useEffect', hint: 'It is commonly used for fetching data or subscriptions.' },
      { question: 'In React, data passed from parent to child components is called what?', options: ['props', 'signals', 'packets', 'exports'], answer: 'props', hint: 'Short for properties.' }
    ])
  },
  {
    slug: 'nodejs',
    name: 'NodeJs Programming Quiz',
    label: 'NODE',
    color: '#DCFCE7',
    iconColor: '#15803D',
    description: 'Practice Node.js runtime, modules, npm, and backend basics.',
    levels: buildLevels([
      { question: 'Which runtime lets JavaScript run outside the browser?', options: ['Node.js', 'HTML', 'CSS', 'MongoDB'], answer: 'Node.js', hint: 'It is commonly used for backend JavaScript.' },
      { question: 'Which file usually stores Node.js project dependencies?', options: ['package.json', 'index.html', 'style.css', 'README.only'], answer: 'package.json', hint: 'npm reads this file.' },
      { question: 'Which command installs dependencies listed in package.json?', options: ['npm install', 'node install', 'npm build-only', 'install node_modules'], answer: 'npm install', hint: 'It creates or updates node_modules.' },
      { question: 'Which built-in Node.js module is used to work with file paths?', options: ['path', 'route', 'url-only', 'folder'], answer: 'path', hint: 'It provides utilities like join and resolve.' },
      { question: 'What object does CommonJS use to expose values from a module?', options: ['module.exports', 'window.export', 'public.module', 'return.exports'], answer: 'module.exports', hint: 'You often see require used with this module system.' }
    ])
  },
  {
    slug: 'dsa',
    name: 'DSA Programming Quiz',
    label: 'DSA',
    color: '#F3E8FF',
    iconColor: '#9333EA',
    description: 'Practice data structures, Big O, trees, stacks, and sorting.',
    levels: buildLevels([
      { question: 'Which data structure follows Last In, First Out?', options: ['Stack', 'Queue', 'Tree', 'Graph'], answer: 'Stack', hint: 'Think of plates stacked on top of each other.' },
      { question: 'Which data structure follows First In, First Out?', options: ['Queue', 'Stack', 'Heap', 'Set'], answer: 'Queue', hint: 'Think of people waiting in line.' },
      { question: 'What is the average lookup time for a hash table?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], answer: 'O(1)', hint: 'Hashing aims for constant time access.' },
      { question: 'Which traversal visits left subtree, root, then right subtree?', options: ['Inorder', 'Preorder', 'Postorder', 'Levelorder'], answer: 'Inorder', hint: 'The root is visited in the middle.' },
      { question: 'Which sorting algorithm repeatedly selects the smallest remaining item?', options: ['Selection Sort', 'Merge Sort', 'Quick Sort', 'Radix Sort'], answer: 'Selection Sort', hint: 'Its name describes choosing an item each pass.' }
    ])
  }
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Path to fallback database file
const FALLBACK_DB_PATH = path.join(__dirname, 'db_fallback.json');

// Initialize fallback database file if it doesn't exist
if (!fs.existsSync(FALLBACK_DB_PATH)) {
  const initialData = {
    users: [],
    leaderboard: [
      { id: 1, name: "AlphaExplorer", score: 400, date: formatScoreTimestamp() },
      { id: 2, name: "QuizMaster", score: 320, date: formatScoreTimestamp() },
      { id: 3, name: "JungleJane", score: 260, date: formatScoreTimestamp() },
      { id: 4, name: "HistoryBuff", score: 200, date: formatScoreTimestamp() }
    ],
    progress: []
  };
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialData, null, 2));
}

// Helper to read fallback data
const readFallbackData = () => {
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading fallback file:', err);
    return { users: [], leaderboard: [], progress: [] };
  }
};

// Helper to write fallback data
const writeFallbackData = (data) => {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing fallback file:', err);
  }
};

// Mongoose Connection with Graceful Fallback
let isMongoDBConnected = false;

console.log('🔌 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 5 seconds timeout
})
  .then(async () => {
    console.log('✅ Connected to MongoDB database successfully at ' + MONGODB_URI);
    isMongoDBConnected = true;

    // Drop stale indexes that don't match current schema
    try {
      const usersCollection = mongoose.connection.collection('users');
      const indexes = await usersCollection.indexes();
      for (const idx of indexes) {
        if (idx.key && idx.key.email !== undefined) {
          console.log('🧹 Dropping stale email index from users collection...');
          await usersCollection.dropIndex(idx.name);
          console.log('✅ Stale email index removed successfully.');
        }
      }
    } catch (e) {
      // Ignore if index doesn't exist
      if (e.codeName !== 'IndexNotFound') {
        console.log('Note: Could not clean stale indexes:', e.message);
      }
    }

    seedDefaultData();
    seedQuizData();
    seedResumeSections();
    cleanupDuplicateLeaderboardEntries();
  })
  .catch(err => {
    console.log('\n⚠️  MongoDB Connection Failed!');
    console.log(`Could not connect to database at ${MONGODB_URI}.`);
    console.log('💡 INSTRUCTIONS: Please ensure MongoDB is installed and running on your system.');
    console.log('💡 Alternatively, specify a custom connection string in the MONGODB_URI environment variable.');
    console.log('🛡️  RESILIENT MODE: Falling back to local file-based database (db_fallback.json).\n');
    isMongoDBConnected = false;
  });

// --- MongoDB / Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profilePhoto: { type: String, default: '' },
  fullName: { type: String, default: '' },
  collegeName: { type: String, default: '' },
  branch: { type: String, default: '' },
  year: { type: String, default: '' },
  bio: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  categories: {
    type: Map,
    of: new mongoose.Schema({
      passed: { type: [Number], default: [] },
      score: { type: Number, default: 0 }
    }, { _id: false }),
    default: {}
  },
  science: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  jungle: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  math: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  history: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  highestScore: { type: Number, default: 0 }
});

const LeaderboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: String, required: true },
  id: { type: Number, unique: true, required: true },
  type: { type: String, default: 'quiz' },
  topic: { type: String, default: '' },
  maxScore: { type: Number, default: 0 }
});

const QuizLevelSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: String, required: true },
  hint: { type: String, default: '' },
  image: { type: String, default: '' }
}, { _id: false });

const QuizCategorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  legacyName: { type: String, default: '' },
  label: { type: String, required: true },
  color: { type: String, required: true },
  iconColor: { type: String, required: true },
  description: { type: String, required: true },
  levels: { type: [QuizLevelSchema], default: [] }
});

const InterviewResultSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  topic: { type: String, default: '' },
  overallScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  technicalScore: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 },
  feedbackSummary: { type: String, default: '' },
  strengths: { type: [String], default: [] },
  areasForImprovement: { type: [String], default: [] },
  questionCount: { type: Number, default: 0 }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Progress = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);
const Leaderboard = mongoose.models.Leaderboard || mongoose.model('Leaderboard', LeaderboardSchema);
const QuizCategory = mongoose.models.QuizCategory || mongoose.model('QuizCategory', QuizCategorySchema);
const InterviewResult = mongoose.models.InterviewResult || mongoose.model('InterviewResult', InterviewResultSchema);

// --- Resume AI Schemas ---
const ResumeDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  personalDetails: { type: Object, default: {} },
  education: { type: Array, default: [] },
  skills: { type: Array, default: [] },
  projects: { type: Array, default: [] },
  experience: { type: Array, default: [] },
  certifications: { type: Array, default: [] },
  achievements: { type: Array, default: [] },
  technologies: { type: Array, default: [] },
  publications: { type: Array, default: [] },
  dynamicSections: { type: Object, default: {} },
  rawText: { type: String, default: '' },
  parsedAt: { type: Date, default: Date.now }
});

const ResumeSectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  icon: { type: String, default: 'FaFileAlt' },
  description: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isRequired: { type: Boolean, default: false },
  allowMultiple: { type: Boolean, default: false }
});

const ResumeInterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  category: { type: String, default: '' },
  difficulty: { type: String, default: '' },
  overallScore: { type: Number, default: 0 },
  technicalScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  confidenceScore: { type: Number, default: 0 },
  fluencyScore: { type: Number, default: 0 },
  grammarScore: { type: Number, default: 0 },
  originalityScore: { type: Number, default: 0 },
  aiLikelihood: { type: Number, default: 0 },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  sectionWisePerformance: { type: Object, default: {} },
  proctoringViolations: { type: Array, default: [] },
  hiringRecommendation: { type: String, default: '' },
  qaList: { type: Array, default: [] }
});

const ResumeData = mongoose.models.ResumeData || mongoose.model('ResumeData', ResumeDataSchema);
const ResumeInterview = mongoose.models.ResumeInterview || mongoose.model('ResumeInterview', ResumeInterviewSchema);
const ResumeSection = mongoose.models.ResumeSection || mongoose.model('ResumeSection', ResumeSectionSchema);

// Seed default data to MongoDB if connected and empty
async function seedDefaultData() {
  try {
    const count = await Leaderboard.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial leaderboard entries to MongoDB...');
      const fallback = readFallbackData();
      await Leaderboard.insertMany(fallback.leaderboard);
      console.log('✅ Seeding complete!');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

async function seedQuizData() {
  try {
    for (const category of QUIZ_CATEGORIES) {
      await QuizCategory.findOneAndUpdate(
        { slug: category.slug },
        category,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`Quiz categories synced to MongoDB: ${QUIZ_CATEGORIES.length}`);
  } catch (err) {
    console.error('Error seeding quiz categories:', err);
  }
}

const DEFAULT_RESUME_SECTIONS = [
  { name: 'Summary', key: 'summary', icon: 'FaFileAlt', description: 'A brief overview of your professional background.', isRequired: true, allowMultiple: false },
  { name: 'Skills', key: 'skills', icon: 'FaCode', description: 'Core competencies and technical skills.', isRequired: true, allowMultiple: true },
  { name: 'Experience', key: 'experience', icon: 'FaBriefcase', description: 'Your professional work history.', isRequired: false, allowMultiple: true },
  { name: 'Internships', key: 'internships', icon: 'FaUserGraduate', description: 'Internships and trainee programs.', isRequired: false, allowMultiple: true },
  { name: 'Projects', key: 'projects', icon: 'FaFolderOpen', description: 'Notable projects you have built.', isRequired: false, allowMultiple: true },
  { name: 'Education', key: 'education', icon: 'FaGraduationCap', description: 'Academic background and degrees.', isRequired: true, allowMultiple: true },
  { name: 'Certifications', key: 'certifications', icon: 'FaCertificate', description: 'Professional certifications and licenses.', isRequired: false, allowMultiple: true },
  { name: 'Achievements', key: 'achievements', icon: 'FaTrophy', description: 'Notable awards and accomplishments.', isRequired: false, allowMultiple: true },
  { name: 'Technologies', key: 'technologies', icon: 'FaLaptopCode', description: 'Tools and frameworks you use.', isRequired: false, allowMultiple: true },
  { name: 'Publications', key: 'publications', icon: 'FaBook', description: 'Published papers or articles.', isRequired: false, allowMultiple: true },
  { name: 'Research', key: 'research', icon: 'FaMicroscope', description: 'Academic or professional research.', isRequired: false, allowMultiple: true },
  { name: 'Patents', key: 'patents', icon: 'FaLightbulb', description: 'Patents filed or granted.', isRequired: false, allowMultiple: true },
  { name: 'Awards', key: 'awards', icon: 'FaMedal', description: 'Honors and awards received.', isRequired: false, allowMultiple: true },
  { name: 'Volunteer Experience', key: 'volunteer', icon: 'FaHandsHelping', description: 'Volunteer work and community service.', isRequired: false, allowMultiple: true },
  { name: 'Positions of Responsibility', key: 'responsibility', icon: 'FaUsers', description: 'Leadership roles in clubs or organizations.', isRequired: false, allowMultiple: true },
  { name: 'Hackathons', key: 'hackathons', icon: 'FaLaptop', description: 'Hackathons participated in.', isRequired: false, allowMultiple: true },
  { name: 'Competitions', key: 'competitions', icon: 'FaFlagCheckered', description: 'Competitive programming or other contests.', isRequired: false, allowMultiple: true },
  { name: 'Training', key: 'training', icon: 'FaChalkboardTeacher', description: 'Professional training completed.', isRequired: false, allowMultiple: true },
  { name: 'Workshops', key: 'workshops', icon: 'FaTools', description: 'Workshops attended or conducted.', isRequired: false, allowMultiple: true },
  { name: 'Languages', key: 'languages', icon: 'FaLanguage', description: 'Languages you can speak or write.', isRequired: false, allowMultiple: true },
  { name: 'Interests', key: 'interests', icon: 'FaHeart', description: 'Hobbies and personal interests.', isRequired: false, allowMultiple: true },
  { name: 'Extracurricular Activities', key: 'extracurricular', icon: 'FaFutbol', description: 'Activities outside of academics/work.', isRequired: false, allowMultiple: true },
  { name: 'References', key: 'references', icon: 'FaAddressBook', description: 'Professional references.', isRequired: false, allowMultiple: true },
];

async function seedResumeSections() {
  try {
    const count = await ResumeSection.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding default resume sections to MongoDB...');
      const sectionsToInsert = DEFAULT_RESUME_SECTIONS.map((sec, index) => ({
        ...sec,
        displayOrder: index
      }));
      await ResumeSection.insertMany(sectionsToInsert);
      console.log(`✅ Seeded ${sectionsToInsert.length} resume sections!`);
    }
  } catch (err) {
    console.error('Error seeding resume sections:', err);
  }
}

async function cleanupDuplicateLeaderboardEntries() {
  try {
    const rows = await Leaderboard.find().sort({ score: -1, _id: 1 });
    const keepByName = new Map();
    const duplicateIds = [];

    for (const row of rows) {
      const key = row.name?.toLowerCase();
      if (!key) continue;

      if (keepByName.has(key)) {
        duplicateIds.push(row._id);
      } else {
        keepByName.set(key, row._id);
      }
    }

    if (duplicateIds.length > 0) {
      await Leaderboard.deleteMany({ _id: { $in: duplicateIds } });
      console.log(`Cleaned ${duplicateIds.length} duplicate leaderboard row(s).`);
    }
  } catch (err) {
    console.error('Error cleaning duplicate leaderboard entries:', err);
  }
}

// --- SECURE AUTHENTICATION ENDPOINTS ---

app.post('/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  if (isMongoDBConnected) {
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      // Hash password securely
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword });
      await newUser.save();

      // Create new blank progress for user
      const newProgress = new Progress({
        userId: newUser._id.toString(),
        categories: createInitialCategoryProgress(),
        science: { passed: [], score: 0 },
        jungle: { passed: [], score: 0 },
        math: { passed: [], score: 0 },
        history: { passed: [], score: 0 },
        highestScore: 0
      });
      await newProgress.save();

      res.status(201).json({
        success: true,
        userId: newUser._id.toString(),
        username: newUser.username
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Resilient Fallback Database Mode
    const data = readFallbackData();
    const existingUser = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    const userId = 'offline_' + Date.now();
    const newUser = { id: userId, username, email, password }; // plain-text or simplified storage for offline testing
    data.users.push(newUser);

    const newProgress = {
      id: Date.now().toString(),
      userId: userId,
      categories: createInitialCategoryProgress(),
      science: { passed: [], score: 0 },
      jungle: { passed: [], score: 0 },
      math: { passed: [], score: 0 },
      history: { passed: [], score: 0 },
      highestScore: 0
    };
    data.progress.push(newProgress);

    writeFallbackData(data);
    res.status(201).json({
      success: true,
      userId,
      username
    });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (isMongoDBConnected) {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }

      res.json({
        success: true,
        userId: user._id.toString(),
        username: user.username
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Resilient Fallback Database Mode
    const data = readFallbackData();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    res.json({
      success: true,
      userId: user.id,
      username: user.username
    });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !email || !newPassword) {
    return res.status(400).json({ error: 'Username, email and new password are required' });
  }

  if (isMongoDBConnected) {
    try {
      const user = await User.findOne({ username, email });
      if (!user) {
        return res.status(400).json({ error: 'Invalid username or email' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Resilient Fallback Database Mode
    const data = readFallbackData();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or email' });
    }

    user.password = newPassword;
    writeFallbackData(data);

    res.json({ success: true, message: 'Password updated successfully' });
  }
});

// --- EXPRESS API ROUTES ---

app.get('/quiz-categories', async (req, res) => {
  if (isMongoDBConnected) {
    try {
      const categories = await QuizCategory.find().sort({ _id: 1 });
      return res.json(categories);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.json(QUIZ_CATEGORIES);
});

app.get('/quiz-categories/:slug', async (req, res) => {
  const { slug } = req.params;

  if (isMongoDBConnected) {
    try {
      const category = await QuizCategory.findOne({ slug });
      if (!category) return res.status(404).json({ error: 'Quiz category not found' });
      return res.json(category);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const category = QUIZ_CATEGORIES.find(item => item.slug === slug);
  if (!category) return res.status(404).json({ error: 'Quiz category not found' });
  return res.json(category);
});

// 1. User Management CRUD
app.get('/users', async (req, res) => {
  if (isMongoDBConnected) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json(data.users);
  }
});

app.post('/users', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  if (isMongoDBConnected) {
    try {
      let existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(200).json(existingUser); // return existing
      }
      const newUser = new User({ username });
      await newUser.save();
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    let existingUser = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(200).json(existingUser);
    }
    const newUser = { id: Date.now(), username, createdAt: new Date() };
    data.users.push(newUser);
    writeFallbackData(data);
    res.status(201).json(newUser);
  }
});

app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.users.findIndex(u => u.id.toString() === id.toString());
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.users[idx]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  }
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      await User.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const filtered = data.users.filter(u => u.id.toString() !== id.toString());
    data.users = filtered;
    writeFallbackData(data);
    res.json({ success: true });
  }
});

// 2. User Progress CRUD
app.get('/progress', async (req, res) => {
  const { userId } = req.query;

  if (isMongoDBConnected) {
    try {
      if (userId) {
        const progress = await Progress.findOne({ userId });
        res.json(progress ? [progress] : []);
      } else {
        const progressList = await Progress.find();
        res.json(progressList);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (userId) {
      const filtered = data.progress.filter(p => p.userId === userId);
      res.json(filtered);
    } else {
      res.json(data.progress);
    }
  }
});

app.post('/progress', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (isMongoDBConnected) {
    try {
      let existingProgress = await Progress.findOne({ userId });
      if (existingProgress) {
        return res.status(200).json(existingProgress);
      }
      const newProgress = new Progress(req.body);
      await newProgress.save();
      res.status(201).json(newProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    let existingProgress = data.progress.find(p => p.userId === userId);
    if (existingProgress) {
      return res.status(200).json(existingProgress);
    }
    const newProgress = { id: Date.now().toString(), ...req.body };
    data.progress.push(newProgress);
    writeFallbackData(data);
    res.status(201).json(newProgress);
  }
});

app.put('/progress/:id', async (req, res) => {
  const { id } = req.params;

  if (isMongoDBConnected) {
    try {
      // Allow updating by userId or mongoose _id
      let updatedProgress;
      if (mongoose.Types.ObjectId.isValid(id)) {
        updatedProgress = await Progress.findByIdAndUpdate(id, req.body, { new: true });
      }

      if (!updatedProgress) {
        updatedProgress = await Progress.findOneAndUpdate({ userId: id }, req.body, { new: true });
      }

      if (!updatedProgress) {
        // Fallback: If not found, let's create a new one
        updatedProgress = new Progress({ userId: id, ...req.body });
        await updatedProgress.save();
      }

      res.json(updatedProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.progress.findIndex(p => p.id === id || p.userId === id);
    if (idx !== -1) {
      data.progress[idx] = { ...data.progress[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.progress[idx]);
    } else {
      // Create new fallback progress
      const newProgress = { id: Date.now().toString(), userId: id, ...req.body };
      data.progress.push(newProgress);
      writeFallbackData(data);
      res.json(newProgress);
    }
  }
});

app.delete('/progress/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Progress.findByIdAndDelete(id);
      } else {
        await Progress.findOneAndDelete({ userId: id });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const filtered = data.progress.filter(p => p.id !== id && p.userId !== id);
    data.progress = filtered;
    writeFallbackData(data);
    res.json({ success: true });
  }
});

// 3. Leaderboard CRUD
app.get('/leaderboard', async (req, res) => {
  if (isMongoDBConnected) {
    try {
      const leaderboard = await Leaderboard.find().sort({ score: -1 });
      res.json(dedupeLeaderboardRows(leaderboard));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json(dedupeLeaderboardRows(data.leaderboard));
  }
});

app.post('/leaderboard', async (req, res) => {
  const entry = req.body;
  if (!entry.name || entry.score === undefined) {
    return res.status(400).json({ error: 'Name and score are required' });
  }

  const normalizedName = entry.name.trim();
  if (!normalizedName) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const score = Number(entry.score);
  if (!Number.isFinite(score)) {
    return res.status(400).json({ error: 'Score must be a valid number' });
  }

  if (!entry.id) {
    entry.id = Date.now() + Math.floor(Math.random() * 1000);
  }
  if (!entry.date) {
    entry.date = formatScoreTimestamp();
  }
  entry.type = entry.type || 'quiz';
  entry.topic = entry.topic || '';

  if (isMongoDBConnected) {
    try {
      const existingEntries = await Leaderboard.find({
        name: new RegExp(`^${escapeRegExp(normalizedName)}$`, 'i'),
        type: entry.type,
        topic: entry.topic
      }).sort({ score: -1, _id: 1 });

      if (existingEntries.length > 0) {
        const [primaryEntry, ...duplicateEntries] = existingEntries;

        primaryEntry.score = score;
        if (entry.maxScore) primaryEntry.maxScore = entry.maxScore;
        primaryEntry.date = entry.date;
        primaryEntry.topic = entry.topic;
        await primaryEntry.save();

        if (duplicateEntries.length > 0) {
          const duplicateIds = duplicateEntries.map(e => e._id);
          await Leaderboard.deleteMany({ _id: { $in: duplicateIds } });
        }

        return res.json(primaryEntry);
      }

      const newEntry = new Leaderboard({ ...entry, name: normalizedName, score, type: entry.type, topic: entry.topic, maxScore: entry.maxScore || 0 });
      await newEntry.save();
      return res.status(201).json(newEntry);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const existingIndex = data.leaderboard.findIndex(e => e.name.toLowerCase() === normalizedName.toLowerCase() && (e.type || 'quiz') === entry.type && (e.topic || '') === entry.topic);
    
    if (existingIndex >= 0) {
      data.leaderboard[existingIndex].score = score;
      if (entry.maxScore) data.leaderboard[existingIndex].maxScore = entry.maxScore;
      data.leaderboard[existingIndex].date = entry.date;
      data.leaderboard[existingIndex].topic = entry.topic;
      
      const filtered = data.leaderboard.filter((e, idx) => 
        idx === existingIndex || e.name.toLowerCase() !== normalizedName.toLowerCase() || (e.type || 'quiz') !== entry.type || (e.topic || '') !== entry.topic
      );
      data.leaderboard = filtered;
      writeFallbackData(data);
      return res.json(data.leaderboard[existingIndex]);
    }

    const createdEntry = {
      name: normalizedName,
      score,
      date: entry.date,
      id: entry.id,
      type: entry.type,
      topic: entry.topic,
      maxScore: entry.maxScore || 0
    };
    data.leaderboard.push(createdEntry);
    writeFallbackData(data);
    return res.status(201).json(createdEntry);
  }
});

app.put('/leaderboard/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      let updatedEntry = await Leaderboard.findOneAndUpdate({ id: Number(id) }, req.body, { new: true });
      if (!updatedEntry && mongoose.Types.ObjectId.isValid(id)) {
        updatedEntry = await Leaderboard.findByIdAndUpdate(id, req.body, { new: true });
      }
      res.json(updatedEntry);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.leaderboard.findIndex(l => l.id.toString() === id.toString());
    if (idx !== -1) {
      data.leaderboard[idx] = { ...data.leaderboard[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.leaderboard[idx]);
    } else {
      res.status(404).json({ error: 'Leaderboard entry not found' });
    }
  }
});

/*
 * Keep this file's leaderboard behavior one-row-per-user:
 * POST /leaderboard creates a row for a new name, or updates score/date for
 * an existing name and removes older duplicate rows for that same name.
 */

app.post('/api/interview/generate', async (req, res) => {
  const { topic, numQuestions } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  const count = numQuestions || 10;

  if (!process.env.GEMINI_API_KEY && !hasXAIKey() && (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here')) {
    // Fallback if no API key is provided
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
        // Fallback to dummy if Groq isn't setup either
        console.log("GROQ_API_KEY not set. Using dummy questions.");
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
});

app.post('/api/interview/evaluate', async (req, res) => {
  const { questions, userAnswers } = req.body;
  if (!questions || !userAnswers) return res.status(400).json({ error: 'Questions and userAnswers required' });

  if (!process.env.GEMINI_API_KEY && !hasXAIKey() && (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here')) {
    const dummyEvaluation = questions.map((_, i) => ({
      score: 7,
      feedback: "Dummy feedback: This is a simulated evaluation since no API key is provided."
    }));
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
      `).join('\n')}
    `;

    let cleanedText;
    if (prefersXAI()) {
      try {
        cleanedText = await callXAIChat(prompt);
      } catch (err) {
        console.log("xAI API Error. Falling back to Gemini/Groq for evaluation...", err.message);
      }
    }

    if (!cleanedText && process.env.GEMINI_API_KEY) {
      try {
        cleanedText = await callGeminiChat(prompt);
      } catch (err) {
        console.log("Gemini API Error. Falling back to xAI/Groq for evaluation...");
      }
    }

    if (!cleanedText && hasXAIKey()) {
      try {
        cleanedText = await callXAIChat(prompt);
      } catch (err) {
        console.log("xAI API Error. Falling back to Groq Llama 3 for evaluation...", err.message);
      }
    }

    if (!cleanedText) {
      if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
        const dummyEvaluation = questions.map((_, i) => ({
          score: 7,
          feedback: "Simulated feedback: no working Gemini, xAI, or Groq key was found."
        }));
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
});

// --- PROFILE UPDATE ENDPOINT ---
app.put('/auth/update-profile', async (req, res) => {
  const { userId, email, currentPassword, newPassword, profilePhoto, fullName, collegeName, branch, year, bio } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  // Gmail validation
  if (email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email)) {
    return res.status(400).json({ error: 'Only valid Gmail addresses are allowed (e.g., name@gmail.com).' });
  }

  if (isMongoDBConnected) {
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Password change flow
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        user.password = await bcrypt.hash(newPassword, 10);
      }

      if (email !== undefined) user.email = email;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
      if (fullName !== undefined) user.fullName = fullName;
      if (collegeName !== undefined) user.collegeName = collegeName;
      if (branch !== undefined) user.branch = branch;
      if (year !== undefined) user.year = year;
      if (bio !== undefined) user.bio = bio;

      await user.save();

      res.json({
        success: true,
        user: {
          username: user.username,
          email: user.email,
          profilePhoto: user.profilePhoto,
          fullName: user.fullName,
          collegeName: user.collegeName,
          branch: user.branch,
          year: user.year,
          bio: user.bio,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    // Fallback mode
    const data = readFallbackData();
    const user = data.users.find(u => (u.id || '').toString() === userId.toString());
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (newPassword) {
      if (!currentPassword || currentPassword !== user.password) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      user.password = newPassword;
    }
    if (email !== undefined) user.email = email;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (fullName !== undefined) user.fullName = fullName;
    if (collegeName !== undefined) user.collegeName = collegeName;
    if (branch !== undefined) user.branch = branch;
    if (year !== undefined) user.year = year;
    if (bio !== undefined) user.bio = bio;

    writeFallbackData(data);
    res.json({ success: true, user: { username: user.username, email: user.email, profilePhoto: user.profilePhoto, fullName: user.fullName, collegeName: user.collegeName, branch: user.branch, year: user.year, bio: user.bio } });
  }
});

// --- GET USER PROFILE ---
app.get('/auth/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  if (isMongoDBConnected) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const user = data.users.find(u => (u.id || '').toString() === userId.toString());
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  }
});

// --- INTERVIEW RESULT SAVE ---
app.post('/api/interview/save', async (req, res) => {
  const { userId, topic, overallScore, communicationScore, technicalScore, confidenceScore, feedbackSummary, strengths, areasForImprovement, questionCount } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const entry = {
    userId, topic: topic || '', overallScore: overallScore || 0,
    communicationScore: communicationScore || 0, technicalScore: technicalScore || 0,
    confidenceScore: confidenceScore || 0, feedbackSummary: feedbackSummary || '',
    strengths: strengths || [], areasForImprovement: areasForImprovement || [],
    questionCount: questionCount || 0, date: new Date()
  };

  if (isMongoDBConnected) {
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
});

// --- INTERVIEW HISTORY ---
app.get('/api/interview/history/:userId', async (req, res) => {
  const { userId } = req.params;
  if (isMongoDBConnected) {
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
});

// --- AI RESUME-BASED MOCK INTERVIEW ENDPOINTS ---
app.post('/api/resume/upload', async (req, res) => {
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

    // Call the configured AI provider to parse the structured data.
    let structuredData = {
      personalDetails: {}, education: [], skills: [], projects: [], experience: [],
      certifications: [], achievements: [], technologies: [], publications: []
    };

    const fallbackStructuredData = parseResumeFallback(rawText);

    if (hasGeminiKey() || hasXAIKey()) {
      const prompt = `Extract structured resume data from the following resume text.
Return ONLY a valid JSON object matching exactly the structure below. Be exhaustive and thorough.

For "skills": Extract every single programming language, framework, library, tool, database, cloud platform, and technology mentioned ANYWHERE in the resume. Return as a flat JSON array of short individual string tags like ["JavaScript", "React", "Node.js", "Python", "SQL", "Git", "Docker", "AWS"]. Do NOT group them or write long descriptions.
For "experience": Each entry should be a single string describing one job role, e.g. "Software Engineer at Google (2020-2023) - Built scalable microservices".
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
        
        // Split any comma/semicolon/bullet-grouped skills into individual tags
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
        console.log(`Resume parsed via AI: ${structuredData.skills.length} skills, ${structuredData.experience.length} experience, ${structuredData.projects.length} projects`);
      } catch (err) {
        console.error("AI Resume Parsing Error (using fallback parser):", err.message);
        structuredData = fallbackStructuredData;
      }
    } else {
      console.log('No valid AI key found. Using regex-based resume parser.');
      structuredData = fallbackStructuredData;
    }

    if (isMongoDBConnected) {
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
});

app.get('/api/resume/:userId', async (req, res) => {
  const { userId } = req.params;
  if (isMongoDBConnected) {
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
});

app.post('/api/resume/generate-questions', async (req, res) => {
  const { userId, resumeText, difficulty, categories, countPerCategory } = req.body;
  if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

  const safeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['Skills', 'Experience'];
  const fallbackQuestions = buildFallbackQuestions(safeCategories, countPerCategory);

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, questions: fallbackQuestions });
  }

  // 1. Fetch structured resume data
  let structuredData = null;
  if (userId) {
    try {
      if (isMongoDBConnected) {
        structuredData = await ResumeData.findOne({ userId });
      } else {
        const data = readFallbackData();
        structuredData = (data.resumeData || []).find(r => r.userId === userId);
      }
    } catch (err) {
      console.warn("Could not load structured resume data for RAG:", err.message);
    }
  }

  // 2. Perform RAG Retrieval for each category
  let retrievedContext = '';
  try {
    const ragEngine = new RAGEngine(resumeText, structuredData, process.env.GEMINI_API_KEY);
    await ragEngine.initialize();
    const ragSummary = ragEngine.getSummary();
    console.log('RAG Summary:', ragSummary);
    
    const retrievedChunks = [];
    for (const cat of safeCategories) {
      const chunks = await ragEngine.retrieve(cat, 4);
      if (chunks.length > 0) {
        retrievedChunks.push(`[${cat.toUpperCase()} - Resume Context]\n${chunks.join('\n')}`);
      }
    }
    retrievedContext = retrievedChunks.join('\n\n');
  } catch (err) {
    console.error("RAG retrieval error:", err.message);
  }

  try {
    const prompt = `
You are an expert Senior Software Engineering Interviewer from India.

You must conduct this interview and ask all questions in professional Indian English (using standard Indian technical recruiter tone, appropriate polite phrasing, and recruiter terminology where natural).

You must only ask questions based on the candidate's uploaded resume. Never ask unrelated questions or generic questions that cannot be tied to the resume text.

Base your questions strictly on the following RAG-retrieved sections of the candidate's resume:
${retrievedContext}

Overall Resume Text (for secondary reference/verification):
${resumeText.substring(0, 10000)}

Generate an array of ${safeCategories.length * (countPerCategory || 1)} resume-based interview questions.
Difficulty level: ${difficulty}. Difficulty should gradually increase across the array, starting with introductory resume validation and moving toward deeper technical reasoning.
Categories needed: ${safeCategories.join(', ')} (${countPerCategory || 1} questions per category).

Question rules:
- Ask one clear question per item.
- Each question must mention, quote, or clearly reference a specific skill, project, role, education item, certification, technology, metric, or responsibility from the resume.
- Do not invent employers, projects, tools, degrees, certifications, or experience not present in the resume.
- Avoid HR, behavioral, trivia, or unrelated coding questions unless the resume itself includes the relevant work.
- Include an idealAnswer that describes what a strong candidate should cover, grounded in the resume.

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
    console.error('Question gen error:', err);
    res.json({ success: true, questions: fallbackQuestions });
  }
});

app.post('/api/resume/follow-up', async (req, res) => {
  const { userId, resumeText, currentQuestion, userAnswer } = req.body;
  
  const fallbackFollowUp = { question: "Can you give a concrete example from your resume that supports your answer?", idealAnswer: "A strong answer should cite a specific resume item and explain the impact clearly." };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, question: fallbackFollowUp });
  }

  // 1. Fetch structured resume data
  let structuredData = null;
  if (userId) {
    try {
      if (isMongoDBConnected) {
        structuredData = await ResumeData.findOne({ userId });
      } else {
        const data = readFallbackData();
        structuredData = (data.resumeData || []).find(r => r.userId === userId);
      }
    } catch (err) {
      console.warn("Could not load structured resume data for RAG:", err.message);
    }
  }

  // 2. Perform RAG Retrieval based on current question and user's answer
  let retrievedContext = '';
  try {
    const ragEngine = new RAGEngine(resumeText, structuredData, process.env.GEMINI_API_KEY);
    await ragEngine.initialize();
    
    const query = `${currentQuestion} ${userAnswer}`;
    const chunks = await ragEngine.retrieve(query, 4);
    retrievedContext = chunks.join('\n');
  } catch (err) {
    console.error("RAG retrieval error for follow-up:", err.message);
  }

  try {
    const prompt = `
You are an expert Senior Software Engineering Interviewer from India.

Generate exactly one follow-up question in professional Indian English (using standard Indian technical recruiter tone and phrasing) based on:
1. The candidate's uploaded resume.
2. The current question.
3. The candidate's answer.

Base your question strictly on these retrieved resume facts if relevant:
${retrievedContext}

General Resume (for verification):
${resumeText.substring(0, 10000)}

Rules:
- The follow-up must stay strictly related to a resume item or to the candidate's previous answer about that resume item.
- Never ask unrelated or generic questions.
- Increase depth if the answer was good; ask for clarification if the answer was shallow, vague, or missing technical detail.
- Evaluate the same dimensions implicitly: technical accuracy, communication, confidence, problem solving, and depth of knowledge.

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
    console.error('Follow-up error:', err);
    res.json({ success: true, question: fallbackFollowUp });
  }
});

app.post('/api/resume/evaluate-answer', async (req, res) => {
  const { question, idealAnswer, userAnswer } = req.body;
  const fallbackEvaluation = { score: 7, feedback: "Good effort. Add a more specific example from your resume to strengthen your answer." };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, evaluation: fallbackEvaluation });
  }

  try {
    const prompt = `
You are a professional Senior Software Engineering interviewer evaluating one answer.

Evaluate only against the resume-grounded question and expected answer. Score out of 10 based on:
- Technical Accuracy
- Communication
- Confidence
- Problem Solving
- Depth of Knowledge

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
});

app.post('/api/resume/detect-ai', async (req, res) => {
  const { answer } = req.body;
  const fallbackDetection = { aiLikelihood: 10, originalityScore: 90, personalizationScore: 85, confidenceScore: 80, explanation: "Response looks personalized enough for a resume-based interview." };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, detection: fallbackDetection });
  }

  try {
    const prompt = `
Analyze this answer for AI-generation likelihood. Look for generic explanations, lack of personalization, repetitive patterns, or overly formal language.
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
});

app.post('/api/resume/final-report', async (req, res) => {
  const { qaList, resumeText = '' } = req.body;
  const fallbackReport = {
    technicalScore: 75,
    communicationScore: 75,
    confidenceScore: 75,
    resumeMatch: 80,
    strongAreas: ["Connects answers to resume experience"],
    weakAreas: ["Needs more measurable impact and deeper technical examples"],
    improvementSuggestions: ["Use specific metrics, design tradeoffs, and implementation details from your projects."],
    strengths: ["Connects answers to resume experience"],
    weaknesses: ["Needs more measurable impact and deeper technical examples"],
    sectionWisePerformance: { "Resume Match": "Good" },
    hiringRecommendation: "Hire"
  };

  if (!hasGeminiKey() && !hasXAIKey()) {
    return res.json({ success: true, report: fallbackReport });
  }

  try {
    const prompt = `
You are a professional Senior Software Engineering interviewer.

Generate the final interview report. The interview must be evaluated only against the candidate's uploaded resume and the resume-based Q&A.

Evaluate:
- Technical Accuracy
- Communication
- Confidence
- Problem Solving
- Depth of Knowledge
- Resume Match

Resume:
${resumeText.substring(0, 12000)}

Q&A History: ${JSON.stringify(qaList.map(qa => ({ q: qa.question, ideal: qa.idealAnswer, a: qa.answer, score: qa.score, feedback: qa.feedback })))}

Return ONLY JSON:
{
  "technicalScore": 0,
  "communicationScore": 0,
  "confidenceScore": 0,
  "resumeMatch": 0,
  "strongAreas": ["string"],
  "weakAreas": ["string"],
  "improvementSuggestions": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "sectionWisePerformance": { "Skills": "string feedback", "Experience": "string feedback", "Projects": "string feedback", "Education": "string feedback", "Certifications": "string feedback" },
  "hiringRecommendation": "Strong Hire" // Choose from: Strong Hire, Hire, Borderline, No Hire
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
});

app.post('/api/resume/save-session', async (req, res) => {
  const entry = req.body;
  if (!entry.userId) return res.status(400).json({ error: 'userId is required' });

  if (isMongoDBConnected) {
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
});

app.get('/api/resume/history/:userId', async (req, res) => {
  const { userId } = req.params;
  if (isMongoDBConnected) {
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
});

app.post('/api/resume/proctor-violation', async (req, res) => {
  const { userId, eventType } = req.body;
  console.log(`Proctoring violation logged for ${userId}: ${eventType}`);
  res.json({ success: true });
});

// --- Admin Resume Section Endpoints ---

app.get('/api/admin/sections', async (req, res) => {
  if (isMongoDBConnected) {
    try {
      const sections = await ResumeSection.find().sort({ displayOrder: 1 });
      res.json({ success: true, sections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json({ success: true, sections: data.resumeSections || DEFAULT_RESUME_SECTIONS });
  }
});

app.post('/api/admin/sections', async (req, res) => {
  const { name, key, icon, description, isRequired, allowMultiple, isActive } = req.body;
  if (!name || !key) return res.status(400).json({ error: 'Name and Key are required' });

  if (isMongoDBConnected) {
    try {
      const count = await ResumeSection.countDocuments();
      const newSection = new ResumeSection({
        name, key, icon, description, isRequired, allowMultiple, isActive,
        displayOrder: count
      });
      await newSection.save();
      res.status(201).json({ success: true, section: newSection });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    const newSection = {
      _id: Date.now().toString(),
      name, key, icon, description, isRequired, allowMultiple, isActive: isActive !== false,
      displayOrder: data.resumeSections.length
    };
    data.resumeSections.push(newSection);
    writeFallbackData(data);
    res.status(201).json({ success: true, section: newSection });
  }
});

app.put('/api/admin/sections/reorder', async (req, res) => {
  const { orderedIds } = req.body; // array of _id or key strings in new order
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });

  if (isMongoDBConnected) {
    try {
      const bulkOps = orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { displayOrder: index }
        }
      }));
      await ResumeSection.bulkWrite(bulkOps);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    orderedIds.forEach((id, index) => {
      const section = data.resumeSections.find(s => s._id === id || s.key === id);
      if (section) section.displayOrder = index;
    });
    data.resumeSections.sort((a, b) => a.displayOrder - b.displayOrder);
    writeFallbackData(data);
    res.json({ success: true });
  }
});

app.put('/api/admin/sections/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (isMongoDBConnected) {
    try {
      const updated = await ResumeSection.findByIdAndUpdate(id, updates, { new: true });
      res.json({ success: true, section: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    const index = data.resumeSections.findIndex(s => s._id === id || s.key === id);
    if (index !== -1) {
      data.resumeSections[index] = { ...data.resumeSections[index], ...updates };
      writeFallbackData(data);
      res.json({ success: true, section: data.resumeSections[index] });
    } else {
      res.status(404).json({ error: 'Section not found' });
    }
  }
});

app.delete('/api/admin/sections/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      await ResumeSection.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    data.resumeSections = data.resumeSections.filter(s => s._id !== id && s.key !== id);
    writeFallbackData(data);
    res.json({ success: true });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 EduQuest Backend Server Running on Port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
