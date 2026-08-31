import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Authentication Operations
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  getProfile: (userId) => api.get(`/auth/profile/${userId}`),
};

// User Progress CRUD Operations
export const userProgressAPI = {
  getProgress: (userId) => api.get(`/progress?userId=${userId}`),
  createProgress: (data) => api.post('/progress', data),
  updateProgress: (id, data) => api.put(`/progress/${id}`, data),
  deleteProgress: (id) => api.delete(`/progress/${id}`),
};

// Leaderboard CRUD Operations
export const leaderboardAPI = {
  getLeaderboard: () => api.get('/leaderboard?_sort=score&_order=desc'),
  addToLeaderboard: (data) => api.post('/leaderboard', data),
  updateLeaderboard: (id, data) => api.put(`/leaderboard/${id}`, data),
};

// Quiz Category Operations
export const quizAPI = {
  getCategories: () => api.get('/quiz-categories'),
  getCategory: (slug) => api.get(`/quiz-categories/${slug}`),
  createCategory: (data) => api.post('/quiz-categories', data),
  updateCategory: (slug, data) => api.put(`/quiz-categories/${slug}`, data),
  deleteCategory: (slug) => api.delete(`/quiz-categories/${slug}`),
};

// Interview Operations
export const interviewAPI = {
  generateInterview: (data) => api.post('/api/interview/generate', data),
  evaluateInterview: (data) => api.post('/api/interview/evaluate', data),
  saveInterview: (data) => api.post('/api/interview/save', data),
  getHistory: (userId) => api.get(`/api/interview/history/${userId}`),
};

// User Management CRUD Operations
export const usersAPI = {
  getUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// AI Resume Interview Operations
export const resumeAPI = {
  uploadResume: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': undefined } }
      : {};
    return api.post('/api/resume/upload', data, config);
  },
  getResumeData: (userId) => api.get(`/api/resume/${userId}`),
  generateQuestions: (data) => api.post('/api/resume/generate-questions', data),
  generateFollowUp: (data) => api.post('/api/resume/follow-up', data),
  evaluateAnswer: (data) => api.post('/api/resume/evaluate-answer', data),
  detectAI: (data) => api.post('/api/resume/detect-ai', data),
  generateReport: (data) => api.post('/api/resume/final-report', data),
  saveSession: (data) => api.post('/api/resume/save-session', data),
  getHistory: (userId) => api.get(`/api/resume/history/${userId}`),
  logViolation: (data) => api.post('/api/resume/proctor-violation', data),
};

export default api;
