import axios from 'axios';

const API_BASE = 'http://127.0.0.1:3001';

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
};

// User Management CRUD Operations
export const usersAPI = {
  getUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export default api;
