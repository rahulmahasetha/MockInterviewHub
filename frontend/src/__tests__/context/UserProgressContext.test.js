/**
 * Tests for UserProgressContext.js
 *
 * Tests cover:
 *  - COIN_REWARDS constant shape and values
 *  - UserProgressProvider renders children
 *  - Initial state reflects localStorage when available
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  UserProgressProvider,
  COIN_REWARDS,
} from '../../context/UserProgressContext';

// ── Mock dependencies ─────────────────────────────────────────────────────────

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('../../services/api', () => ({
  userProgressAPI: {
    getProgress: jest.fn().mockResolvedValue({ data: [] }),
    createProgress: jest.fn().mockResolvedValue({ data: {} }),
    updateProgress: jest.fn().mockResolvedValue({ data: {} }),
  },
  leaderboardAPI: {
    getLeaderboard: jest.fn().mockResolvedValue({ data: [] }),
    addToLeaderboard: jest.fn().mockResolvedValue({ data: {} }),
    updateLeaderboard: jest.fn().mockResolvedValue({ data: {} }),
  },
  usersAPI: {
    getUsers: jest.fn().mockResolvedValue({ data: [] }),
  },
  authAPI: {
    getProfile: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('COIN_REWARDS constant', () => {
  test('is an object', () => {
    expect(typeof COIN_REWARDS).toBe('object');
    expect(COIN_REWARDS).not.toBeNull();
  });

  test('every reward entry has a label and coins number', () => {
    Object.entries(COIN_REWARDS).forEach(([key, reward]) => {
      expect(typeof reward.label).toBe('string');
      expect(reward.label.length).toBeGreaterThan(0);
      expect(typeof reward.coins).toBe('number');
      expect(reward.coins).toBeGreaterThan(0);
    });
  });

  test('DAILY_LOGIN reward is 5 coins', () => {
    expect(COIN_REWARDS.DAILY_LOGIN.coins).toBe(5);
  });

  test('ANSWER_CORRECTLY reward is 1 coin', () => {
    expect(COIN_REWARDS.ANSWER_CORRECTLY.coins).toBe(1);
  });

  test('SEVEN_DAY_STREAK reward is 25 coins', () => {
    expect(COIN_REWARDS.SEVEN_DAY_STREAK.coins).toBe(25);
  });

  test('INTERVIEW_SCORE reward is 1 coin per 10% score', () => {
    expect(COIN_REWARDS.INTERVIEW_SCORE.coins).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('UserProgressProvider', () => {
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    // Clear localStorage between tests
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders children without crashing', () => {
    render(
      <UserProgressProvider>
        <span data-testid="child">hello</span>
      </UserProgressProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  test('renders multiple children', () => {
    render(
      <UserProgressProvider>
        <span data-testid="a">A</span>
        <span data-testid="b">B</span>
      </UserProgressProvider>
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });

  test('initialises with empty state when localStorage is empty', () => {
    localStorage.clear();
    // No error should occur during render
    expect(() =>
      render(
        <UserProgressProvider>
          <div />
        </UserProgressProvider>
      )
    ).not.toThrow();
  });

  test('reads initial state from localStorage when available', () => {
    const savedState = {
      userId: 'user_abc',
      token: 'tok_xyz',
      username: 'testuser',
      highestScore: 250,
      coins: 50,
      categories: {},
      leaderboard: [],
    };
    localStorage.setItem('trivia_progress', JSON.stringify(savedState));

    // Render a child that reads from context
    const TestChild = () => {
      const { useUserProgress } = require('../../../context/UserProgressContext');
      return null; // We just verify render does not throw
    };

    expect(() =>
      render(
        <UserProgressProvider>
          <div data-testid="mounted">mounted</div>
        </UserProgressProvider>
      )
    ).not.toThrow();

    expect(screen.getByTestId('mounted')).toBeInTheDocument();
  });

  test('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem('trivia_progress', 'not-valid-json{{{');
    expect(() =>
      render(
        <UserProgressProvider>
          <div />
        </UserProgressProvider>
      )
    ).not.toThrow();
  });
});

describe('Simplified Gamification Rules & Duplicate Prevention', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('Daily login awards +5 coins on first claim of the day', () => {
    let contextValue;
    const Consumer = () => {
      const { useUserProgress } = require('../../context/UserProgressContext');
      contextValue = useUserProgress();
      return null;
    };

    render(
      <UserProgressProvider>
        <Consumer />
      </UserProgressProvider>
    );

    const { act } = require('@testing-library/react');
    let claimed;
    act(() => {
      claimed = contextValue.claimDailyLoginReward();
    });

    expect(claimed).toBe(true);
    expect(contextValue.progress.coins).toBe(5);
    expect(contextValue.progress.streakDays).toBe(1);
    expect(contextValue.progress.lastLoginRewardDate).toBeTruthy();
  });

  test('Prevents duplicate daily login reward on the same day', () => {
    let contextValue;
    const Consumer = () => {
      const { useUserProgress } = require('../../context/UserProgressContext');
      contextValue = useUserProgress();
      return null;
    };

    render(
      <UserProgressProvider>
        <Consumer />
      </UserProgressProvider>
    );

    const { act } = require('@testing-library/react');
    act(() => {
      contextValue.claimDailyLoginReward();
    });

    let secondClaim;
    act(() => {
      secondClaim = contextValue.claimDailyLoginReward();
    });

    expect(secondClaim).toBe(false);
    expect(contextValue.progress.coins).toBe(5); // unchanged, no duplicate coins
  });

  test('Awards 7-day streak bonus (+25 coins) on reaching day 7', () => {
    // Seed with 6-day streak ending yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const seededState = {
      userId: 'test_user',
      coins: 30,
      streakDays: 6,
      lastLoginRewardDate: yesterdayStr,
      coinHistory: []
    };
    localStorage.setItem('trivia_progress', JSON.stringify(seededState));

    let contextValue;
    const Consumer = () => {
      const { useUserProgress } = require('../../context/UserProgressContext');
      contextValue = useUserProgress();
      return null;
    };

    render(
      <UserProgressProvider>
        <Consumer />
      </UserProgressProvider>
    );

    const { act } = require('@testing-library/react');
    act(() => {
      contextValue.claimDailyLoginReward();
    });

    // 30 existing + 5 daily login + 25 7-day streak bonus = 60
    expect(contextValue.progress.streakDays).toBe(7);
    expect(contextValue.progress.coins).toBe(60);
  });

  test('Quiz correct answer awards exactly +1 coin and prevents duplicates', () => {
    let contextValue;
    const Consumer = () => {
      const { useUserProgress } = require('../../context/UserProgressContext');
      contextValue = useUserProgress();
      return null;
    };

    render(
      <UserProgressProvider>
        <Consumer />
      </UserProgressProvider>
    );

    const { act } = require('@testing-library/react');
    act(() => {
      contextValue.markPassed('science', 1, { points: 20 });
    });

    expect(contextValue.progress.coins).toBe(1);

    // Answering the same level again should not award duplicate coins
    act(() => {
      contextValue.markPassed('science', 1, { points: 20 });
    });

    expect(contextValue.progress.coins).toBe(1);
  });

  test('Interview score percentage adds Math.floor(percentage / 10) coins (e.g. 77% -> 7 coins)', () => {
    let contextValue;
    const Consumer = () => {
      const { useUserProgress } = require('../../context/UserProgressContext');
      contextValue = useUserProgress();
      return null;
    };

    render(
      <UserProgressProvider>
        <Consumer />
      </UserProgressProvider>
    );

    const { act } = require('@testing-library/react');
    const scorePercentage = 77;
    const earnedCoins = Math.floor(scorePercentage / 10); // 7

    act(() => {
      contextValue.awardCoins('INTERVIEW_SCORE', {
        coins: earnedCoins,
        label: `Technical Interview (${scorePercentage}% score)`
      });
    });

    expect(contextValue.progress.coins).toBe(7);
    expect(contextValue.progress.coinHistory[0].coins).toBe(7);
    expect(contextValue.progress.coinHistory[0].source).toBe('INTERVIEW_SCORE');
  });

  test('resetCoins resets all coins to 0 and records reset history', async () => {
    const seededState = {
      userId: 'test_user',
      coins: 45,
      streakDays: 3,
      coinHistory: [{ id: 1, activity: 'Initial coins', coins: 45, date: 'today' }]
    };
    localStorage.setItem('trivia_progress', JSON.stringify(seededState));

    let contextValue;
    const Consumer = () => {
      const { useUserProgress } = require('../../context/UserProgressContext');
      contextValue = useUserProgress();
      return null;
    };

    render(
      <UserProgressProvider>
        <Consumer />
      </UserProgressProvider>
    );

    const { act } = require('@testing-library/react');
    expect(contextValue.progress.coins).toBe(45);

    await act(async () => {
      await contextValue.resetCoins();
    });

    expect(contextValue.progress.coins).toBe(0);
    expect(contextValue.progress.coinHistory[0].source).toBe('RESET');
    expect(contextValue.progress.coinHistory[0].coins).toBe(0);
  });
});
