import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { userProgressAPI, leaderboardAPI, usersAPI } from '../services/api';

const UserProgressContext = createContext();

const initialProgressState = {
  userId: null,
  username: null,
  science: { passed: [], score: 0 },
  jungle: { passed: [], score: 0 },
  math: { passed: [], score: 0 },
  history: { passed: [], score: 0 },
  highestScore: 0,
  leaderboard: []   
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

  // Register or Login User
  const loginUser = async (username) => {
    try {
      // 1. Create or fetch user from DB
      const userRes = await usersAPI.createUser({ username });
      const user = userRes.data;
      const userId = user._id || user.id;

      // 2. Fetch user's saved progress from DB
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
          science: dbProgress.science || { passed: [], score: 0 },
          jungle: dbProgress.jungle || { passed: [], score: 0 },
          math: dbProgress.math || { passed: [], score: 0 },
          history: dbProgress.history || { passed: [], score: 0 },
          highestScore: dbProgress.highestScore || 0
        };
        toast.success(`Welcome back, ${username}! Progress loaded.`);
      } else {
        // Create new progress entry in DB
        await userProgressAPI.createProgress({
          userId: userId,
          science: { passed: [], score: 0 },
          jungle: { passed: [], score: 0 },
          math: { passed: [], score: 0 },
          history: { passed: [], score: 0 },
          highestScore: 0
        });
        toast.success(`Welcome, ${username}! Let's start learning.`);
      }

      setProgress(finalProgress);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      // Fallback: Local login if backend is unavailable
      const localId = 'offline_' + Date.now();
      setProgress(prev => ({
        ...prev,
        userId: localId,
        username: username
      }));
      toast.info(`Offline Mode: Signed in as ${username}`);
      return true;
    }
  };

  const logoutUser = () => {
    setProgress(initialProgressState);
    localStorage.removeItem("trivia_progress");
    toast.info("Signed out successfully.");
  };

  const markPassed = (category, level) => {
    setProgress((prev) => {
      const categoryProgress = prev[category] || { passed: [], score: 0 };
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
        [category]: {
          ...categoryProgress,
          passed: newPassed,
          score: newScore
        }
      };

      const totalScore = Object.values(updatedProgress).reduce((total, cat) => {
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
      const categoryProgress = prev[category] || { passed: [], score: 0 };
      const newScore = Math.max(0, categoryProgress.score - penalty);
      
      toast.error(`-${penalty} points penalty!`);
      
      return {
        ...prev,
        [category]: {
          ...categoryProgress,
          score: newScore
        }
      };
    });
  };

  const isLevelCompleted = (category, level) => {
    const categoryProgress = progress[category];
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
    const newEntry = { 
      name, 
      score: totalScore, 
      date: new Date().toLocaleDateString(),
      id: Date.now() + Math.floor(Math.random() * 1000)
    };
    
    // Save locally
    setProgress((prev) => {
      const updated = [...(prev.leaderboard || []), newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return {
        ...prev,
        leaderboard: updated
      };
    });

    // Save to Database
    try {
      await leaderboardAPI.addToLeaderboard(newEntry);
      toast.success('Score submitted to global leaderboard!');
      fetchGlobalLeaderboard(); // refresh leaderboard list
    } catch (error) {
      toast.error('Failed to submit score to global leaderboard');
    }
  };

  const getTotalScore = () => {
    return (
      (progress.science?.score || 0) +
      (progress.jungle?.score || 0) +
      (progress.math?.score || 0) +
      (progress.history?.score || 0)
    );
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
        loginUser,
        logoutUser,
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