/**
 * Tests for components/MCQCard.jsx
 *
 * MCQCard depends on UserProgressContext — we mock the entire context module
 * so tests are isolated from any state-management concerns.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MCQCard from '../../components/MCQCard';

// ── Mock context ──────────────────────────────────────────────────────────────

const mockMarkPassed = jest.fn();
const mockIsLevelCompleted = jest.fn().mockReturnValue(false);

jest.mock('../../context/UserProgressContext', () => ({
  useUserProgress: () => ({
    markPassed: mockMarkPassed,
    isLevelCompleted: mockIsLevelCompleted,
  }),
}));

// ── Test data ─────────────────────────────────────────────────────────────────

const sampleLevel = {
  level: 1,
  question: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  answer: '4',
  hint: 'Think about basic addition.',
  points: 10,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderCard = (levelObj = sampleLevel, props = {}) => {
  const onCorrectNextLevel = jest.fn();
  render(
    <MCQCard
      levelObj={levelObj}
      category="math"
      onCorrectNextLevel={onCorrectNextLevel}
      totalLevels={5}
      {...props}
    />
  );
  return { onCorrectNextLevel };
};

// ─────────────────────────────────────────────────────────────────────────────

describe('MCQCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    test('renders the question text', () => {
      renderCard();
      expect(screen.getByText(/What is 2 \+ 2\?/)).toBeInTheDocument();
    });

    test('renders the question number in the heading', () => {
      renderCard();
      expect(screen.getByText(/Question 1:/)).toBeInTheDocument();
    });

    test('renders all four answer options', () => {
      renderCard();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    test('renders the Submit Answer button', () => {
      renderCard();
      expect(screen.getByText('Submit Answer')).toBeInTheDocument();
    });

    test('renders the Show Hint toggle button', () => {
      renderCard();
      expect(screen.getByText('Show Hint')).toBeInTheDocument();
    });

    test('renders the countdown timer', () => {
      renderCard();
      expect(screen.getByText(/Time Left:/)).toBeInTheDocument();
      expect(screen.getByText(/20s/)).toBeInTheDocument();
    });

    test('renders fallback message when levelObj is null', () => {
      render(
        <MCQCard
          levelObj={null}
          category="math"
          onCorrectNextLevel={jest.fn()}
          totalLevels={5}
        />
      );
      expect(screen.getByText(/No level data available/)).toBeInTheDocument();
    });
  });

  // ── Option selection ────────────────────────────────────────────────────────

  describe('Option selection', () => {
    test('marks an option as selected when clicked', () => {
      renderCard();
      const option4 = screen.getByText('4').closest('button');
      fireEvent.click(option4);
      expect(option4).toHaveAttribute('aria-pressed', 'true');
    });

    test('can switch selection to a different option', () => {
      renderCard();
      const option3 = screen.getByText('3').closest('button');
      const option4 = screen.getByText('4').closest('button');

      fireEvent.click(option3);
      expect(option3).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(option4);
      expect(option4).toHaveAttribute('aria-pressed', 'true');
      expect(option3).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ── Hint toggle ─────────────────────────────────────────────────────────────

  describe('Hint toggle', () => {
    test('shows hint text after clicking Show Hint', () => {
      renderCard();
      fireEvent.click(screen.getByText('Show Hint'));
      expect(screen.getByText(/Think about basic addition/)).toBeInTheDocument();
    });

    test('toggles hint button label', () => {
      renderCard();
      fireEvent.click(screen.getByText('Show Hint'));
      expect(screen.getByText('Hide Hint')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Hide Hint'));
      expect(screen.getByText('Show Hint')).toBeInTheDocument();
    });
  });

  // ── Answer submission ───────────────────────────────────────────────────────

  describe('Answer submission', () => {
    test('shows correct result feedback when the right answer is selected', () => {
      renderCard();
      fireEvent.click(screen.getByText('4').closest('button'));
      fireEvent.click(screen.getByText('Submit Answer'));
      expect(screen.getByText(/Correct/)).toBeInTheDocument();
    });

    test('shows incorrect result feedback for a wrong answer', () => {
      renderCard();
      fireEvent.click(screen.getByText('3').closest('button'));
      fireEvent.click(screen.getByText('Submit Answer'));
      expect(screen.getByText(/Wrong answer/)).toBeInTheDocument();
    });

    test('calls markPassed when a correct answer is submitted', () => {
      renderCard();
      fireEvent.click(screen.getByText('4').closest('button'));
      fireEvent.click(screen.getByText('Submit Answer'));
      expect(mockMarkPassed).toHaveBeenCalledWith(
        'math',
        1,
        expect.objectContaining({ totalLevels: 5, points: 10 })
      );
    });

    test('does not call markPassed for a wrong answer', () => {
      renderCard();
      fireEvent.click(screen.getByText('3').closest('button'));
      fireEvent.click(screen.getByText('Submit Answer'));
      expect(mockMarkPassed).not.toHaveBeenCalled();
    });

    test('hides Submit Answer button after answering', () => {
      renderCard();
      fireEvent.click(screen.getByText('3').closest('button'));
      fireEvent.click(screen.getByText('Submit Answer'));
      expect(screen.queryByText('Submit Answer')).not.toBeInTheDocument();
    });
  });

  // ── Timer ───────────────────────────────────────────────────────────────────

  describe('Timer', () => {
    test('shows timer in the UI with correct initial value', () => {
      renderCard();
      const timerDiv = screen.getByText(/Time Left:/i);
      expect(timerDiv.parentElement).toHaveTextContent('20');
    });

    test('timer counts down: timer value decrements when rendered multiple times', () => {
      // Advance time by 3 seconds inside act so React processes state updates
      renderCard();
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      // After 3 seconds the timer should have decremented
      const timerEl = screen.getByText(/Time Left:/i).parentElement;
      expect(timerEl).not.toHaveTextContent('20s');
    });
  });
});
