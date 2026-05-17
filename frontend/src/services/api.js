import axios from 'axios';

const API_BASE = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// User Management CRUD Operations
export const usersAPI = {
  getUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export default api;