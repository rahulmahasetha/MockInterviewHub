import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { userProgressAPI, leaderboardAPI, usersAPI, authAPI } from '../services/api';

const UserProgressContext = createContext();

const initialProgressState = {
  userId: null,
  username: null,
  categories: {},
  science: { passed: [], score: 0 },
  jungle: { passed: [], score: 0 },
  math: { passed: [], score: 0 },
  history: { passed: [], score: 0 },
  highestScore: 0,
  leaderboard: []
};

const formatScoreTimestamp = () => {
  return new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export function UserProgressProvider({ children }) {
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem("trivia_progress");
      return saved ? JSON.parse(saved) : initialProgressState;
    } catch (e) {
      return initialProgressState;
    }
  });

  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync with localStorage & Backend
  useEffect(() => {
    localStorage.setItem("trivia_progress", JSON.stringify(progress));

    const syncWithServer = async () => {
      if (progress.userId) {
        try {
          await userProgressAPI.updateProgress(progress.userId, {
            categories: progress.categories || {},
            science: progress.science,
            jungle: progress.jungle,
            math: progress.math,
            history: progress.history,
            highestScore: progress.highestScore
          });
        } catch (error) {
          console.log('MongoDB progress sync failed, running in offline mode');
        }
      }
    };

    syncWithServer();
  }, [progress]);

  // Load global leaderboard on mount or when requested
  const fetchGlobalLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await leaderboardAPI.getLeaderboard();
      setGlobalLeaderboard(response.data || []);
    } catch (error) {
      console.log('Failed to fetch online leaderboard, using local copy');
      setGlobalLeaderboard(progress.leaderboard || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  // Register a new user (Sign Up)
  const signUpUser = async (username, email, password) => {
    try {
      const response = await authAPI.signup({ username, email, password });
      const user = response.data;
      const userId = user.userId;

      const finalProgress = {
        ...initialProgressState,
        userId: userId,
        username: username
      };

      setProgress(finalProgress);
      toast.success(`Account created successfully! Welcome, ${username}! 🎉`);
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);

      // Show clear error when server is unreachable
      if (!error.response || error.code === 'ERR_NETWORK') {
        toast.error('Cannot reach the server. Please make sure the backend is running on port 3001.');
        return { success: false, error: 'Server unreachable' };
      }

      const errMsg = error.response?.data?.error || 'Registration failed. Try again.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // Forgot Password
  const forgotPasswordUser = async (username, email, newPassword) => {
    try {
      const response = await authAPI.forgotPassword({ username, email, newPassword });
      toast.success(response.data.message || 'Password updated successfully!');
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error);
      if (!error.response || error.code === 'ERR_NETWORK') {
        toast.error('Cannot reach the server.');
        return { success: false, error: 'Server unreachable' };
      }
      const errMsg = error.response?.data?.error || 'Failed to update password.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // Sign In an existing user
  const signInUser = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password });
      const user = response.data;
      const userId = user.userId;

      // Fetch user's saved progress from MongoDB
      const progressRes = await userProgressAPI.getProgress(userId);
      const dbProgressList = progressRes.data || [];

      let finalProgress = {
        ...initialProgressState,
        userId: userId,
        username: username
      };

      if (dbProgressList.length > 0) {
        const dbProgress = dbProgressList[0];
        finalProgress = {
          ...finalProgress,
          categories: dbProgress.categories || {},
          science: dbProgress.science || { passed: [], score: 0 },
          jungle: dbProgress.jungle || { passed: [], score: 0 },
          math: dbProgress.math || { passed: [], score: 0 },
          history: dbProgress.history || { passed: [], score: 0 },
          highestScore: dbProgress.highestScore || 0
        };
        toast.success(`Welcome back, ${username}! Progress synchronized.`);
      } else {
        toast.success(`Successfully signed in as ${username}! Let's play.`);
      }

      setProgress(finalProgress);
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);

      // Show clear error when server is unreachable
      if (!error.response || error.code === 'ERR_NETWORK') {
        toast.error('Cannot reach the server. Please make sure the backend is running on port 3001.');
        return { success: false, error: 'Server unreachable' };
      }

      const errMsg = error.response?.data?.error || 'Sign in failed. Check your credentials.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("trivia_progress");
    setProgress({ ...initialProgressState });
    toast.info("Signed out successfully.");
  };

  const markPassed = (category, level) => {
    setProgress((prev) => {
      const currentCategories = prev.categories || {};
      const categoryProgress = currentCategories[category] || prev[category] || { passed: [], score: 0 };
      const levelIndex = level - 1;

      const isAlreadyCompleted = categoryProgress.passed.includes(levelIndex);

      if (isAlreadyCompleted) {
        toast.info('Level already completed!');
        return prev;
      }

      const newPassed = [...new Set([...categoryProgress.passed, levelIndex])];
      const newScore = categoryProgress.score + 20;

      const updatedProgress = {
        ...prev,
        categories: {
          ...currentCategories,
          [category]: {
            ...categoryProgress,
            passed: newPassed,
            score: newScore
          }
        },
        [category]: {
          ...categoryProgress,
          passed: newPassed,
          score: newScore
        }
      };

      const totalScore = Object.values(updatedProgress.categories || {}).reduce((total, cat) => {
        if (cat && typeof cat === 'object' && 'score' in cat) {
          return total + cat.score;
        }
        return total;
      }, 0);

      toast.success(`+20 points! Level ${level} completed!`);

      return {
        ...updatedProgress,
        highestScore: Math.max(prev.highestScore, totalScore)
      };
    });
  };

  const addPenalty = (category, penalty) => {
    setProgress(prev => {
      const currentCategories = prev.categories || {};
      const categoryProgress = currentCategories[category] || prev[category] || { passed: [], score: 0 };
      const newScore = Math.max(0, categoryProgress.score - penalty);

      toast.error(`-${penalty} points penalty!`);

      return {
        ...prev,
        categories: {
          ...currentCategories,
          [category]: {
            ...categoryProgress,
            score: newScore
          }
        },
        [category]: {
          ...categoryProgress,
          score: newScore
        }
      };
    });
  };

  const isLevelCompleted = (category, level) => {
    const categoryProgress = progress.categories?.[category] || progress[category];
    if (!categoryProgress) return false;
    return categoryProgress.passed.includes(level - 1);
  };

  const updateHighestScore = (total) => {
    setProgress((prev) => ({
      ...prev,
      highestScore: Math.max(prev.highestScore, total)
    }));
  };

  const resetProgress = async () => {
    const fresh = {
      ...initialProgressState,
      userId: progress.userId,
      username: progress.username
    };

    setProgress(fresh);

    if (progress.userId) {
      try {
        await userProgressAPI.updateProgress(progress.userId, {
          categories: {},
          science: { passed: [], score: 0 },
          jungle: { passed: [], score: 0 },
          math: { passed: [], score: 0 },
          history: { passed: [], score: 0 },
          highestScore: 0
        });
      } catch (e) {
        console.log('Failed to reset progress on server');
      }
    }
    toast.success('Progress reset successfully!');
  };

  const saveToLeaderboard = async (name, totalScore) => {
    const normalizedName = name.trim();
    const newEntry = {
      name: normalizedName,
      score: totalScore,
      date: formatScoreTimestamp(),
      id: Date.now() + Math.floor(Math.random() * 1000)
    };

    // Save locally using the same one-row-per-user rule as MongoDB.
    setProgress((prev) => {
      const existingLocal = (prev.leaderboard || []).find(
        entry => entry.name?.toLowerCase() === normalizedName.toLowerCase()
      );

      const updatedEntry = existingLocal
        ? { ...existingLocal, score: totalScore, date: newEntry.date }
        : newEntry;

      const updated = [
        ...(prev.leaderboard || []).filter(
          entry => entry.name?.toLowerCase() !== normalizedName.toLowerCase()
        ),
        updatedEntry
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return {
        ...prev,
        leaderboard: updated
      };
    });

    // Save to database when the backend is available. Local save above still
    // keeps the score visible when the API server is offline.
    try {
      await leaderboardAPI.addToLeaderboard(newEntry);
      toast.success('Score submitted to global leaderboard!');
      await fetchGlobalLeaderboard();
      return { success: true };
    } catch (error) {
      console.error('Leaderboard submit failed:', error);

      if (!error.response || error.code === 'ERR_NETWORK') {
        toast.error('Backend server is not running on port 3001. Score saved locally only.');
        return { success: false, error: 'Server unreachable' };
      }

      const errMsg = error.response?.data?.error || 'Failed to submit score to global leaderboard.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const getTotalScore = () => {
    const categoryScores = Object.values(progress.categories || {});
    if (categoryScores.length > 0) {
      return categoryScores.reduce((total, item) => total + (item?.score || 0), 0);
    }

    return (progress.science?.score || 0) + (progress.jungle?.score || 0) + (progress.math?.score || 0) + (progress.history?.score || 0);
  };

  const getCategoryProgress = (category) => {
    return progress.categories?.[category] || progress[category] || { passed: [], score: 0 };
  };

  return (
    <UserProgressContext.Provider
      value={{
        progress,
        globalLeaderboard,
        isLoading,
        markPassed,
        addPenalty,
        isLevelCompleted,
        updateHighestScore,
        saveToLeaderboard,
        resetProgress,
        getTotalScore,
        getCategoryProgress,
        signInUser,
        signUpUser,
        logoutUser,
        forgotPasswordUser,
        fetchGlobalLeaderboard
      }}
    >
      {children}
    </UserProgressContext.Provider>
  );
}

export const useUserProgress = () => {
  const context = useContext(UserProgressContext);
  if (!context) {
    throw new Error('useUserProgress must be used within a UserProgressProvider');
  }
  return context;
};
