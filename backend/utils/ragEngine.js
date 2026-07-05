const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Splits resume text and structured items into discrete chunks for retrieval.
 */
function chunkResume(rawText, structuredData) {
  const chunks = [];

  // 1. Add structured sections as prioritized chunks
  if (structuredData) {
    if (Array.isArray(structuredData.skills) && structuredData.skills.length > 0) {
      const skillsText = structuredData.skills.join(', ');
      if (skillsText.trim()) {
        chunks.push({ text: `Technical Skills & Technologies: ${skillsText}`, category: 'skills' });
      }
    }
    if (Array.isArray(structuredData.technologies) && structuredData.technologies.length > 0) {
      const techText = structuredData.technologies.join(', ');
      if (techText.trim()) {
        chunks.push({ text: `Technologies & Tools: ${techText}`, category: 'technologies' });
      }
    }

    const fields = ['experience', 'projects', 'education', 'certifications', 'achievements', 'publications'];
    for (const field of fields) {
      if (Array.isArray(structuredData[field])) {
        for (const item of structuredData[field]) {
          const str = String(item || '').trim();
          if (str.length > 5) {
            chunks.push({ text: `${field.toUpperCase()}: ${str}`, category: field });
          }
        }
      }
    }

    // Add personal details as a chunk
    if (structuredData.personalDetails) {
      const pd = structuredData.personalDetails;
      const personalText = [pd.name, pd.email, pd.phone].filter(Boolean).join(' | ');
      if (personalText) {
        chunks.push({ text: `Candidate: ${personalText}`, category: 'personal' });
      }
    }
  }

  // 2. Add raw text paragraphs (capture anything not cleanly structured)
  if (rawText) {
    const paragraphs = String(rawText)
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 30);

    for (const para of paragraphs) {
      const cleanPara = para.replace(/\s+/g, ' ');
      // Avoid duplicating chunks already in structured sections
      const isDuplicate = chunks.some(c => {
        const ct = c.text.replace(/^[A-Z]+:\s*/, '').replace(/\s+/g, ' ').toLowerCase();
        const cp = cleanPara.toLowerCase();
        return ct.includes(cp.substring(0, 60)) || cp.includes(ct.substring(0, 60));
      });
      if (!isDuplicate) {
        chunks.push({ text: para, category: 'rawText' });
      }
    }
  }

  return chunks;
}

/**
 * Calculates cosine similarity between two vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0.0;
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0.0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * BM25-style TF-IDF score for local fallback search.
 */
function computeTfidfScores(query, chunks) {
  const queryTerms = String(query || '').toLowerCase().match(/\w+/g) || [];
  if (queryTerms.length === 0) return chunks.map(() => 0.0);

  const N = chunks.length;
  const df = {};
  const docTermFreqs = chunks.map(chunk => {
    const terms = String(chunk.text).toLowerCase().match(/\w+/g) || [];
    const tf = {};
    for (const t of terms) tf[t] = (tf[t] || 0) + 1;
    for (const t of Object.keys(tf)) df[t] = (df[t] || 0) + 1;
    return tf;
  });

  // Category boost weights
  const categoryBoost = { skills: 1.5, technologies: 1.5, experience: 1.3, projects: 1.3, education: 1.1, certifications: 1.1, achievements: 1.0, rawText: 0.8 };

  return chunks.map((chunk, idx) => {
    const tf = docTermFreqs[idx];
    let score = 0.0;
    for (const term of queryTerms) {
      if (tf[term]) {
        const termDf = df[term] || 1;
        const idf = Math.log(1 + (N - termDf + 0.5) / (termDf + 0.5));
        score += tf[term] * idf;
      }
    }
    return score * (categoryBoost[chunk.category] || 1.0);
  });
}

class RAGEngine {
  constructor(rawText, structuredData, apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.chunks = chunkResume(rawText, structuredData);
    this.embeddings = null;
    this.genAI = null;
    this.useEmbeddings = false;
  }

  /**
   * Validates the API key format. Gemini keys start with 'AIzaSy'.
   */
  _isValidGeminiKey(key) {
    return typeof key === 'string' && key.startsWith('AIzaSy') && key.length > 30;
  }

  /**
   * Initializes the engine by generating batch embeddings if a valid API key is available.
   */
  async initialize() {
    if (this.chunks.length === 0) {
      console.log('RAG Engine: No chunks to embed.');
      return;
    }

    if (!this._isValidGeminiKey(this.apiKey)) {
      console.log('RAG Engine: Running in TF-IDF local mode (no valid Gemini API key detected).');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      const texts = this.chunks.map(c => c.text.substring(0, 2000));
      
      const embeddingsList = [];
      const batchSize = 20; // Smaller batch to avoid timeouts

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const result = await model.batchEmbedContents({
          requests: batch.map(t => ({
            content: { parts: [{ text: t }], role: 'user' },
            taskType: 'RETRIEVAL_DOCUMENT'
          }))
        });
        
        if (result && result.embeddings) {
          embeddingsList.push(...result.embeddings.map(e => e.values));
        }
      }

      if (embeddingsList.length === this.chunks.length) {
        this.embeddings = embeddingsList;
        this.useEmbeddings = true;
        console.log(`RAG Engine: Initialized with ${this.chunks.length} semantic vector embeddings.`);
      } else {
        console.warn(`RAG Engine: Embedding count mismatch (${embeddingsList.length} vs ${this.chunks.length}). Falling back to TF-IDF.`);
      }
    } catch (err) {
      console.warn('RAG Engine: Embedding initialization failed, using TF-IDF fallback:', err.message);
    }
  }

  /**
   * Retrieves top-K context strings relevant to the query.
   */
  async retrieve(query, limit = 5) {
    if (this.chunks.length === 0) return [];

    // Semantic search via embeddings
    if (this.useEmbeddings && this.embeddings && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
        const res = await model.embedContent({
          content: { parts: [{ text: String(query).substring(0, 2000) }], role: 'user' },
          taskType: 'RETRIEVAL_QUERY'
        });
        const queryVector = res?.embedding?.values;

        if (queryVector) {
          const scored = this.chunks.map((chunk, idx) => ({
            text: chunk.text,
            category: chunk.category,
            score: cosineSimilarity(queryVector, this.embeddings[idx])
          }));
          scored.sort((a, b) => b.score - a.score);
          return scored.slice(0, limit).map(s => s.text);
        }
      } catch (err) {
        console.warn('RAG Engine: Query embedding failed, falling back to TF-IDF:', err.message);
      }
    }

    // TF-IDF fallback
    const scores = computeTfidfScores(query, this.chunks);
    const scored = this.chunks.map((chunk, idx) => ({
      text: chunk.text,
      category: chunk.category,
      score: scores[idx]
    }));
    scored.sort((a, b) => b.score - a.score);

    const matches = scored.filter(s => s.score > 0);
    if (matches.length > 0) {
      return matches.slice(0, limit).map(m => m.text);
    }

    // Ultimate fallback: return categorized chunks
    return this.chunks.slice(0, limit).map(c => c.text);
  }

  /**
   * Returns a summary of all chunks by category for debugging.
   */
  getSummary() {
    const cats = {};
    for (const c of this.chunks) {
      cats[c.category] = (cats[c.category] || 0) + 1;
    }
    return { totalChunks: this.chunks.length, usingEmbeddings: this.useEmbeddings, categories: cats };
  }
}

module.exports = { RAGEngine };
