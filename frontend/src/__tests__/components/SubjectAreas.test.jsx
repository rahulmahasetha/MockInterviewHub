import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../../components/Home';

const mockNavigate = jest.fn();
let mockSearch = '?tab=all';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: mockSearch, pathname: '/' }),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockCategories = [
  {
    slug: 'html',
    name: 'HTML5 Semantic Web Quiz',
    parentCategory: 'frontend',
    label: 'HTML5',
    color: '#e34f26',
    iconColor: '#e34f26',
    description: 'HTML5 tags, semantics, SEO and accessibility.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'nodejs',
    name: 'Node.js Runtime Quiz',
    parentCategory: 'backend',
    label: 'NodeJS',
    color: '#339933',
    iconColor: '#339933',
    description: 'Event loop, streams, buffers, clustering, and worker threads.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'core-os',
    name: 'Operating Systems (OS) Quiz',
    parentCategory: 'core',
    label: 'OS',
    color: '#0284c7',
    iconColor: '#0284c7',
    description: 'Process management, memory virtualisation, and CPU scheduling.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'devops-docker',
    name: 'Docker & Containerization Quiz',
    parentCategory: 'devops',
    label: 'Docker',
    color: '#0284c7',
    iconColor: '#0284c7',
    description: 'Dockerfiles, multi-stage builds, container networking, and volumes.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'ai-foundations',
    name: 'Artificial Intelligence Foundations Quiz',
    parentCategory: 'ai',
    label: 'AI Core',
    color: '#9333ea',
    iconColor: '#9333ea',
    description: 'Search algorithms, heuristic evaluation, constraint satisfaction, and agents.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'ml-algorithms',
    name: 'Machine Learning Algorithms Quiz',
    parentCategory: 'ml',
    label: 'ML Algorithms',
    color: '#2563eb',
    iconColor: '#2563eb',
    description: 'Supervised vs unsupervised algorithms, decision trees, SVMs, and bias-variance.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'dl-neural-nets',
    name: 'Deep Neural Networks Quiz',
    parentCategory: 'dl',
    label: 'Deep Learning',
    color: '#c026d3',
    iconColor: '#c026d3',
    description: 'Perceptrons, backpropagation, vanishing gradients, and activations.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'ds-python',
    name: 'Python for Data Science Quiz',
    parentCategory: 'datascience',
    label: 'Data Science',
    color: '#0d9488',
    iconColor: '#0d9488',
    description: 'NumPy vectorization, Pandas indexing, broadcasting, and clean data wrangling.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'sec-web',
    name: 'Web Application Security & OWASP Quiz',
    parentCategory: 'security',
    label: 'Web Security',
    color: '#dc2626',
    iconColor: '#dc2626',
    description: 'OWASP Top 10 vulnerabilities: XSS, SQLi, CSRF, SSRF, IDOR, and authentication.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
  {
    slug: 'dsa',
    name: 'Data Structures & Algorithms Quiz',
    parentCategory: 'programming',
    label: 'DSA',
    color: '#4338ca',
    iconColor: '#4338ca',
    description: 'Arrays, linked lists, trees, graphs, sorting, searching, and time complexity.',
    levels: Array.from({ length: 10 }, (_, i) => ({ level: i + 1 })),
  },
];

jest.mock('../../services/api', () => ({
  quizAPI: {
    getCategories: jest.fn(() => Promise.resolve({ data: mockCategories })),
  },
  interviewAPI: {
    getHistory: jest.fn(() => Promise.resolve({ data: { success: true, results: [] } })),
  },
  authAPI: {
    updateProfile: jest.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

jest.mock('../../context/UserProgressContext', () => ({
  COIN_REWARDS: {
    DAILY_LOGIN: { label: 'Daily Login', coins: 5 },
    ANSWER_CORRECTLY: { label: 'Quiz Correct Answer', coins: 1, suffix: 'per question' },
    SEVEN_DAY_STREAK: { label: '7-Day Streak Bonus', coins: 25 },
    INTERVIEW_SCORE: { label: 'Interview Score Bonus', coins: 1, suffix: 'per 10% score' }
  },
  useUserProgress: () => ({
    progress: {
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@gmail.com',
      coins: 100,
      coinHistory: [],
    },
    totalScore: 500,
    getTotalScore: () => 500,
    globalLeaderboard: [],
    fetchGlobalLeaderboard: jest.fn(),
    getCategoryProgress: () => ({ passed: [] }),
    resetProgress: jest.fn(),
    resetCoins: jest.fn(),
    updateUserProfile: jest.fn(() => Promise.resolve({ success: true })),
    requireAuth: jest.fn((path, cb) => (cb ? cb() : mockNavigate(path))),
    openAuthModal: jest.fn(),
  }),
}));

import { quizAPI } from '../../services/api';

describe('Subject Areas (10 Tracks) Component Tests', () => {
  beforeEach(() => {
    mockSearch = '?tab=all';
    jest.clearAllMocks();
    quizAPI.getCategories.mockResolvedValue({ data: mockCategories });
  });

  test('renders all 10 subject area filter pills', async () => {
    const { container } = render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/All Tracks \(10\)/i)).toBeInTheDocument();
    });

    const filterBar = container.querySelector('.hd-subject-filter-bar');
    expect(filterBar).toBeInTheDocument();
    
    // There should be 1 'All Tracks' pill + 10 subject area pills = 11 pills total
    const pills = filterBar.querySelectorAll('.hd-filter-pill');
    expect(pills.length).toBe(11);
  });

  test('renders quiz cards with proper 10-level formatting', async () => {
    const { container } = render(<Home />);
    await waitFor(() => {
      const cardTitle = container.querySelector('.card-name-premium');
      expect(cardTitle).toBeInTheDocument();
    });

    const cardTitles = Array.from(container.querySelectorAll('.card-name-premium')).map(el => el.textContent);
    expect(cardTitles).toContain('HTML5 Semantic Web');

    // Check level counter formatting
    const questionsCount = screen.getAllByText(/0 \/ 10 Questions/i);
    expect(questionsCount.length).toBeGreaterThan(0);

    // Check Start Quiz buttons
    const startBtns = screen.getAllByText(/Start Quiz/i);
    expect(startBtns.length).toBeGreaterThan(0);
  });

  test('filters track when clicking on a subject area pill', async () => {
    const { container } = render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/All Tracks \(10\)/i)).toBeInTheDocument();
    });

    const filterBar = container.querySelector('.hd-subject-filter-bar');
    const pills = Array.from(filterBar.querySelectorAll('.hd-filter-pill'));
    const devopsPill = pills.find(p => p.textContent.includes('DevOps'));
    expect(devopsPill).toBeDefined();

    fireEvent.click(devopsPill);

    await waitFor(() => {
      const cardTitles = Array.from(container.querySelectorAll('.card-name-premium')).map(el => el.textContent);
      expect(cardTitles.some(t => t.includes('Docker'))).toBe(true);
    });
  });

  test('clicking a quiz card starts the quiz navigate', async () => {
    const { container } = render(<Home />);
    await waitFor(() => {
      expect(container.querySelector('.card-large-premium')).toBeInTheDocument();
    });

    const htmlCard = container.querySelector('.card-large-premium');
    expect(htmlCard).toBeInTheDocument();
    fireEvent.click(htmlCard);

    expect(mockNavigate).toHaveBeenCalledWith('/playground/html');
  });
});
