import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { interviewAPI, resumeAPI } from '../services/api';
import { useUserProgress } from '../context/UserProgressContext';

export default function ProfileSection({
  progress: propsProgress,
  LEVEL,
  XP,
  totalScore,
  completedSections,
  categories,
  getCategoryProgress,
  fileInputRef,
  handlePhotoChange,
  profilePhoto,
  collegeName,
  branch,
  year,
  openProfileSettings,
  navigate,
  setActiveNav,
  resetCoins: propsResetCoins
}) {
  const userProgressContext = useUserProgress();
  const progress = propsProgress || userProgressContext?.progress || {};
  const resetCoins = propsResetCoins || userProgressContext?.resetCoins;

  const [interviews, setInterviews] = useState([]);
  const [resumeInterviews, setResumeInterviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [isResettingCoins, setIsResettingCoins] = useState(false);

  const handleResetCoins = async () => {
    const currentCoins = progress?.coins || 0;
    if (currentCoins === 0) {
      toast.info('Your coin balance is already 0.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reset all your coins?\n\nThis will reset your current balance of ${currentCoins.toLocaleString()} coins back to 0. This action cannot be undone.`
    );
    if (!confirmed) return;

    if (typeof resetCoins === 'function') {
      setIsResettingCoins(true);
      try {
        await resetCoins();
      } catch (err) {
        console.error('Error resetting coins:', err);
        toast.error('Failed to reset coins.');
      } finally {
        setIsResettingCoins(false);
      }
    }
  };

  // Fetch real user data from existing APIs
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (!progress?.userId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [techRes, resRes] = await Promise.allSettled([
          interviewAPI.getHistory(progress.userId),
          resumeAPI.getHistory(progress.userId)
        ]);

        if (isMounted) {
          if (techRes.status === 'fulfilled' && techRes.value?.data?.success) {
            setInterviews(techRes.value.data.results || []);
          }
          if (resRes.status === 'fulfilled' && resRes.value?.data?.success) {
            setResumeInterviews(resRes.value.data.results || []);
          }
        }
      } catch (err) {
        console.error('Failed to load profile history data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [progress?.userId]);

  // Lock background screen when modal is open and handle Escape key
  useEffect(() => {
    if (selectedAttempt) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Prevent background scrolling and eliminate layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setSelectedAttempt(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedAttempt]);

  // 1. Technical Interview Metrics
  const techMetrics = useMemo(() => {
    const count = interviews.length;
    if (count === 0) {
      return {
        count: 0,
        avgScore: null,
        avgTech: 0,
        avgComm: 0,
        avgConf: 0,
        strengths: [],
        areas: [],
        latest: null
      };
    }

    const avgScore = Math.round(interviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / count);
    const avgTech = Math.round(interviews.reduce((sum, i) => sum + (i.technicalScore || 0), 0) / count);
    const avgComm = Math.round(interviews.reduce((sum, i) => sum + (i.communicationScore || 0), 0) / count);
    const avgConf = Math.round(interviews.reduce((sum, i) => sum + (i.confidenceScore || 0), 0) / count);

    // Collect real strengths and areas from history
    const allStrengths = interviews.flatMap(i => i.strengths || []).filter(Boolean);
    const allAreas = interviews.flatMap(i => i.areasForImprovement || []).filter(Boolean);

    return {
      count,
      avgScore,
      avgTech,
      avgComm,
      avgConf,
      strengths: [...new Set(allStrengths)].slice(0, 5),
      areas: [...new Set(allAreas)].slice(0, 5),
      latest: interviews[0]
    };
  }, [interviews]);

  // 2. Resume Interview Metrics
  const resumeMetrics = useMemo(() => {
    const count = resumeInterviews.length;
    if (count === 0) {
      return {
        count: 0,
        avgScore: null,
        avgTech: 0,
        avgComm: 0,
        avgConf: 0,
        strengths: [],
        areas: [],
        latest: null
      };
    }

    const avgScore = Math.round(resumeInterviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / count);
    const avgTech = Math.round(resumeInterviews.reduce((sum, r) => sum + (r.technicalScore || 0), 0) / count);
    const avgComm = Math.round(
      resumeInterviews.reduce((sum, r) => sum + (r.communicationScore || r.fluencyScore || 0), 0) / count
    );
    const avgConf = Math.round(resumeInterviews.reduce((sum, r) => sum + (r.confidenceScore || 0), 0) / count);

    const allStrengths = resumeInterviews.flatMap(r => r.strengths || []).filter(Boolean);
    const allWeaknesses = resumeInterviews.flatMap(r => r.weaknesses || []).filter(Boolean);

    return {
      count,
      avgScore,
      avgTech,
      avgComm,
      avgConf,
      strengths: [...new Set(allStrengths)].slice(0, 5),
      areas: [...new Set(allWeaknesses)].slice(0, 5),
      latest: resumeInterviews[0]
    };
  }, [resumeInterviews]);

  // 3. Quiz Performance Metrics
  const quizMetrics = useMemo(() => {
    const totalLevels = categories.reduce((sum, c) => sum + (c.levels?.length || 0), 0);
    const totalPassed = categories.reduce((sum, c) => sum + (getCategoryProgress(c.slug).passed?.length || 0), 0);

    const score = totalLevels > 0 && totalPassed > 0
      ? Math.round((totalPassed / totalLevels) * 100)
      : totalScore > 0
      ? Math.min(100, Math.round((totalScore / 1000) * 100))
      : null;

    // Categories where user has passed levels
    const masteredCategories = categories
      .filter(c => (getCategoryProgress(c.slug).passed?.length || 0) > 0)
      .map(c => {
        const passedCount = getCategoryProgress(c.slug).passed?.length || 0;
        const total = c.levels?.length || 1;
        return `${c.name} (${Math.round((passedCount / total) * 100)}% completed)`;
      });

    // Categories with pending levels
    const pendingCategories = categories
      .filter(c => {
        const passedCount = getCategoryProgress(c.slug).passed?.length || 0;
        const total = c.levels?.length || 0;
        return total > 0 && passedCount < total;
      })
      .map(c => {
        const remaining = (c.levels?.length || 0) - (getCategoryProgress(c.slug).passed?.length || 0);
        return `${c.name} (${remaining} questions pending)`;
      });

    return {
      totalLevels,
      totalPassed,
      score,
      strengths: masteredCategories.slice(0, 4),
      areas: pendingCategories.slice(0, 4)
    };
  }, [categories, getCategoryProgress, totalScore]);

  // Overall Performance Score out of 100
  const overallPerformance = useMemo(() => {
    const scores = [];
    if (techMetrics.avgScore !== null) scores.push(techMetrics.avgScore);
    if (resumeMetrics.avgScore !== null) scores.push(resumeMetrics.avgScore);
    if (quizMetrics.score !== null) scores.push(quizMetrics.score);

    if (scores.length === 0) {
      return {
        score: 0,
        hasData: false,
        label: 'No Sessions Yet',
        badgeClass: 'badge-neutral',
        readinessTier: 'Getting Started'
      };
    }

    const calculated = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    let label = 'Needs Practice';
    let badgeClass = 'badge-poor';
    let readinessTier = 'Foundation Stage';

    if (calculated >= 80) {
      label = 'Excellent';
      badgeClass = 'badge-good';
      readinessTier = 'Industry Ready';
    } else if (calculated >= 65) {
      label = 'Proficient';
      badgeClass = 'badge-avg';
      readinessTier = 'Competitive Candidate';
    } else if (calculated >= 45) {
      label = 'Developing';
      badgeClass = 'badge-avg';
      readinessTier = 'Developing Candidate';
    }

    return {
      score: calculated,
      hasData: true,
      label,
      badgeClass,
      readinessTier
    };
  }, [techMetrics.avgScore, resumeMetrics.avgScore, quizMetrics.score]);

  // Performance-Over-Time Chart Data: Chronological Previous Attempts
  const chronologicalAttempts = useMemo(() => {
    const sortedTech = [...interviews].sort((a, b) => new Date(a.date) - new Date(b.date));
    const sortedResume = [...resumeInterviews].sort((a, b) => new Date(a.date) - new Date(b.date));

    const techWithIndex = sortedTech.map((i, idx) => ({
      id: i._id || i.id || `tech-${i.date}-${idx}`,
      type: 'Technical Interview',
      typeShort: 'Tech',
      attemptNumber: idx + 1,
      topic: i.topic || 'General Technical',
      score: typeof i.overallScore === 'number' ? i.overallScore : 0,
      technicalScore: typeof i.technicalScore === 'number' ? i.technicalScore : null,
      communicationScore: typeof i.communicationScore === 'number' ? i.communicationScore : null,
      confidenceScore: typeof i.confidenceScore === 'number' ? i.confidenceScore : null,
      strengths: Array.isArray(i.strengths) ? i.strengths : [],
      areas: Array.isArray(i.areasForImprovement) ? i.areasForImprovement : [],
      coinsEarned: i.coinsEarned || 0,
      date: new Date(i.date),
      color: '#2563eb',
      icon: '💻',
      feedback: i.feedbackSummary,
      raw: i
    }));

    const resumeWithIndex = sortedResume.map((r, idx) => ({
      id: r._id || r.id || `res-${r.date}-${idx}`,
      type: 'Resume Interview',
      typeShort: 'Resume',
      attemptNumber: idx + 1,
      topic: r.category ? `Resume: ${r.category}` : 'Resume AI',
      score: typeof r.overallScore === 'number' ? r.overallScore : 0,
      technicalScore: typeof r.technicalScore === 'number' ? r.technicalScore : null,
      communicationScore: typeof r.communicationScore === 'number' ? r.communicationScore : null,
      confidenceScore: typeof r.confidenceScore === 'number' ? r.confidenceScore : null,
      strengths: Array.isArray(r.strengths) ? r.strengths : [],
      areas: Array.isArray(r.weaknesses) ? r.weaknesses : [],
      difficulty: r.difficulty || '',
      coinsEarned: r.coinsEarned || 0,
      date: new Date(r.date),
      color: '#7c3aed',
      icon: '📄',
      feedback: r.hiringRecommendation,
      raw: r
    }));

    const combined = [...techWithIndex, ...resumeWithIndex].sort((a, b) => a.date - b.date);
    return combined.map((item, idx) => ({
      ...item,
      overallAttemptNumber: idx + 1
    }));
  }, [interviews, resumeInterviews]);

  const filteredAttempts = useMemo(() => {
    if (historyFilter === 'tech') return chronologicalAttempts.filter(a => a.typeShort === 'Tech');
    if (historyFilter === 'resume') return chronologicalAttempts.filter(a => a.typeShort === 'Resume');
    return chronologicalAttempts;
  }, [chronologicalAttempts, historyFilter]);

  // Career Readiness Summary
  const careerReadiness = useMemo(() => {
    const totalPractice = interviews.length + resumeInterviews.length + quizMetrics.totalPassed;
    if (totalPractice === 0) {
      return {
        summary:
          'Welcome to MockInterviewHub! You have not completed any mock interviews or quizzes yet. Complete your first Technical or Resume interview to generate your verified career readiness evaluation.',
        techDepth: 0,
        commClarity: 0,
        resumeAlignment: 0,
        consistency: Math.min(100, (progress.streakDays || 1) * 15)
      };
    }

    const techDepth = techMetrics.avgScore !== null ? techMetrics.avgScore : quizMetrics.score !== null ? quizMetrics.score : 0;
    const commClarity = resumeMetrics.avgComm || techMetrics.avgComm || (overallPerformance.score > 0 ? Math.min(overallPerformance.score, 70) : 0);
    const resumeAlignment = resumeMetrics.avgScore !== null ? resumeMetrics.avgScore : 0;
    const consistency = Math.min(100, Math.round(((progress.streakDays || 1) / 7) * 70 + (quizMetrics.totalPassed > 0 ? 30 : 0)));

    const insights = [];
    if (techMetrics.count > 0) {
      if (techMetrics.avgScore >= 80) {
        insights.push('Strong technical execution with accurate conceptual problem-solving.');
      } else {
        insights.push('Technical fundamentals are established; practice edge-case handling and system architecture.');
      }
    }

    if (resumeMetrics.count > 0) {
      if (resumeMetrics.avgScore >= 80) {
        insights.push('Excellent project articulation and demonstrated alignment with your documented resume skills.');
      } else {
        insights.push('Resume answers are good; quantifying business impact with concrete metrics will further strengthen answers.');
      }
    }

    if (quizMetrics.totalPassed > 0) {
      insights.push(`Completed ${quizMetrics.totalPassed} quiz challenges demonstrating active daily retention.`);
    }

    const summaryText = insights.length > 0
      ? insights.join(' ')
      : 'Maintain consistent practice sessions across Technical and Resume formats to elevate your overall candidate profile.';

    return {
      summary: summaryText,
      techDepth,
      commClarity,
      resumeAlignment,
      consistency
    };
  }, [
    interviews.length,
    resumeInterviews.length,
    quizMetrics,
    techMetrics,
    resumeMetrics,
    overallPerformance.score,
    progress.streakDays
  ]);

  // Personalized Improvement Plan
  const improvementPlan = useMemo(() => {
    const items = [];

    // Technical weaknesses
    if (techMetrics.areas.length > 0) {
      items.push({
        id: 'plan-tech',
        priority: 'High Priority',
        priorityBadge: 'plan-badge-high',
        icon: '💻',
        domain: 'Technical Interview',
        title: `Strengthen: ${techMetrics.areas[0]}`,
        action: `Review architectural concepts, edge cases, and code structuring related to ${techMetrics.areas[0].toLowerCase()}.`,
        ctaText: 'Start Technical Mock',
        actionFn: () => navigate('/interview')
      });
    }

    // Resume weaknesses
    if (resumeMetrics.areas.length > 0) {
      items.push({
        id: 'plan-resume',
        priority: 'High Priority',
        priorityBadge: 'plan-badge-high',
        icon: '📄',
        domain: 'Resume Articulation',
        title: `Refine: ${resumeMetrics.areas[0]}`,
        action: `Use the STAR format (Situation, Task, Action, Result) to clearly articulate metrics and lessons for ${resumeMetrics.areas[0].toLowerCase()}.`,
        ctaText: 'Practice Resume AI',
        actionFn: () => navigate('/resume')
      });
    }

    // Secondary technical weakness if available
    if (techMetrics.areas.length > 1 && items.length < 3) {
      items.push({
        id: 'plan-tech-2',
        priority: 'Medium Priority',
        priorityBadge: 'plan-badge-med',
        icon: '🎯',
        domain: 'Technical Interview',
        title: `Practice: ${techMetrics.areas[1]}`,
        action: `Work through targeted mock questions on ${techMetrics.areas[1].toLowerCase()} to enhance interview confidence.`,
        ctaText: 'New Mock Session',
        actionFn: () => navigate('/interview')
      });
    }

    // Quiz area if available
    if (quizMetrics.areas.length > 0 && items.length < 3) {
      items.push({
        id: 'plan-quiz',
        priority: 'Recommended Practice',
        priorityBadge: 'plan-badge-rec',
        icon: '🧠',
        domain: 'Daily Quizzes',
        title: `Complete: ${quizMetrics.areas[0]}`,
        action: 'Clear remaining quiz questions to reinforce your knowledge and earn coin bonuses.',
        ctaText: 'Explore Quizzes',
        actionFn: () => setActiveNav('all')
      });
    }

    // Starter plan fallback if no weaknesses logged yet
    if (items.length === 0) {
      return [
        {
          id: 'starter-1',
          priority: 'Recommended Step',
          priorityBadge: 'plan-badge-rec',
          icon: '💻',
          domain: 'Technical Practice',
          title: 'Take Your First Technical Mock Interview',
          action: 'Choose your target role (Java, React, Frontend, Backend) to benchmark your technical explanations and problem-solving.',
          ctaText: 'Start Technical Mock',
          actionFn: () => navigate('/interview')
        },
        {
          id: 'starter-2',
          priority: 'Recommended Step',
          priorityBadge: 'plan-badge-rec',
          icon: '📄',
          domain: 'Resume Analysis',
          title: 'Practice Resume-Based Questions',
          action: 'Upload your resume to test whether you can clearly justify your past projects, stack choices, and achievements.',
          ctaText: 'Launch Resume AI',
          actionFn: () => navigate('/resume')
        },
        {
          id: 'starter-3',
          priority: 'Recommended Step',
          priorityBadge: 'plan-badge-rec',
          icon: '🧠',
          domain: 'Skill Drills',
          title: 'Solve Daily Quizzes',
          action: 'Answer multiple-choice challenges in HTML, CSS, React, and Programming to keep your learning streak active.',
          ctaText: 'Browse Quizzes',
          actionFn: () => setActiveNav('all')
        }
      ];
    }

    return items;
  }, [techMetrics.areas, resumeMetrics.areas, quizMetrics.areas, navigate, setActiveNav]);

  // Gamification: Achievements
  const achievements = useMemo(() => {
    const hasFirstSession = completedSections > 0 || interviews.length > 0 || resumeInterviews.length > 0;
    const hasTechAce = interviews.some(i => (i.overallScore || 0) >= 80);
    const hasResumePro = resumeInterviews.some(r => (r.overallScore || 0) >= 80);
    const hasStreak7 = (progress.streakDays || 1) >= 7;
    const hasQuizChamp = completedSections >= 2;
    const hasCoins50 = (progress.coins || 0) >= 50;

    return [
      {
        id: 'ach-first',
        icon: '🚀',
        title: 'First Step',
        desc: 'Complete your first quiz or mock interview session',
        unlocked: hasFirstSession,
        progressText: hasFirstSession ? 'Unlocked' : '0/1 session'
      },
      {
        id: 'ach-tech-ace',
        icon: '🎯',
        title: 'Technical Ace',
        desc: 'Score 80%+ on any Technical Mock Interview',
        unlocked: hasTechAce,
        progressText: hasTechAce
          ? 'Unlocked'
          : `${interviews.length > 0 ? Math.max(...interviews.map(i => i.overallScore || 0), 0) : 0}/80%`
      },
      {
        id: 'ach-resume-pro',
        icon: '📄',
        title: 'Resume Master',
        desc: 'Score 80%+ on a Resume-Based AI Interview',
        unlocked: hasResumePro,
        progressText: hasResumePro
          ? 'Unlocked'
          : `${resumeInterviews.length > 0 ? Math.max(...resumeInterviews.map(r => r.overallScore || 0), 0) : 0}/80%`
      },
      {
        id: 'ach-streak',
        icon: '🔥',
        title: 'Streak Warrior',
        desc: 'Maintain a 7-day daily learning streak',
        unlocked: hasStreak7,
        progressText: `${Math.min(progress.streakDays || 1, 7)}/7 days`
      },
      {
        id: 'ach-quiz-champ',
        icon: '🧠',
        title: 'Quiz Champion',
        desc: 'Successfully master 2 or more quiz categories',
        unlocked: hasQuizChamp,
        progressText: `${Math.min(completedSections, 2)}/2 categories`
      },
      {
        id: 'ach-coins',
        icon: '🪙',
        title: 'Century Club',
        desc: 'Accumulate 50 or more practice coins',
        unlocked: hasCoins50,
        progressText: `${Math.min(progress.coins || 0, 50)}/50 coins`
      }
    ];
  }, [completedSections, interviews, resumeInterviews, progress.streakDays, progress.coins]);

  // SVG Chart Calculations for Chronological Attempts
  const chartData = useMemo(() => {
    if (chronologicalAttempts.length === 0) return null;

    const width = 680;
    const height = 200;
    const padX = 45;
    const padY = 30;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const points = chronologicalAttempts.map((att, idx) => {
      const x = chronologicalAttempts.length > 1
        ? padX + (idx / (chronologicalAttempts.length - 1)) * plotW
        : padX + plotW / 2;
      const y = padY + (1 - att.score / 100) * plotH;
      return { ...att, x, y };
    });

    const polylinePoints = points.length > 1 ? points.map(p => `${p.x},${p.y}`).join(' ') : null;

    const areaPath =
      points.length > 1
        ? `M ${points[0].x},${padY + plotH} ` +
          points.map(p => `L ${p.x},${p.y}`).join(' ') +
          ` L ${points[points.length - 1].x},${padY + plotH} Z`
        : '';

    const highest = Math.max(...chronologicalAttempts.map(a => a.score));
    const average = Math.round(
      chronologicalAttempts.reduce((sum, a) => sum + a.score, 0) / chronologicalAttempts.length
    );
    const latest = chronologicalAttempts[chronologicalAttempts.length - 1].score;

    return {
      width,
      height,
      padX,
      padY,
      plotW,
      plotH,
      points,
      polylinePoints,
      areaPath,
      highest,
      average,
      latest
    };
  }, [chronologicalAttempts]);

  return (
    <div className="hd-profile-view">
      {/* ── 1. HERO PROFILE SECTION ── */}
      <div className="profile-hero-card">
        <div className="profile-hero-bg"></div>
        <div className="profile-hero-content">
          <div
            className="profile-avatar-container"
            onClick={() => fileInputRef.current.click()}
            title="Click to update profile photo"
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt={progress.username} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-large">{progress.username?.[0]?.toUpperCase()}</div>
            )}
            <div className="profile-avatar-overlay">
              <span>📸 Change</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div className="profile-info-main">
            <h2>{progress.fullName || progress.username}</h2>
            <p className="profile-username">@{progress.username}</p>
            <p className="profile-title">
              {collegeName ? `${collegeName}` : 'Explorer'}
              {branch ? ` • ${branch}` : ''}
              {year ? ` • ${year}` : ''}
            </p>
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleResetCoins}
              disabled={isResettingCoins}
              title="Reset all coins balance to 0"
            >
              <span>↺</span> {isResettingCoins ? 'Resetting...' : 'Reset All Coins'}
            </button>
            <button className="btn-primary" onClick={openProfileSettings} title="Edit profile settings">
              <span>⚙️</span> Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. GAMIFICATION SUMMARY BAR ── */}
      <div className="profile-stats-row gamification-stats-row">
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">🏆</div>
          <div className="stat-info">
            <div className="stat-value">{totalScore || XP}</div>
            <div className="stat-label">Total Score ({XP} XP)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-orange">🔥</div>
          <div className="stat-info">
            <div className="stat-value">{progress.streakDays || 1} Days</div>
            <div className="stat-label">Learning Streak</div>
          </div>
        </div>
        <div className="stat-card stat-card-coins">
          <div className="stat-icon stat-icon-blue">🪙</div>
          <div className="stat-info">
            <div className="stat-value-with-action">
              <div className="stat-value">{progress.coins || 0}</div>
              {(progress.coins || 0) > 0 && (
                <button
                  type="button"
                  className="coin-reset-pill-btn"
                  onClick={handleResetCoins}
                  disabled={isResettingCoins}
                  title="Reset all coins to 0"
                >
                  ↺ Reset
                </button>
              )}
            </div>
            <div className="stat-label">Coins Balance</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green">✅</div>
          <div className="stat-info">
            <div className="stat-value">{completedSections}</div>
            <div className="stat-label">Quizzes Passed</div>
          </div>
        </div>
      </div>

      {/* ── 3. CAREER READINESS & OVERALL PERFORMANCE HUB ── */}
      <div className="profile-readiness-hub">
        <div className="readiness-card-left">
          <div className="readiness-score-header">
            <h3>Overall Performance Score</h3>
            <span className={`readiness-tier-pill ${overallPerformance.badgeClass}`}>
              {overallPerformance.label}
            </span>
          </div>

          <div className="readiness-score-body">
            <div className="overall-score-gauge">
              <svg viewBox="0 0 36 36" className="circular-chart-lg">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle-overall"
                  strokeDasharray={`${overallPerformance.score}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="overall-gauge-center">
                <span className="overall-score-number">{overallPerformance.score}</span>
                <span className="overall-score-max">/ 100</span>
              </div>
            </div>

            <div className="overall-score-meta">
              <h4>{overallPerformance.readinessTier}</h4>
              <p className="text-muted">
                Blended evaluation across Resume, Technical, and Quiz practice sessions.
              </p>
              <div className="overall-pill-metrics">
                <span className="meta-pill">
                  💻 Tech: {techMetrics.avgScore !== null ? `${techMetrics.avgScore}%` : 'N/A'}
                </span>
                <span className="meta-pill">
                  📄 Resume: {resumeMetrics.avgScore !== null ? `${resumeMetrics.avgScore}%` : 'N/A'}
                </span>
                <span className="meta-pill">
                  🧠 Quiz: {quizMetrics.score !== null ? `${quizMetrics.score}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="readiness-card-right">
          <div className="card-header-clean">
            <h3>Career Readiness Summary</h3>
            <span className="card-header-date">Actual Practice Diagnostics</span>
          </div>

          <div className="readiness-pillars-grid">
            <div className="pillar-item">
              <div className="pillar-info">
                <span>Technical Depth</span>
                <strong>{careerReadiness.techDepth}%</strong>
              </div>
              <div className="pillar-bar">
                <div className="pillar-fill fill-tech" style={{ width: `${careerReadiness.techDepth}%` }} />
              </div>
            </div>

            <div className="pillar-item">
              <div className="pillar-info">
                <span>Communication & Clarity</span>
                <strong>{careerReadiness.commClarity}%</strong>
              </div>
              <div className="pillar-bar">
                <div className="pillar-fill fill-comm" style={{ width: `${careerReadiness.commClarity}%` }} />
              </div>
            </div>

            <div className="pillar-item">
              <div className="pillar-info">
                <span>Resume Experience Alignment</span>
                <strong>{careerReadiness.resumeAlignment}%</strong>
              </div>
              <div className="pillar-bar">
                <div className="pillar-fill fill-resume" style={{ width: `${careerReadiness.resumeAlignment}%` }} />
              </div>
            </div>

            <div className="pillar-item">
              <div className="pillar-info">
                <span>Consistency & Diligence</span>
                <strong>{careerReadiness.consistency}%</strong>
              </div>
              <div className="pillar-bar">
                <div className="pillar-fill fill-streak" style={{ width: `${careerReadiness.consistency}%` }} />
              </div>
            </div>
          </div>

          <div className="readiness-synthesis-box">
            <span className="synthesis-icon">📋</span>
            <p className="synthesis-text">{careerReadiness.summary}</p>
          </div>
        </div>
      </div>

      {/* ── 4. SEPARATE SCORE CARDS (TECHNICAL, RESUME, QUIZ) ── */}
      <div className="profile-section-title-wrap">
        <h2>Practice Breakdown & Score Cards</h2>
        <p className="text-muted">Separate performance analysis across mock interviews and skill quizzes</p>
      </div>

      <div className="profile-score-cards-grid">
        {/* Card 1: Technical Interview */}
        <div className="profile-section-score-card">
          <div className="section-card-top">
            <div className="section-icon-badge tech-badge">💻</div>
            <div className="section-title-wrap">
              <h3>Technical Interview</h3>
              <span className="section-session-count">{techMetrics.count} sessions completed</span>
            </div>
            <div className="section-main-score">
              {techMetrics.avgScore !== null ? (
                <>
                  <span className="score-num">{techMetrics.avgScore}</span>
                  <span className="score-denom">/100</span>
                </>
              ) : (
                <span className="score-empty">No Data</span>
              )}
            </div>
          </div>

          {techMetrics.count === 0 ? (
            <div className="section-empty-state">
              <p>No technical interview history found.</p>
              <button className="btn-primary-sm" onClick={() => navigate('/interview')}>
                Start Technical Mock
              </button>
            </div>
          ) : (
            <div className="section-card-body">
              <div className="submetrics-row">
                <div className="submetric-item">
                  <span className="submetric-label">Technical</span>
                  <strong className="submetric-val">{techMetrics.avgTech}%</strong>
                </div>
                <div className="submetric-item">
                  <span className="submetric-label">Communication</span>
                  <strong className="submetric-val">{techMetrics.avgComm}%</strong>
                </div>
                <div className="submetric-item">
                  <span className="submetric-label">Confidence</span>
                  <strong className="submetric-val">{techMetrics.avgConf}%</strong>
                </div>
              </div>

              <div className="feedback-section-block">
                <h4 className="strengths-title">Verified Strengths</h4>
                <div className="tags-list">
                  {techMetrics.strengths.length > 0 ? (
                    techMetrics.strengths.map((s, idx) => (
                      <span key={idx} className="tag-badge strength-badge">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-sm">Complete more sessions to identify specific strengths.</span>
                  )}
                </div>
              </div>

              <div className="feedback-section-block">
                <h4 className="improvements-title">Areas to Improve</h4>
                <div className="tags-list">
                  {techMetrics.areas.length > 0 ? (
                    techMetrics.areas.map((a, idx) => (
                      <span key={idx} className="tag-badge improvement-badge">
                        ▲ {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-sm">No critical weaknesses identified. Great job!</span>
                  )}
                </div>
              </div>

              {interviews.length > 0 && (
                <div className="section-history-mini">
                  <div className="history-mini-header">
                    <h4 className="history-mini-title">Session History ({interviews.length})</h4>
                    <span className="text-muted-xs">All N attempts</span>
                  </div>
                  <div className="history-mini-list">
                    {[...interviews].reverse().map((iv, idx) => {
                      const attNum = interviews.length - idx;
                      const dateObj = new Date(iv.date);
                      return (
                        <div
                          key={iv._id || iv.id || idx}
                          className="history-mini-row"
                          onClick={() => setSelectedAttempt({
                            id: iv._id || iv.id || `tech-${iv.date}-${idx}`,
                            type: 'Technical Interview',
                            typeShort: 'Tech',
                            attemptNumber: attNum,
                            topic: iv.topic || 'General Technical',
                            score: typeof iv.overallScore === 'number' ? iv.overallScore : 0,
                            technicalScore: typeof iv.technicalScore === 'number' ? iv.technicalScore : null,
                            communicationScore: typeof iv.communicationScore === 'number' ? iv.communicationScore : null,
                            confidenceScore: typeof iv.confidenceScore === 'number' ? iv.confidenceScore : null,
                            strengths: Array.isArray(iv.strengths) ? iv.strengths : [],
                            areas: Array.isArray(iv.areasForImprovement) ? iv.areasForImprovement : [],
                            coinsEarned: iv.coinsEarned || 0,
                            date: dateObj,
                            color: '#2563eb',
                            icon: '💻',
                            feedback: iv.feedbackSummary,
                            raw: iv
                          })}
                        >
                          <div className="hm-left">
                            <span className="hm-badge">#{attNum}</span>
                            <div>
                              <strong>{iv.topic || 'General Technical'}</strong>
                              <small>{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                            </div>
                          </div>
                          <span className={`score-badge-cell ${iv.overallScore >= 80 ? 'good' : iv.overallScore >= 60 ? 'avg' : 'poor'}`}>
                            {iv.overallScore}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="section-card-footer">
                <button className="btn-outline-sm" onClick={() => navigate('/interview')}>
                  + Practice Technical Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Resume-Based Interview */}
        <div className="profile-section-score-card">
          <div className="section-card-top">
            <div className="section-icon-badge resume-badge">📄</div>
            <div className="section-title-wrap">
              <h3>Resume Interview</h3>
              <span className="section-session-count">{resumeMetrics.count} sessions completed</span>
            </div>
            <div className="section-main-score">
              {resumeMetrics.avgScore !== null ? (
                <>
                  <span className="score-num">{resumeMetrics.avgScore}</span>
                  <span className="score-denom">/100</span>
                </>
              ) : (
                <span className="score-empty">No Data</span>
              )}
            </div>
          </div>

          {resumeMetrics.count === 0 ? (
            <div className="section-empty-state">
              <p>No resume interview history found.</p>
              <button className="btn-primary-sm" onClick={() => navigate('/resume')}>
                Practice Resume Interview
              </button>
            </div>
          ) : (
            <div className="section-card-body">
              <div className="submetrics-row">
                <div className="submetric-item">
                  <span className="submetric-label">Project Rigor</span>
                  <strong className="submetric-val">{resumeMetrics.avgTech}%</strong>
                </div>
                <div className="submetric-item">
                  <span className="submetric-label">Fluency</span>
                  <strong className="submetric-val">{resumeMetrics.avgComm}%</strong>
                </div>
                <div className="submetric-item">
                  <span className="submetric-label">Confidence</span>
                  <strong className="submetric-val">{resumeMetrics.avgConf}%</strong>
                </div>
              </div>

              <div className="feedback-section-block">
                <h4 className="strengths-title">Verified Strengths</h4>
                <div className="tags-list">
                  {resumeMetrics.strengths.length > 0 ? (
                    resumeMetrics.strengths.map((s, idx) => (
                      <span key={idx} className="tag-badge strength-badge">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-sm">Complete resume drills to unlock project strengths.</span>
                  )}
                </div>
              </div>

              <div className="feedback-section-block">
                <h4 className="improvements-title">Areas to Improve</h4>
                <div className="tags-list">
                  {resumeMetrics.areas.length > 0 ? (
                    resumeMetrics.areas.map((a, idx) => (
                      <span key={idx} className="tag-badge improvement-badge">
                        ▲ {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-sm">No weak areas logged. Solid articulation!</span>
                  )}
                </div>
              </div>

              {resumeInterviews.length > 0 && (
                <div className="section-history-mini">
                  <div className="history-mini-header">
                    <h4 className="history-mini-title">Session History ({resumeInterviews.length})</h4>
                    <span className="text-muted-xs">All N attempts</span>
                  </div>
                  <div className="history-mini-list">
                    {[...resumeInterviews].reverse().map((rv, idx) => {
                      const attNum = resumeInterviews.length - idx;
                      const dateObj = new Date(rv.date);
                      return (
                        <div
                          key={rv._id || rv.id || idx}
                          className="history-mini-row"
                          onClick={() => setSelectedAttempt({
                            id: rv._id || rv.id || `res-${rv.date}-${idx}`,
                            type: 'Resume Interview',
                            typeShort: 'Resume',
                            attemptNumber: attNum,
                            topic: rv.category ? `Resume: ${rv.category}` : 'Resume AI',
                            score: typeof rv.overallScore === 'number' ? rv.overallScore : 0,
                            technicalScore: typeof rv.technicalScore === 'number' ? rv.technicalScore : null,
                            communicationScore: typeof rv.communicationScore === 'number' ? rv.communicationScore : null,
                            confidenceScore: typeof rv.confidenceScore === 'number' ? rv.confidenceScore : null,
                            strengths: Array.isArray(rv.strengths) ? rv.strengths : [],
                            areas: Array.isArray(rv.weaknesses) ? rv.weaknesses : [],
                            difficulty: rv.difficulty || '',
                            coinsEarned: rv.coinsEarned || 0,
                            date: dateObj,
                            color: '#7c3aed',
                            icon: '📄',
                            feedback: rv.hiringRecommendation,
                            raw: rv
                          })}
                        >
                          <div className="hm-left">
                            <span className="hm-badge">#{attNum}</span>
                            <div>
                              <strong>{rv.category || 'Resume AI'}</strong>
                              <small>{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                            </div>
                          </div>
                          <span className={`score-badge-cell ${rv.overallScore >= 80 ? 'good' : rv.overallScore >= 60 ? 'avg' : 'poor'}`}>
                            {rv.overallScore}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="section-card-footer">
                <button className="btn-outline-sm" onClick={() => navigate('/resume')}>
                  + Practice Resume Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Quiz Performance */}
        <div className="profile-section-score-card">
          <div className="section-card-top">
            <div className="section-icon-badge quiz-badge">🧠</div>
            <div className="section-title-wrap">
              <h3>Quiz Performance</h3>
              <span className="section-session-count">
                {quizMetrics.totalPassed} of {quizMetrics.totalLevels} questions passed
              </span>
            </div>
            <div className="section-main-score">
              {quizMetrics.score !== null ? (
                <>
                  <span className="score-num">{quizMetrics.score}</span>
                  <span className="score-denom">/100</span>
                </>
              ) : (
                <span className="score-empty">0/100</span>
              )}
            </div>
          </div>

          {quizMetrics.totalPassed === 0 ? (
            <div className="section-empty-state">
              <p>No quiz questions answered yet.</p>
              <button className="btn-primary-sm" onClick={() => setActiveNav('all')}>
                Start Quiz Practice
              </button>
            </div>
          ) : (
            <div className="section-card-body">
              <div className="submetrics-row">
                <div className="submetric-item">
                  <span className="submetric-label">Passed</span>
                  <strong className="submetric-val">{quizMetrics.totalPassed} Qs</strong>
                </div>
                <div className="submetric-item">
                  <span className="submetric-label">Mastered</span>
                  <strong className="submetric-val">{completedSections} Topics</strong>
                </div>
                <div className="submetric-item">
                  <span className="submetric-label">Points</span>
                  <strong className="submetric-val">{totalScore} Pts</strong>
                </div>
              </div>

              <div className="feedback-section-block">
                <h4 className="strengths-title">Mastered Categories</h4>
                <div className="tags-list">
                  {quizMetrics.strengths.length > 0 ? (
                    quizMetrics.strengths.map((s, idx) => (
                      <span key={idx} className="tag-badge strength-badge">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-sm">Complete quiz questions to record masteries.</span>
                  )}
                </div>
              </div>

              <div className="feedback-section-block">
                <h4 className="improvements-title">Categories to Practice</h4>
                <div className="tags-list">
                  {quizMetrics.areas.length > 0 ? (
                    quizMetrics.areas.map((a, idx) => (
                      <span key={idx} className="tag-badge improvement-badge">
                        ▲ {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-sm">All available quiz categories completed!</span>
                  )}
                </div>
              </div>

              <div className="section-card-footer">
                <button className="btn-outline-sm" onClick={() => setActiveNav('all')}>
                  + Solve More Quizzes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. PERFORMANCE-OVER-TIME CHART ── */}
      <div className="profile-chart-section">
        <div className="profile-card profile-card-stable">
          <div className="card-header">
            <div>
              <h3>Performance Over Time</h3>
              <p className="card-subtitle-muted">
                Track your score progression across previous interview attempts
              </p>
            </div>
            {chartData && (
              <div className="chart-legend-wrap">
                <span className="legend-chip">
                  <span className="legend-dot dot-tech" /> Technical Interview
                </span>
                <span className="legend-chip">
                  <span className="legend-dot dot-resume" /> Resume Interview
                </span>
              </div>
            )}
          </div>

          <div className="card-body">
            {!chartData ? (
              <div className="chart-empty-state">
                <div className="empty-chart-icon">📈</div>
                <h4>No Previous Attempts Yet</h4>
                <p className="text-muted">
                  Complete your first Technical or Resume mock interview to generate an interactive score
                  trajectory chart.
                </p>
                <div className="empty-chart-actions">
                  <button className="btn-primary" onClick={() => navigate('/interview')}>
                    Start Technical Interview
                  </button>
                  <button className="btn-secondary" onClick={() => navigate('/resume')}>
                    Start Resume Interview
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Stats Bar above Chart */}
                <div className="chart-stats-summary-row">
                  <div className="chart-stat-item">
                    <span className="cs-label">Highest Score</span>
                    <strong className="cs-value text-green">{chartData.highest}%</strong>
                  </div>
                  <div className="chart-stat-item">
                    <span className="cs-label">Average Score</span>
                    <strong className="cs-value text-blue">{chartData.average}%</strong>
                  </div>
                  <div className="chart-stat-item">
                    <span className="cs-label">Latest Attempt</span>
                    <strong className="cs-value text-purple">{chartData.latest}%</strong>
                  </div>
                  <div className="chart-stat-item">
                    <span className="cs-label">Total Attempts</span>
                    <strong className="cs-value">{chronologicalAttempts.length}</strong>
                  </div>
                </div>

                {/* SVG Line & Scatter Chart */}
                <div className="chart-svg-wrapper">
                  <svg
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                    className="performance-line-svg"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient id="chartScoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines (0%, 25%, 50%, 75%, 100%) */}
                    {[0, 25, 50, 75, 100].map(val => {
                      const y = chartData.padY + (1 - val / 100) * chartData.plotH;
                      return (
                        <g key={val} className="chart-grid-line-group">
                          <line
                            x1={chartData.padX}
                            y1={y}
                            x2={chartData.width - chartData.padX}
                            y2={y}
                            stroke="#e2e8f0"
                            strokeDasharray={val === 0 || val === 100 ? 'none' : '4 4'}
                          />
                          <text
                            x={chartData.padX - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="#94a3b8"
                            fontWeight="600"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient Area under curve */}
                    {chartData.areaPath && (
                      <path d={chartData.areaPath} fill="url(#chartScoreGrad)" />
                    )}

                    {/* Polyline connecting points */}
                    {chartData.polylinePoints && (
                      <polyline
                        points={chartData.polylinePoints}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Scatter Point Nodes */}
                    {chartData.points.map((pt, idx) => (
                      <g
                        key={pt.id || idx}
                        className="chart-node-group"
                        onClick={() => setSelectedAttempt(pt)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={selectedAttempt?.id === pt.id ? 8 : 6}
                          fill={pt.color}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="chart-point-circle"
                        />
                        {/* Score text label */}
                        <text
                          x={pt.x}
                          y={pt.y - 12}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="#1e293b"
                          className="chart-point-label"
                        >
                          {pt.score}%
                        </text>
                        {/* Date label at bottom */}
                        <text
                          x={pt.x}
                          y={chartData.height - 8}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#64748b"
                          fontWeight="600"
                        >
                          {pt.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </text>
                      </g>
                    ))}
                  </svg>
                  {chronologicalAttempts.length === 1 && (
                    <div className="chart-single-attempt-hint">
                      <span>💡 1 session recorded ({chronologicalAttempts[0].score}%). Complete more sessions to view your score trend line.</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. ATTEMPT HISTORY SECTION (DEDICATED FULL-WIDTH CARD) ── */}
      <div className="profile-history-section">
        <div className="profile-card profile-card-stable">
          <div className="card-header">
            <div>
              <div className="title-with-badge">
                <h3>Interview Attempt History</h3>
                <span className="card-header-badge">
                  {chronologicalAttempts.length} {chronologicalAttempts.length === 1 ? 'Session' : 'Sessions'}
                </span>
              </div>
              <p className="card-subtitle-muted">
                Comprehensive record of all Technical and Resume mock interview sessions.
              </p>
            </div>

            {/* Filter tabs */}
            <div className="history-filter-pills">
              <button
                className={`filter-pill ${historyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('all')}
              >
                All ({chronologicalAttempts.length})
              </button>
              <button
                className={`filter-pill ${historyFilter === 'tech' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('tech')}
              >
                💻 Technical ({interviews.length})
              </button>
              <button
                className={`filter-pill ${historyFilter === 'resume' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('resume')}
              >
                📄 Resume ({resumeInterviews.length})
              </button>
            </div>
          </div>

          <div className="card-body">
            {filteredAttempts.length === 0 ? (
              <div className="history-empty-notice">
                <span className="empty-notice-icon">📋</span>
                <p>
                  {historyFilter === 'tech'
                    ? 'No Technical Interview sessions recorded yet. Practice a technical session to see your attempts!'
                    : historyFilter === 'resume'
                    ? 'No Resume Interview sessions recorded yet. Upload your resume and practice AI questions!'
                    : 'No interview sessions recorded yet. Start practicing to see your attempts here!'}
                </p>
                <div style={{ marginTop: '12px' }}>
                  {historyFilter === 'resume' ? (
                    <button className="btn-secondary" onClick={() => navigate('/resume')}>
                      + Practice Resume Interview
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={() => navigate('/interview')}>
                      + Practice Technical Interview
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="iv-history-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Attempt</th>
                      <th style={{ width: '130px' }}>Format</th>
                      <th>Topic / Focus</th>
                      <th style={{ width: '130px' }}>Date</th>
                      <th style={{ width: '190px' }}>Sub-Scores</th>
                      <th style={{ width: '110px' }}>Overall</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredAttempts].reverse().map((att) => {
                      const isSelected = selectedAttempt?.id === att.id;
                      return (
                        <tr
                          key={att.id}
                          className={`history-table-row ${isSelected ? 'row-selected' : ''}`}
                          onClick={() => setSelectedAttempt(att)}
                        >
                          <td>
                            <span className="attempt-index-badge">
                              #{att.attemptNumber || att.overallAttemptNumber}
                            </span>
                          </td>
                          <td>
                            <span
                              className="tag-badge"
                              style={{
                                background: att.typeShort === 'Tech' ? '#eff6ff' : '#f5f3ff',
                                color: att.color,
                                fontWeight: '700'
                              }}
                            >
                              {att.icon} {att.typeShort}
                            </span>
                          </td>
                          <td>
                            <strong className="history-topic-title">{att.topic}</strong>
                          </td>
                          <td>
                            <span className="history-date-text">
                              {att.date.toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td>
                            <div className="history-subscores-mini">
                              {att.technicalScore !== null && (
                                <span className="subscore-pill" title="Technical Score">
                                  Tech: {att.technicalScore}%
                                </span>
                              )}
                              {att.communicationScore !== null && (
                                <span className="subscore-pill" title="Communication Score">
                                  Comm: {att.communicationScore}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`score-badge-cell ${
                                att.score >= 80 ? 'good' : att.score >= 60 ? 'avg' : 'poor'
                              }`}
                            >
                              {att.score}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-inspect-attempt"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAttempt(att);
                              }}
                            >
                              View Details 👁
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 7. ATTEMPT INSPECTION MODAL ── */}
      {selectedAttempt && (
        <div className="attempt-modal-overlay" onClick={() => setSelectedAttempt(null)}>
          <div className="attempt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="attempt-modal-header">
              <div className="am-header-left">
                <span className="callout-type-badge" style={{ background: selectedAttempt.color }}>
                  {selectedAttempt.icon} {selectedAttempt.type} #{selectedAttempt.attemptNumber || selectedAttempt.overallAttemptNumber}
                </span>
                <h3 className="am-topic">{selectedAttempt.topic}</h3>
                <span className="am-date">
                  {selectedAttempt.date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="am-header-right">
                <div className={`am-score-badge ${selectedAttempt.score >= 80 ? 'good' : selectedAttempt.score >= 60 ? 'avg' : 'poor'}`}>
                  <span className="am-score-num">{selectedAttempt.score}%</span>
                  <span className="am-score-lbl">Overall Score</span>
                </div>
                <button className="am-close-btn" onClick={() => setSelectedAttempt(null)} title="Close Details">
                  ✕
                </button>
              </div>
            </div>

            <div className="attempt-modal-body">
              {/* Submetrics row */}
              {(selectedAttempt.technicalScore !== null || selectedAttempt.communicationScore !== null || selectedAttempt.coinsEarned > 0) && (
                <div className="am-submetrics-grid">
                  {selectedAttempt.technicalScore !== null && (
                    <div className="am-sub-card">
                      <span className="am-sub-title">Technical Depth</span>
                      <strong className="am-sub-val text-blue">{selectedAttempt.technicalScore}%</strong>
                    </div>
                  )}
                  {selectedAttempt.communicationScore !== null && (
                    <div className="am-sub-card">
                      <span className="am-sub-title">Communication</span>
                      <strong className="am-sub-val text-purple">{selectedAttempt.communicationScore}%</strong>
                    </div>
                  )}
                  {selectedAttempt.confidenceScore !== null && (
                    <div className="am-sub-card">
                      <span className="am-sub-title">Confidence</span>
                      <strong className="am-sub-val text-green">{selectedAttempt.confidenceScore}%</strong>
                    </div>
                  )}
                  {selectedAttempt.coinsEarned > 0 && (
                    <div className="am-sub-card">
                      <span className="am-sub-title">Reward Earned</span>
                      <strong className="am-sub-val text-amber">🪙 +{selectedAttempt.coinsEarned} Coins</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Strengths & Focus Areas */}
              <div className="am-feedback-grid">
                <div className="am-feedback-col">
                  <h4 className="am-col-title text-green">Strengths Identified</h4>
                  {selectedAttempt.strengths?.length > 0 ? (
                    <div className="am-chips-wrap">
                      {selectedAttempt.strengths.map((s, idx) => (
                        <div key={idx} className="am-chip am-chip-strength">✓ {s}</div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-sm">Solid conceptual effort demonstrated across questions.</p>
                  )}
                </div>

                <div className="am-feedback-col">
                  <h4 className="am-col-title text-amber">Areas for Improvement</h4>
                  {selectedAttempt.areas?.length > 0 ? (
                    <div className="am-chips-wrap">
                      {selectedAttempt.areas.map((a, idx) => (
                        <div key={idx} className="am-chip am-chip-area">▲ {a}</div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-sm">No critical weaknesses identified. Great execution!</p>
                  )}
                </div>
              </div>

              {/* AI Evaluation feedback */}
              {selectedAttempt.feedback && (
                <div className="am-feedback-quote-block">
                  <h4 className="am-quote-title">AI Evaluator Feedback</h4>
                  <p className="am-quote-text">"{selectedAttempt.feedback}"</p>
                </div>
              )}
            </div>

            <div className="attempt-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedAttempt(null)}>
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const path = selectedAttempt.typeShort === 'Tech' ? '/interview' : '/resume';
                  setSelectedAttempt(null);
                  navigate(path);
                }}
              >
                Practice Another {selectedAttempt.typeShort === 'Tech' ? 'Technical' : 'Resume'} Session →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. PERSONALIZED IMPROVEMENT PLAN ── */}
      <div className="profile-improvement-plan-section">
        <div className="profile-card profile-card-stable">
          <div className="card-header">
            <div>
              <h3>Personalized Improvement Plan</h3>
              <p className="card-subtitle-muted">
                Targeted recommendations algorithmically generated from your weak skills and test results
              </p>
            </div>
            <span className="card-header-badge">Custom Roadmap</span>
          </div>

          <div className="card-body">
            <div className="improvement-plan-grid">
              {improvementPlan.map(item => (
                <div key={item.id} className="plan-item-card">
                  <div className="plan-item-header">
                    <span className="plan-domain-badge">
                      {item.icon} {item.domain}
                    </span>
                    <span className={`plan-priority-badge ${item.priorityBadge}`}>{item.priority}</span>
                  </div>
                  <h4 className="plan-item-title">{item.title}</h4>
                  <p className="plan-item-action">{item.action}</p>
                  <div className="plan-item-footer">
                    <button className="btn-primary-sm" onClick={item.actionFn}>
                      {item.ctaText} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. ACHIEVEMENTS & MILESTONES ── */}
      <div className="profile-achievements-section">
        <div className="profile-card profile-card-stable">
          <div className="card-header">
            <div>
              <h3>Achievements & Milestones</h3>
              <p className="card-subtitle-muted">
                Badges unlocked through practice consistency and high mock performance
              </p>
            </div>
            <span className="card-header-badge">
              {achievements.filter(a => a.unlocked).length} of {achievements.length} Unlocked
            </span>
          </div>

          <div className="card-body">
            <div className="achievements-showcase-grid">
              {achievements.map(ach => (
                <div
                  key={ach.id}
                  className={`achievement-card-box ${ach.unlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="ach-icon-wrap">{ach.icon}</div>
                  <div className="ach-content-wrap">
                    <div className="ach-title-row">
                      <h4>{ach.title}</h4>
                      <span className={`ach-status-pill ${ach.unlocked ? 'status-unlocked' : 'status-locked'}`}>
                        {ach.unlocked ? 'Unlocked' : 'In Progress'}
                      </span>
                    </div>
                    <p className="ach-desc">{ach.desc}</p>
                    <div className="ach-progress-sub">{ach.progressText}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
