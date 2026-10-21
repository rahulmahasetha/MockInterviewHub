/**
 * Tests for components/ScoreSummary.jsx
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// 

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUpdateHighestScore = jest.fn();
const mockGetTotalScore = jest.fn(() => 75);
const mockGetCategoryProgress = jest.fn((slug) => ({
  score: slug === 'math' ? 45 : 30,
}));

jest.mock('../../context/UserProgressContext', () => ({
  useUserProgress: () => ({
    progress: { highestScore: 100 },
    updateHighestScore: mockUpdateHighestScore,
    getTotalScore: mockGetTotalScore,
    getCategoryProgress: mockGetCategoryProgress,
  }),
}));

jest.mock('../../services/api', () => ({
  quizAPI: {
    getCategories: jest.fn(() =>
      Promise.resolve({
        data: [
          { slug: 'math', name: 'Mathematics', label: 'MATH', iconColor: '#2563eb' },
          { slug: 'science', name: 'Science', label: 'SCI', iconColor: '#0f766e' },
        ],
      })
    ),
  },
}));

// Component import after mocks
import ScoreSummary from '../../components/ScoreSummary';

// 

describe('ScoreSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default return values
    mockGetTotalScore.mockReturnValue(75);
  });

  // 

  describe('Initial render', () => {
    test('renders the "Final Score Summary" heading', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(screen.getByText('Final Score Summary')).toBeInTheDocument();
    });

    test('renders the subtitle text', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(
        screen.getByText(/Your score across all quest categories/i)
      ).toBeInTheDocument();
    });

    test('renders Highest Score label and value from context', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(screen.getByText('Highest Score')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('renders Total Score label', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(screen.getByText('Total Score')).toBeInTheDocument();
    });
  });

  // 

  describe('After categories load', () => {
    test('calls quizAPI.getCategories on mount', async () => {
      const { quizAPI } = require('../../services/api');
      await act(async () => { render(<ScoreSummary />); });
      expect(quizAPI.getCategories).toHaveBeenCalled();
    });

    test('renders the scores grid container', async () => {
      await act(async () => { render(<ScoreSummary />); });
      // The grid container is always present
      expect(document.querySelector('.ss-scores-grid')).toBeInTheDocument();
    });
  });

  // 

  describe('Navigation', () => {
    test('renders the Back to Home button', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(screen.getByRole('button', { name: /Back to Home/i })).toBeInTheDocument();
    });

    test('calls navigate("/") when Back to Home is clicked', async () => {
      await act(async () => { render(<ScoreSummary />); });
      screen.getByRole('button', { name: /Back to Home/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // 

  describe('Side effects', () => {
    test('calls getTotalScore to compute the displayed total', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(mockGetTotalScore).toHaveBeenCalled();
    });

    test('calls updateHighestScore on mount', async () => {
      await act(async () => { render(<ScoreSummary />); });
      expect(mockUpdateHighestScore).toHaveBeenCalled();
    });
  });

  // 

  describe('API error handling', () => {
    test('renders without crashing when getCategories fails', async () => {
      const { quizAPI } = require('../../services/api');
      quizAPI.getCategories.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => { render(<ScoreSummary />); });

      expect(screen.getByText('Final Score Summary')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Mathematics')).not.toBeInTheDocument();
      });
    });
  });
});
