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
  DAILY_LOGIN: { label: 'Daily Login', coins: 20 },
  COMPLETE_QUIZ: { label: 'Complete a Quiz', coins: 10 },
  PERFECT_SCORE: { label: 'Score 100%', coins: 30, suffix: 'Bonus' },
  ANSWER_CORRECTLY: { label: 'Answer Correctly', coins: 5, suffix: 'question' },
  FINISH_UNDER_TIME: { label: 'Finish Under Time', coins: 20 },
  SEVEN_DAY_STREAK: { label: '7-Day Streak', coins: 100 },
  THIRTY_DAY_STREAK: { label: '30-Day Streak', coins: 500 },
  COMPLETE_TOPIC: { label: 'Complete a Topic', coins: 150 },
  COMPLETE_ALL_LEVELS: { label: 'Complete All Levels', coins: 500 },
  AI_MOCK_INTERVIEW: { label: 'AI Mock Interview Completed', coins: 100 },
  EXCELLENT_INTERVIEW: { label: 'Excellent Interview Score (>90%)', coins: 150 },
  FIRST_ATTEMPT_PERFECT: { label: 'First Attempt Perfect Score', coins: 50 },
  NO_PROCTORING_VIOLATIONS: { label: 'No Proctoring Violations', coins: 30 },
  REFER_FRIEND: { label: 'Refer a Friend', coins: 200 },
  DAILY_CHALLENGE: { label: 'Complete Daily Challenge', coins: 75 },
  WEEKLY_WINNER: { label: 'Weekly Challenge Winner', coins: 500 },
  MONTHLY_TOP_10: { label: 'Monthly Leaderboard Top 10', coins: 1000 },
  CODING_CHALLENGE: { label: 'Solve Coding Challenge', coins: 80 },
  ACCURACY_STREAK: { label: 'Maintain 95% Accuracy (10 quizzes)', coins: 200 }
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
    if (!reward) return;

    setProgress(prev => {
      const amount = details.coins ?? reward.coins;
      const nextHistory = [
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          activity: details.label || reward.label,
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

    toast.success(`+${details.coins ?? reward.coins} coins: ${details.label || reward.label}`);
  };

  const claimDailyLoginReward = () => {
    const today = todayKey();
    if (progress.lastLoginRewardDate === today) {
      toast.info('Daily login reward already claimed today.');
      return false;
    }

    setProgress(prev => ({
      ...prev,
      lastLoginRewardDate: today,
      streakDays: Math.max(prev.streakDays || 1, 1)
    }));
    awardCoins('DAILY_LOGIN');
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
      const isTopicComplete = rewardMeta.totalLevels && newPassed.length >= rewardMeta.totalLevels;
      const rewardEntries = [
        { key: 'ANSWER_CORRECTLY', label: `${category} level ${level} correct`, coins: COIN_REWARDS.ANSWER_CORRECTLY.coins },
        { key: 'COMPLETE_QUIZ', label: `Completed ${category} level ${level}`, coins: COIN_REWARDS.COMPLETE_QUIZ.coins }
      ];

      if (rewardMeta.finishedUnderTime) {
        rewardEntries.push({ key: 'FINISH_UNDER_TIME', label: `Finished ${category} level ${level} under time`, coins: COIN_REWARDS.FINISH_UNDER_TIME.coins });
      }

      if (isTopicComplete) {
        rewardEntries.push({ key: 'COMPLETE_TOPIC', label: `Completed ${category} topic`, coins: COIN_REWARDS.COMPLETE_TOPIC.coins });
        rewardEntries.push({ key: 'COMPLETE_ALL_LEVELS', label: `Completed all ${category} levels`, coins: COIN_REWARDS.COMPLETE_ALL_LEVELS.coins });
      }

      const earnedCoins = rewardEntries.reduce((total, reward) => total + reward.coins, 0);

      const updatedProgress = {
        ...prev,
        coins: (prev.coins || 0) + earnedCoins,
        coinHistory: [
          ...rewardEntries.map(reward => ({
            id: Date.now() + Math.floor(Math.random() * 1000) + Math.floor(Math.random() * 1000),
            activity: reward.label,
            coins: reward.coins,
            source: reward.key,
            date: formatScoreTimestamp()
          })),
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

      toast.success(`+${earnedCoins} coins earned! Level ${level} completed.`);

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
        awardCoins,
        claimDailyLoginReward,
        getTotalScore,
        getCategoryProgress,
        signInUser,
        signUpUser,
        logoutUser,
        forgotPasswordUser,
        fetchGlobalLeaderboard,
        updateUserProfile
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
