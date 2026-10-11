/**
 * Tests for frontend/src/services/api.js
 *
 * axios is mocked using jest.mock so no real HTTP calls are made.
 */

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    __mockInstance: mockAxiosInstance,
  };
});

import axios from 'axios';
import {
  authAPI,
  userProgressAPI,
  leaderboardAPI,
  quizAPI,
  interviewAPI,
  resumeAPI,
} from '../../services/api';

const mockAxios = axios.__mockInstance;

// ─────────────────────────────────────────────────────────────────────────────

describe('authAPI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('login calls POST /auth/login with correct data', () => {
    const data = { username: 'alice', password: 'secret' };
    authAPI.login(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', data);
  });

  test('signup calls POST /auth/signup', () => {
    const data = { username: 'bob', email: 'bob@example.com', password: 'pass' };
    authAPI.signup(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/auth/signup', data);
  });

  test('forgotPassword calls POST /auth/forgot-password', () => {
    const data = { username: 'alice', email: 'a@a.com', newPassword: 'newp' };
    authAPI.forgotPassword(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/auth/forgot-password', data);
  });

  test('updateProfile calls PUT /auth/update-profile', () => {
    const data = { fullName: 'Alice Smith' };
    authAPI.updateProfile(data);
    expect(mockAxios.put).toHaveBeenCalledWith('/auth/update-profile', data);
  });

  test('getProfile calls GET /auth/profile/:userId', () => {
    authAPI.getProfile('user_123');
    expect(mockAxios.get).toHaveBeenCalledWith('/auth/profile/user_123');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('userProgressAPI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getProgress calls GET /progress?userId=...', () => {
    userProgressAPI.getProgress('uid_1');
    expect(mockAxios.get).toHaveBeenCalledWith('/progress?userId=uid_1');
  });

  test('createProgress calls POST /progress', () => {
    const data = { userId: 'uid_1' };
    userProgressAPI.createProgress(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/progress', data);
  });

  test('updateProgress calls PUT /progress/:id', () => {
    userProgressAPI.updateProgress('prog_1', { score: 10 });
    expect(mockAxios.put).toHaveBeenCalledWith('/progress/prog_1', { score: 10 });
  });

  test('deleteProgress calls DELETE /progress/:id', () => {
    userProgressAPI.deleteProgress('prog_1');
    expect(mockAxios.delete).toHaveBeenCalledWith('/progress/prog_1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('leaderboardAPI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getLeaderboard calls GET /leaderboard with sort params', () => {
    leaderboardAPI.getLeaderboard();
    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/leaderboard')
    );
  });

  test('addToLeaderboard calls POST /leaderboard', () => {
    const data = { name: 'Alice', score: 90 };
    leaderboardAPI.addToLeaderboard(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/leaderboard', data);
  });

  test('updateLeaderboard calls PUT /leaderboard/:id', () => {
    leaderboardAPI.updateLeaderboard('lb_1', { score: 100 });
    expect(mockAxios.put).toHaveBeenCalledWith('/leaderboard/lb_1', { score: 100 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('quizAPI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getCategories calls GET /quiz-categories', () => {
    quizAPI.getCategories();
    expect(mockAxios.get).toHaveBeenCalledWith('/quiz-categories');
  });

  test('getCategory calls GET /quiz-categories/:slug', () => {
    quizAPI.getCategory('math');
    expect(mockAxios.get).toHaveBeenCalledWith('/quiz-categories/math');
  });

  test('createCategory calls POST /quiz-categories', () => {
    const data = { slug: 'math', name: 'Math' };
    quizAPI.createCategory(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/quiz-categories', data);
  });

  test('updateCategory calls PUT /quiz-categories/:slug', () => {
    quizAPI.updateCategory('math', { name: 'Advanced Math' });
    expect(mockAxios.put).toHaveBeenCalledWith('/quiz-categories/math', { name: 'Advanced Math' });
  });

  test('deleteCategory calls DELETE /quiz-categories/:slug', () => {
    quizAPI.deleteCategory('math');
    expect(mockAxios.delete).toHaveBeenCalledWith('/quiz-categories/math');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('interviewAPI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('generateInterview calls POST /api/interview/generate', () => {
    const data = { topic: 'React' };
    interviewAPI.generateInterview(data);
    expect(mockAxios.post).toHaveBeenCalledWith('/api/interview/generate', data);
  });

  test('evaluateInterview calls POST /api/interview/evaluate', () => {
    interviewAPI.evaluateInterview({ answer: 'hooks' });
    expect(mockAxios.post).toHaveBeenCalledWith('/api/interview/evaluate', { answer: 'hooks' });
  });

  test('saveInterview calls POST /api/interview/save', () => {
    interviewAPI.saveInterview({ userId: 'u1' });
    expect(mockAxios.post).toHaveBeenCalledWith('/api/interview/save', { userId: 'u1' });
  });

  test('getHistory calls GET /api/interview/history/:userId', () => {
    interviewAPI.getHistory('u_123');
    expect(mockAxios.get).toHaveBeenCalledWith('/api/interview/history/u_123');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('resumeAPI', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getResumeData calls GET /api/resume/:userId', () => {
    resumeAPI.getResumeData('uid_1');
    expect(mockAxios.get).toHaveBeenCalledWith('/api/resume/uid_1');
  });

  test('uploadResume posts to /api/resume/upload', () => {
    resumeAPI.uploadResume({ file: 'data' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/resume/upload',
      { file: 'data' },
      expect.any(Object)
    );
  });

  test('uploadResume sets Content-Type to undefined for FormData', () => {
    const formData = new FormData();
    resumeAPI.uploadResume(formData);
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/resume/upload',
      formData,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': undefined }),
      })
    );
  });

  test('generateQuestions calls POST /api/resume/generate-questions', () => {
    resumeAPI.generateQuestions({ resumeId: 'r1' });
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/resume/generate-questions',
      { resumeId: 'r1' }
    );
  });

  test('evaluateAnswer calls POST /api/resume/evaluate-answer', () => {
    resumeAPI.evaluateAnswer({ answer: 'test' });
    expect(mockAxios.post).toHaveBeenCalledWith('/api/resume/evaluate-answer', { answer: 'test' });
  });

  test('getHistory calls GET /api/resume/history/:userId', () => {
    resumeAPI.getHistory('uid_2');
    expect(mockAxios.get).toHaveBeenCalledWith('/api/resume/history/uid_2');
  });
});
