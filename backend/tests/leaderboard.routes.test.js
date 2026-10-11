/**
 * Integration tests for leaderboard routes.
 * MongoDB is mocked → the controller uses the fallback in-memory store.
 */

jest.mock('../config/db', () => ({
  connectDB: jest.fn(),
  getIsMongoDBConnected: jest.fn().mockReturnValue(false),
}));

// Mutable in-memory fallback store
const fallbackStore = { users: [], progress: [], leaderboard: [] };

jest.mock('../utils/dbFallback', () => ({
  readFallbackData: jest.fn(() => JSON.parse(JSON.stringify(fallbackStore))),
  writeFallbackData: jest.fn((data) => {
    fallbackStore.users = data.users;
    fallbackStore.progress = data.progress;
    fallbackStore.leaderboard = data.leaderboard || [];
  }),
}));

jest.mock('../utils/seeder', () => ({
  QUIZ_CATEGORIES: [],
  seedDefaultData: jest.fn(),
  seedQuizData: jest.fn(),
  seedResumeSections: jest.fn(),
  cleanupDuplicateLeaderboardEntries: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const leaderboardRoutes = require('../routes/leaderboardRoutes');

const app = express();
app.use(express.json());
app.use('/leaderboard', leaderboardRoutes);

// ─────────────────────────────────────────────────────────────────────────────

describe('Leaderboard Routes', () => {
  beforeEach(() => {
    // Reset in-memory store
    fallbackStore.leaderboard = [];
    fallbackStore.users = [];
    fallbackStore.progress = [];
  });

  // ── GET /leaderboard ───────────────────────────────────────────────────────

  describe('GET /leaderboard', () => {
    test('returns an empty array when there are no entries', async () => {
      const res = await request(app).get('/leaderboard');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    test('returns entries sorted by score descending and deduplicated', async () => {
      // Seed some entries via POST first
      await request(app).post('/leaderboard').send({ name: 'Alice', score: 80, type: 'quiz', topic: 'math' });
      await request(app).post('/leaderboard').send({ name: 'Bob', score: 50, type: 'quiz', topic: 'math' });
      await request(app).post('/leaderboard').send({ name: 'Charlie', score: 95, type: 'quiz', topic: 'math' });

      const res = await request(app).get('/leaderboard');
      expect(res.status).toBe(200);
      expect(res.body[0].name).toBe('Charlie');
      expect(res.body[1].name).toBe('Alice');
      expect(res.body[2].name).toBe('Bob');
    });
  });

  // ── POST /leaderboard ──────────────────────────────────────────────────────

  describe('POST /leaderboard', () => {
    test('returns 400 when name is missing', async () => {
      const res = await request(app).post('/leaderboard').send({ score: 100 });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 when score is missing', async () => {
      const res = await request(app).post('/leaderboard').send({ name: 'Alice' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 when score is not a number', async () => {
      const res = await request(app)
        .post('/leaderboard')
        .send({ name: 'Alice', score: 'high' });
      expect(res.status).toBe(400);
    });

    test('creates a new entry and returns 201 with entry data', async () => {
      const res = await request(app)
        .post('/leaderboard')
        .send({ name: 'Alice', score: 90, type: 'quiz', topic: 'math' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Alice');
      expect(res.body.score).toBe(90);
    });

    test('updates existing entry (same name/type/topic) instead of creating duplicate', async () => {
      // First submission
      await request(app)
        .post('/leaderboard')
        .send({ name: 'Alice', score: 60, type: 'quiz', topic: 'math' });

      // Second submission for same key → should update
      const res = await request(app)
        .post('/leaderboard')
        .send({ name: 'Alice', score: 90, type: 'quiz', topic: 'math' });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(90);

      // Should only have one Alice entry
      const listRes = await request(app).get('/leaderboard');
      const aliceEntries = listRes.body.filter((e) => e.name.toLowerCase() === 'alice');
      expect(aliceEntries).toHaveLength(1);
    });

    test('treats name as case-insensitive for deduplication', async () => {
      await request(app)
        .post('/leaderboard')
        .send({ name: 'alice', score: 50, type: 'quiz', topic: '' });

      await request(app)
        .post('/leaderboard')
        .send({ name: 'ALICE', score: 80, type: 'quiz', topic: '' });

      const listRes = await request(app).get('/leaderboard');
      const aliceEntries = listRes.body.filter(
        (e) => e.name.toLowerCase() === 'alice'
      );
      expect(aliceEntries).toHaveLength(1);
    });
  });

  // ── PUT /leaderboard/:id ───────────────────────────────────────────────────

  describe('PUT /leaderboard/:id', () => {
    test('returns 404 for a non-existent entry id', async () => {
      const res = await request(app).put('/leaderboard/99999').send({ score: 100 });
      expect(res.status).toBe(404);
    });

    test('updates an existing entry by id', async () => {
      // Create an entry so we have an id
      const created = await request(app)
        .post('/leaderboard')
        .send({ name: 'Bob', score: 40, type: 'quiz', topic: '' });

      const entryId = created.body.id;
      expect(entryId).toBeDefined();

      const res = await request(app)
        .put(`/leaderboard/${entryId}`)
        .send({ score: 75 });
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(75);
    });
  });
});
