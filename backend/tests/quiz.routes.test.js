/**
 * Integration tests for quiz category routes.
 * MongoDB is mocked → the controller falls back to the in-memory QUIZ_CATEGORIES array.
 */

jest.mock('../config/db', () => ({
  connectDB: jest.fn(),
  getIsMongoDBConnected: jest.fn().mockReturnValue(false),
}));

// Provide a fresh, mutable in-memory categories array for the fallback path
const mockCategories = [];

jest.mock('../utils/seeder', () => ({
  QUIZ_CATEGORIES: mockCategories,
  seedDefaultData: jest.fn(),
  seedQuizData: jest.fn(),
  seedResumeSections: jest.fn(),
  cleanupDuplicateLeaderboardEntries: jest.fn(),
}));

jest.mock('../utils/dbFallback', () => ({
  readFallbackData: jest.fn(() => ({ users: [], progress: [], leaderboard: [] })),
  writeFallbackData: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const quizRoutes = require('../routes/quizRoutes');

const app = express();
app.use(express.json());
app.use('/quiz-categories', quizRoutes);

// ─────────────────────────────────────────────────────────────────────────────

describe('Quiz Category Routes', () => {
  beforeEach(() => {
    // Reset the mutable categories array before each test
    mockCategories.length = 0;
    mockCategories.push(
      { slug: 'math', name: 'Math', label: '➕', iconColor: '#2563eb', questions: [] },
      { slug: 'science', name: 'Science', label: '🔬', iconColor: '#0f766e', questions: [] }
    );
  });

  // ── GET /quiz-categories ───────────────────────────────────────────────────

  describe('GET /quiz-categories', () => {
    test('returns an array of categories', async () => {
      const res = await request(app).get('/quiz-categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    test('each category has a slug and name', async () => {
      const res = await request(app).get('/quiz-categories');
      res.body.forEach((cat) => {
        expect(cat).toHaveProperty('slug');
        expect(cat).toHaveProperty('name');
      });
    });
  });

  // ── GET /quiz-categories/:slug ─────────────────────────────────────────────

  describe('GET /quiz-categories/:slug', () => {
    test('returns a category when slug exists', async () => {
      const res = await request(app).get('/quiz-categories/math');
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('math');
      expect(res.body.name).toBe('Math');
    });

    test('returns 404 for unknown slug', async () => {
      const res = await request(app).get('/quiz-categories/unknown-slug');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── POST /quiz-categories ──────────────────────────────────────────────────

  describe('POST /quiz-categories', () => {
    test('creates a new category and returns 201', async () => {
      const newCat = { slug: 'history', name: 'History', label: '📜', iconColor: '#7c3aed', questions: [] };
      const res = await request(app).post('/quiz-categories').send(newCat);
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('history');
    });

    test('newly created category appears in the list', async () => {
      await request(app)
        .post('/quiz-categories')
        .send({ slug: 'geography', name: 'Geography', questions: [] });

      const listRes = await request(app).get('/quiz-categories');
      const slugs = listRes.body.map((c) => c.slug);
      expect(slugs).toContain('geography');
    });
  });

  // ── PUT /quiz-categories/:slug ─────────────────────────────────────────────

  describe('PUT /quiz-categories/:slug', () => {
    test('updates an existing category and returns the updated document', async () => {
      const res = await request(app)
        .put('/quiz-categories/math')
        .send({ name: 'Advanced Math' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Advanced Math');
    });

    test('returns 404 when slug does not exist', async () => {
      const res = await request(app)
        .put('/quiz-categories/nonexistent')
        .send({ name: 'Ghost' });
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /quiz-categories/:slug ──────────────────────────────────────────

  describe('DELETE /quiz-categories/:slug', () => {
    test('deletes an existing category and returns success', async () => {
      const res = await request(app).delete('/quiz-categories/science');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('category no longer appears in list after deletion', async () => {
      await request(app).delete('/quiz-categories/science');
      const listRes = await request(app).get('/quiz-categories');
      const slugs = listRes.body.map((c) => c.slug);
      expect(slugs).not.toContain('science');
    });

    test('returns 404 when deleting a non-existent slug', async () => {
      const res = await request(app).delete('/quiz-categories/ghost');
      expect(res.status).toBe(404);
    });
  });
});
