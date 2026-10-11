/**
 * Integration tests for auth routes (POST /auth/signup, /auth/login, /auth/forgot-password).
 *
 * MongoDB and the seeder are fully mocked so the tests run without a live DB.
 * The fallback (file-based) DB is also mocked — all persistence is in-memory.
 */

// ── Mock db layer before any module imports ──────────────────────────────────

jest.mock('../config/db', () => ({
  connectDB: jest.fn(),
  getIsMongoDBConnected: jest.fn().mockReturnValue(false), // use fallback path
}));

// Mock the fallback data store with a simple in-memory object
const fallbackStore = { users: [], progress: [], leaderboard: [] };

jest.mock('../utils/dbFallback', () => ({
  readFallbackData: jest.fn(() => JSON.parse(JSON.stringify(fallbackStore))),
  writeFallbackData: jest.fn((data) => {
    fallbackStore.users = data.users;
    fallbackStore.progress = data.progress;
    fallbackStore.leaderboard = data.leaderboard || [];
  }),
}));

// Mock seeder (used by helpers.js -> createInitialCategoryProgress)
jest.mock('../utils/seeder', () => ({
  QUIZ_CATEGORIES: [{ slug: 'math', name: 'Math' }],
  seedDefaultData: jest.fn(),
  seedQuizData: jest.fn(),
  seedResumeSections: jest.fn(),
  cleanupDuplicateLeaderboardEntries: jest.fn(),
}));

// ── Now build the Express app ─────────────────────────────────────────────────

const express = require('express');
const request = require('supertest');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Routes', () => {
  beforeEach(() => {
    // Reset the in-memory store before each test
    fallbackStore.users = [];
    fallbackStore.progress = [];
  });

  // ── POST /auth/signup ──────────────────────────────────────────────────────

  describe('POST /auth/signup', () => {
    test('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/auth/signup').send({ username: 'alice' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('creates a user and returns a token on valid signup', async () => {
      const res = await request(app).post('/auth/signup').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.username).toBe('testuser');
    });

    test('returns 400 when username is already taken', async () => {
      // Sign up once
      await request(app).post('/auth/signup').send({
        username: 'duplicate',
        email: 'dup@example.com',
        password: 'password123',
      });

      // Try to sign up with the same username
      const res = await request(app).post('/auth/signup').send({
        username: 'duplicate',
        email: 'other@example.com',
        password: 'pass456',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already taken/i);
    });
  });

  // ── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Pre-seed a user for login tests
      await request(app).post('/auth/signup').send({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'mypassword',
      });
    });

    test('returns 400 when fields are missing', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'loginuser' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 for wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'loginuser', password: 'wrongpassword' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid/i);
    });

    test('returns 400 for non-existent username', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'nobody', password: 'pass' });
      expect(res.status).toBe(400);
    });

    test('returns 200 with token on correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'loginuser', password: 'mypassword' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
    });
  });

  // ── POST /auth/forgot-password ─────────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    test('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ username: 'someone' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('returns 400 for non-existent user', async () => {
      const res = await request(app).post('/auth/forgot-password').send({
        username: 'ghost',
        email: 'ghost@example.com',
        newPassword: 'newpass123',
      });
      expect(res.status).toBe(400);
    });

    test('updates password successfully for existing user', async () => {
      // Create user first
      await request(app).post('/auth/signup').send({
        username: 'resetuser',
        email: 'reset@example.com',
        password: 'oldpass',
      });

      const res = await request(app).post('/auth/forgot-password').send({
        username: 'resetuser',
        email: 'reset@example.com',
        newPassword: 'newpass123',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
