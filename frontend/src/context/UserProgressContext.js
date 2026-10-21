import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { userProgressAPI, leaderboardAPI, usersAPI, authAPI } from '../services/api';

const UserProgressContext = createContext();

const initialProgressState = {
  userId: null,
  token: null,
  username: null,
  email: '',
  profilePhoto: '',
  fullName: '',
  collegeName: '',
  branch: '',
  year: '',
  bio: '',
  createdAt: null,
  categories: {},
  science: { passed: [], score: 0 },
  jungle: { passed: [], score: 0 },
  math: { passed: [], score: 0 },
  history: { passed: [], score: 0 },
  highestScore: 0,
  leaderboard: [],
  coins: 0,
  coinHistory: [],
  streakDays: 1,
  lastLoginRewardDate: null
};

export const COIN_REWARDS = {
  DAILY_LOGIN: { label: 'Daily Login', coins: 5 },
  ANSWER_CORRECTLY: { label: 'Quiz Correct Answer', coins: 1, suffix: 'per question' },
  SEVEN_DAY_STREAK: { label: '7-Day Streak Bonus', coins: 25 },
  INTERVIEW_SCORE: { label: 'Interview Score Bonus', coins: 1, suffix: 'per 10% score' }
};

const todayKey = () => new Date().toISOString().slice(0, 10);

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

  // Global Auth Modal State for Guest Browsing
  const [authModalConfig, setAuthModalConfig] = useState({
    isOpen: false,
    targetPath: null,
    title: '',
    subtitle: ''
  });

  const openAuthModal = (targetPath = null, meta = {}) => {
    setAuthModalConfig({
      isOpen: true,
      targetPath: targetPath || null,
      title: meta?.title || '',
      subtitle: meta?.subtitle || ''
    });
  };

  const closeAuthModal = () => {
    setAuthModalConfig({
      isOpen: false,
      targetPath: null,
      title: '',
      subtitle: ''
    });
  };

  /**
   * Guards protected actions.
   * If logged in: executes actionCallback and returns true.
   * If not logged in: opens AuthModal with targetPath & returns false.
   */
  const requireAuth = (targetPath = null, actionCallback = null, meta = {}) => {
    if (progress && progress.username) {
      if (typeof actionCallback === 'function') {
        actionCallback();
      }
      return true;
    }
    openAuthModal(targetPath, meta);
    return false;
  };

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
            highestScore: progress.highestScore,
            coins: progress.coins || 0,
            streakDays: progress.streakDays || 1,
            lastLoginRewardDate: progress.lastLoginRewardDate || null,
            coinHistory: progress.coinHistory || []
          });
        } catch (error) {
          console.log('MongoDB progress sync failed, running in offline mode');
        }
      }
    };

    syncWithServer();
  }, [progress]);

  useEffect(() => {
    const handleJwtExpired = () => {
      logoutUser();
      toast.error('Session expired. Please log in again.');
    };
    window.addEventListener('jwt-expired', handleJwtExpired);
    return () => window.removeEventListener('jwt-expired', handleJwtExpired);
  }, []);

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
      const token = user.token;

      const finalProgress = {
        ...initialProgressState,
        userId: userId,
        token: token,
        username: username
      };

      setProgress(finalProgress);
      toast.success(`Account created successfully! Welcome, ${username}!`);
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
      const token = user.token;

      // Save token to localStorage immediately so that interceptors have it for the next requests
      const tempProgress = { ...progress, userId, token, username };
      localStorage.setItem("trivia_progress", JSON.stringify(tempProgress));

      // Fetch user's saved progress from MongoDB
      const progressRes = await userProgressAPI.getProgress(userId);
      const dbProgressList = progressRes.data || [];

      let finalProgress = {
        ...initialProgressState,
        userId: userId,
        token: token,
        username: username
      };

      // Fetch full user profile for new fields
      try {
        const profileRes = await authAPI.getProfile(userId);
        if (profileRes.data?.success && profileRes.data.user) {
          const p = profileRes.data.user;
          finalProgress.email = p.email || '';
          finalProgress.profilePhoto = p.profilePhoto || '';
          finalProgress.fullName = p.fullName || '';
          finalProgress.collegeName = p.collegeName || '';
          finalProgress.branch = p.branch || '';
          finalProgress.year = p.year || '';
          finalProgress.bio = p.bio || '';
          finalProgress.createdAt = p.createdAt || null;
        }
      } catch (e) {
        console.log('Could not fetch extended profile, continuing...');
      }

      if (dbProgressList.length > 0) {
        const dbProgress = dbProgressList[0];
        finalProgress = {
          ...finalProgress,
          categories: dbProgress.categories || {},
          science: dbProgress.science || { passed: [], score: 0 },
          jungle: dbProgress.jungle || { passed: [], score: 0 },
          math: dbProgress.math || { passed: [], score: 0 },
          history: dbProgress.history || { passed: [], score: 0 },
          highestScore: dbProgress.highestScore || 0,
          coins: dbProgress.coins ?? 0,
          streakDays: dbProgress.streakDays ?? 1,
          lastLoginRewardDate: dbProgress.lastLoginRewardDate ?? null,
          coinHistory: Array.isArray(dbProgress.coinHistory) ? dbProgress.coinHistory : []
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

  // Update user profile (photo, email, password, etc.)
  const updateUserProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile({ userId: progress.userId, ...profileData });
      if (response.data?.success && response.data.user) {
        const u = response.data.user;
        setProgress(prev => ({
          ...prev,
          email: u.email ?? prev.email,
          profilePhoto: u.profilePhoto ?? prev.profilePhoto,
          fullName: u.fullName ?? prev.fullName,
          collegeName: u.collegeName ?? prev.collegeName,
          branch: u.branch ?? prev.branch,
          year: u.year ?? prev.year,
          bio: u.bio ?? prev.bio
        }));
        toast.success('Profile updated successfully!');
        return { success: true };
      }
      return { success: false, error: 'Unknown error' };
    } catch (error) {
      console.error('Profile update error:', error);
      if (!error.response || error.code === 'ERR_NETWORK') {
        toast.error('Cannot reach the server.');
        return { success: false, error: 'Server unreachable' };
      }
      const errMsg = error.response?.data?.error || 'Failed to update profile.';
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("trivia_progress");
    setProgress({ ...initialProgressState });
    toast.info("Signed out successfully.");
  };

  const awardCoins = (rewardKey, details = {}) => {
    const reward = COIN_REWARDS[rewardKey];
    const amount = details.coins ?? reward?.coins ?? 0;
    if (amount <= 0) return;

    const label = details.label || reward?.label || rewardKey;

    setProgress(prev => {
      const nextHistory = [
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          activity: label,
          coins: amount,
          source: rewardKey,
          date: formatScoreTimestamp()
        },
        ...(prev.coinHistory || [])
      ].slice(0, 30);

      return {
        ...prev,
        coins: (prev.coins || 0) + amount,
        coinHistory: nextHistory
      };
    });

    toast.success(`+${amount} coins: ${label}`);
  };

  const getYesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  const claimDailyLoginReward = () => {
    const today = todayKey();
    if (progress.lastLoginRewardDate === today) {
      toast.info('Daily login reward already claimed today.');
      return false;
    }

    const yesterday = getYesterdayKey();
    let newStreak = 1;
    if (progress.lastLoginRewardDate === yesterday) {
      newStreak = (progress.streakDays || 1) + 1;
    } else if (progress.lastLoginRewardDate && progress.lastLoginRewardDate !== today) {
      newStreak = 1;
    } else {
      newStreak = 1;
    }

    const isSevenDayStreak = (newStreak % 7 === 0);
    const loginRewardCoins = COIN_REWARDS.DAILY_LOGIN.coins; // 5 coins
    const streakBonusCoins = isSevenDayStreak ? COIN_REWARDS.SEVEN_DAY_STREAK.coins : 0; // 25 coins
    const totalAward = loginRewardCoins + streakBonusCoins;

    const newHistoryEntries = [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        activity: 'Daily Login',
        coins: loginRewardCoins,
        source: 'DAILY_LOGIN',
        date: formatScoreTimestamp()
      }
    ];

    if (isSevenDayStreak) {
      newHistoryEntries.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000) + 1,
        activity: `7-Day Streak Bonus (${newStreak} days)`,
        coins: streakBonusCoins,
        source: 'SEVEN_DAY_STREAK',
        date: formatScoreTimestamp()
      });
    }

    setProgress(prev => ({
      ...prev,
      lastLoginRewardDate: today,
      streakDays: newStreak,
      coins: (prev.coins || 0) + totalAward,
      coinHistory: [...newHistoryEntries, ...(prev.coinHistory || [])].slice(0, 30)
    }));

    toast.success(`+${loginRewardCoins} coins: Daily Login`);
    if (isSevenDayStreak) {
      toast.success(`+${streakBonusCoins} coins: 7-Day Streak Milestone!`);
    }

    return true;
  };

  const markPassed = (category, level, rewardMeta = {}) => {
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
      const scoreIncrement = rewardMeta.points ?? rewardMeta.scoreIncrement ?? 20;
      const newScore = categoryProgress.score + scoreIncrement;

      // Only rule for quizzes: Correct answer quize: + 1coins
      const earnedCoins = COIN_REWARDS.ANSWER_CORRECTLY.coins;
      const rewardEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        activity: `Quiz correct answer (${category} L${level})`,
        coins: earnedCoins,
        source: 'ANSWER_CORRECTLY',
        date: formatScoreTimestamp()
      };

      const updatedProgress = {
        ...prev,
        coins: (prev.coins || 0) + earnedCoins,
        coinHistory: [
          rewardEntry,
          ...(prev.coinHistory || [])
        ].slice(0, 30),
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

      toast.success(`+${earnedCoins} coin: Correct answer!`);

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

  const resetCoins = async () => {
    const resetEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      activity: 'Coins balance reset to 0',
      coins: 0,
      source: 'RESET',
      date: formatScoreTimestamp()
    };

    const nextHistory = [resetEntry, ...(progress.coinHistory || [])].slice(0, 30);

    setProgress(prev => ({
      ...prev,
      coins: 0,
      coinHistory: [resetEntry, ...(prev.coinHistory || [])].slice(0, 30)
    }));

    if (progress.userId) {
      try {
        await userProgressAPI.updateProgress(progress.userId, {
          coins: 0,
          coinHistory: nextHistory
        });
      } catch (e) {
        console.log('Failed to reset coins on server', e);
      }
    }
    toast.success('All coins have been reset to 0!');
    return { success: true };
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
        resetCoins,
        awardCoins,
        claimDailyLoginReward,
        getTotalScore,
        getCategoryProgress,
        signInUser,
        signUpUser,
        logoutUser,
        forgotPasswordUser,
        fetchGlobalLeaderboard,
        updateUserProfile,
        authModalConfig,
        openAuthModal,
        closeAuthModal,
        requireAuth
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
