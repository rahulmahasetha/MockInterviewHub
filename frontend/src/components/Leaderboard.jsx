import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";
import { quizAPI, resumeAPI, interviewAPI } from "../services/api";
import { FaTrophy, FaRobot } from "react-icons/fa";
import { FiBarChart2, FiBookOpen, FiFileText } from "react-icons/fi";

const TOPIC_CONFIG = {
  science: { abbr: "JV", name: "Java", bg: "#EA580C" },
  java: { abbr: "JV", name: "Java", bg: "#EA580C" },
  jungle: { abbr: "C", name: "C", bg: "#16A34A" },
  c: { abbr: "C", name: "C", bg: "#16A34A" },
  math: { abbr: "C++", name: "C++", bg: "#6366F1" },
  "c++": { abbr: "C++", name: "C++", bg: "#6366F1" },
  history: { abbr: "PY", name: "Python", bg: "#D97706" },
  python: { abbr: "PY", name: "Python", bg: "#D97706" },
  html: { abbr: "H", name: "HTML", bg: "#F97316" },
  css: { abbr: "CSS", name: "CSS", bg: "#0284C7" },
  react: { abbr: "RX", name: "React", bg: "#0D9488" },
  nodejs: { abbr: "JS", name: "Node.js", bg: "#15803D" },
  node: { abbr: "JS", name: "Node.js", bg: "#15803D" },
  dsa: { abbr: "DSA", name: "DSA", bg: "#4F46E5" }
};

function formatLastActive(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formattedDate = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const formattedTime = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${formattedDate}, ${formattedTime}`;
  } catch (e) {
    return dateStr;
  }
}

export default function Leaderboard() {
  const {
    progress,
    globalLeaderboard,
    fetchGlobalLeaderboard,
    saveToLeaderboard,
    getTotalScore,
    getCategoryProgress,
    requireAuth
  } = useUserProgress();

  const [sections, setSections] = useState([]);
  const [technicalInterviewHistory, setTechnicalInterviewHistory] = useState([]);
  const [resumeHistory, setResumeHistory] = useState([]);
  const [topicFilter, setTopicFilter] = useState("all"); // 'all', 'started', 'not_started'
  const [viewAllRankings, setViewAllRankings] = useState(false);
  const [sliderProgress, setSliderProgress] = useState(0);

  const topicsTrackRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGlobalLeaderboard();

    async function loadCategories() {
      try {
        const response = await quizAPI.getCategories();
        setSections(response.data || []);
      } catch (error) {
        setSections([]);
      }
    }
    loadCategories();

    if (progress.userId) {
      interviewAPI.getHistory(progress.userId)
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.results)) {
            setTechnicalInterviewHistory(res.data.results);
          }
        })
        .catch(() => setTechnicalInterviewHistory([]));

      resumeAPI.getHistory(progress.userId)
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.results)) {
            setResumeHistory(res.data.results);
          }
        })
        .catch(() => setResumeHistory([]));
    }
  }, [fetchGlobalLeaderboard, progress.userId]);

  const totalScore = getTotalScore();
  const maxScore = useMemo(() => {
    const calculated = sections.reduce(
      (total, section) => total + ((section.levels?.length || 10) * 20),
      0
    );
    return calculated > 0 ? calculated : 1800;
  }, [sections]);

  const completedSections = useMemo(() => {
    return sections.filter(sec => (getCategoryProgress(sec.slug).passed?.length || 0) > 0).length;
  }, [sections, getCategoryProgress]);

  // Quiz Leaderboard & User Position
  const quizLeaderboard = useMemo(() => {
    const filtered = (globalLeaderboard || []).filter(e => e.type !== "interview");
    return [...filtered].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [globalLeaderboard]);

  const userRankIndex = useMemo(() => {
    if (!progress.username) return -1;
    return quizLeaderboard.findIndex(
      e => e.name && e.name.toLowerCase() === progress.username.toLowerCase()
    );
  }, [quizLeaderboard, progress.username]);

  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : quizLeaderboard.length + 1;
  const totalRankUsers = Math.max(userRank, quizLeaderboard.length, 5);
  const quizScorePercent = Math.min(100, Math.round((totalScore / Math.max(1, maxScore)) * 100));

  // Final score performance calculation (matches quizzes + technical & resume interviews)
  const finalScorePct = useMemo(() => {
    const allInterviewScores = [
      ...technicalInterviewHistory.map(r => Number(r.overallScore || r.score || 0)),
      ...resumeHistory.map(r => Number(r.overallScore || r.score || 0))
    ].filter(s => s > 0);

    const avgInterview = allInterviewScores.length > 0
      ? Math.round(allInterviewScores.reduce((a, b) => a + b, 0) / allInterviewScores.length)
      : 0;

    if (avgInterview > 0 && totalScore > 0) {
      const quizEfficiency = Math.min(100, Math.round((totalScore / (Math.max(1, completedSections) * 200)) * 100));
      return Math.round(quizEfficiency * 0.4 + avgInterview * 0.6);
    }
    if (avgInterview > 0) return avgInterview;
    if (totalScore > 0) {
      const quizEfficiency = Math.min(100, Math.round((totalScore / (Math.max(1, completedSections) * 200)) * 100));
      return Math.max(quizScorePercent, quizEfficiency);
    }
    return 0;
  }, [technicalInterviewHistory, resumeHistory, totalScore, completedSections, quizScorePercent]);

  // Filtered topics for slider
  const displayedSections = useMemo(() => {
    if (topicFilter === "started") {
      return sections.filter(sec => {
        const cp = getCategoryProgress(sec.slug);
        return (cp.passed?.length || 0) > 0 || (cp.score || 0) > 0;
      });
    }
    if (topicFilter === "not_started") {
      return sections.filter(sec => {
        const cp = getCategoryProgress(sec.slug);
        return (cp.passed?.length || 0) === 0 && (cp.score || 0) === 0;
      });
    }
    return sections;
  }, [sections, topicFilter, getCategoryProgress]);

  // Scroll tracking for explore slider
  const handleSliderScroll = () => {
    if (!topicsTrackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = topicsTrackRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setSliderProgress(0);
    } else {
      setSliderProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    }
  };

  const scrollSlider = (direction) => {
    if (!topicsTrackRef.current) return;
    const delta = direction === "left" ? -240 : 240;
    topicsTrackRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Display rankings (top 5 or all)
  const displayedRankings = useMemo(() => {
    if (viewAllRankings) return quizLeaderboard;
    return quizLeaderboard.slice(0, 5);
  }, [quizLeaderboard, viewAllRankings]);

  return (
    <div className="lb-modern-page">
      {/* Top Navigation & Centered Page Header */}
      <header className="lb-modern-header">
        <div className="lb-header-container">
          <button onClick={() => navigate("/")} className="lb-modern-back-btn">
            ← Back to home
          </button>
          <div className="lb-modern-title-block">
            <h1 className="lb-modern-heading">Learning leaderboard</h1>
            <p className="lb-modern-sub">Your scores, quest progress and global rank</p>
          </div>
          <div className="lb-header-spacer" />
        </div>
      </header>

      <main className="lb-modern-main">
        {/* TOP ROW: Quiz Score & Final Score Cards */}
        <section className="lb-top-metric-grid">
          {/* Quiz Score Card */}
          <div className="lb-card lb-quiz-score-card">
            <div className="lb-card-top-header">
              <div className="lb-trophy-badge">
                <FaTrophy style={{ color: '#D97706', fontSize: '1.25rem' }} />
              </div>
              <div className="lb-metric-title-group">
                <span className="lb-metric-label">
                  Quiz Score <span className="lb-info-icon" title="Points accumulated from quiz levels">ⓘ</span>
                </span>
                <div className="lb-metric-score-display">
                  <span className="lb-score-current">{totalScore.toLocaleString()}</span>
                  <span className="lb-score-max">/ {maxScore.toLocaleString()} pts</span>
                </div>
              </div>
            </div>

            <div className="lb-metric-progress-track">
              <div
                className="lb-metric-progress-fill"
                style={{ width: `${quizScorePercent}%` }}
              />
            </div>

            <div className="lb-metric-footer-row">
              <span className="lb-footer-percent">{quizScorePercent}% of the way there</span>
              <span className="lb-footer-rank">Rank {userRank} of {totalRankUsers}</span>
            </div>
          </div>

          {/* Final Score Card */}
          <div className="lb-card lb-final-score-card">
            <div className="lb-podium-graphic-wrap">
              <svg width="124" height="102" viewBox="0 0 140 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Sparkles */}
                <path d="M25 24L27 18L29 24L35 26L29 28L27 34L25 28L19 26L25 24Z" fill="#F59E0B" />
                <path d="M115 36L116.5 31.5L121 30L116.5 28.5L115 24L113.5 28.5L109 30L113.5 31.5L115 36Z" fill="#FBBF24" />
                <path d="M80 14L81 10L82 14L86 15L82 16L81 20L80 16L76 15L80 14Z" fill="#F59E0B" />

                {/* Laurel Wreath */}
                <path d="M38 72C34 60 38 42 48 30" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M42 34C40 32 36 34 36 37C36 40 40 40 42 38" fill="#F59E0B" />
                <path d="M37 46C34 45 32 48 33 51C34 54 38 53 38 50" fill="#F59E0B" />
                <path d="M35 58C32 58 31 62 33 65C35 67 38 65 37 62" fill="#F59E0B" />

                <path d="M102 72C106 60 102 42 92 30" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M98 34C100 32 104 34 104 37C104 40 100 40 98 38" fill="#F59E0B" />
                <path d="M103 46C106 45 108 48 107 51C106 54 102 53 102 50" fill="#F59E0B" />
                <path d="M105 58C108 58 109 62 107 65C105 67 102 65 103 62" fill="#F59E0B" />

                {/* Crown */}
                <path d="M52 48L57 28L70 40L83 28L88 48H52Z" fill="url(#lbCrownGrad)" />
                <circle cx="57" cy="27" r="2.5" fill="#FDE047" />
                <circle cx="70" cy="38" r="2.5" fill="#FDE047" />
                <circle cx="83" cy="27" r="2.5" fill="#FDE047" />
                <rect x="52" y="48" width="36" height="5" rx="1.5" fill="#D97706" />

                {/* 3-Tier Podium */}
                <path d="M40 90C40 85 45 82 70 82C95 82 100 85 100 90V98C100 103 95 106 70 106C45 106 40 103 40 98V90Z" fill="url(#lbPodiumBase)" />
                <ellipse cx="70" cy="85" rx="30" ry="6" fill="#FDE047" />

                <path d="M46 75C46 71 50 68 70 68C90 68 94 71 94 75V84C94 88 90 91 70 91C50 91 46 88 46 84V75Z" fill="url(#lbPodiumMid)" />
                <ellipse cx="70" cy="74" rx="24" ry="5" fill="#FEF08A" />

                <path d="M52 62C52 59 55 57 70 57C85 57 88 59 88 62V71C88 74 85 76 70 76C55 76 52 74 52 71V62Z" fill="url(#lbPodiumTop)" />
                <ellipse cx="70" cy="62" rx="18" ry="4" fill="#FEF9C3" />

                <defs>
                  <linearGradient id="lbCrownGrad" x1="52" y1="28" x2="88" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FBBF24" />
                    <stop offset="1" stopColor="#D97706" />
                  </linearGradient>
                  <linearGradient id="lbPodiumTop" x1="52" y1="57" x2="88" y2="76" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FACC15" />
                    <stop offset="1" stopColor="#EAB308" />
                  </linearGradient>
                  <linearGradient id="lbPodiumMid" x1="46" y1="68" x2="94" y2="91" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#EAB308" />
                    <stop offset="1" stopColor="#CA8A04" />
                  </linearGradient>
                  <linearGradient id="lbPodiumBase" x1="40" y1="82" x2="100" y2="106" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#CA8A04" />
                    <stop offset="1" stopColor="#A16207" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="lb-final-score-center">
              <div className="lb-final-label">
                Final Score <span className="lb-info-icon" title="Overall blended performance">ⓘ</span>
              </div>
              <div className="lb-final-score-num">{finalScorePct > 0 ? `${finalScorePct}%` : "0%"}</div>
              <p className="lb-final-score-desc">
                Overall performance across quizzes and interviews
              </p>
            </div>

            {/* Subtle Ambient Wave Graphic */}
            <svg className="lb-gold-waves" width="180" height="110" viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 95C30 90 60 110 95 75C130 40 145 15 180 20" stroke="#FDE68A" strokeWidth="2.5" fill="none" opacity="0.8" />
              <path d="M15 105C45 95 75 80 110 85C145 90 160 55 180 35" stroke="#FBBF24" strokeWidth="1.8" fill="none" opacity="0.6" />
              <path d="M30 110C65 105 100 88 135 70C160 58 170 45 180 50" stroke="#F59E0B" strokeWidth="1.2" fill="none" opacity="0.4" />
            </svg>
          </div>
        </section>

        {/* MIDDLE ROW: Global Rankings & Explore Topics */}
        <section className="lb-mid-metric-grid">
          {/* Global rankings Card */}
          <div className="lb-card lb-rankings-box">
            <div className="lb-box-header">
              <div className="lb-box-title-row">
                <div className="lb-icon-box lb-purple-icon-box"><FiBarChart2 /></div>
                <h2 className="lb-box-title">Global rankings</h2>
              </div>
              <button
                className="lb-view-all-pill"
                onClick={() => setViewAllRankings(prev => !prev)}
              >
                {viewAllRankings ? "Show top 5 ↑" : "View all →"}
              </button>
            </div>

            <div className="lb-table-responsive">
              <table className="lb-modern-table">
                <thead>
                  <tr>
                    <th style={{ width: "65px" }}>Rank</th>
                    <th>Name</th>
                    <th style={{ width: "95px" }}>Points</th>
                    <th style={{ width: "175px" }}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRankings.map((entry, index) => {
                    const isMe =
                      progress.username &&
                      entry.name &&
                      entry.name.toLowerCase() === progress.username.toLowerCase();
                    const rank = index + 1;

                    return (
                      <tr key={entry.id || `${entry.name}-${index}`} className={isMe ? "lb-highlight-user-row" : ""}>
                        <td>
                          <span
                            className={`lb-rank-badge ${
                              rank === 1
                                ? "rank-1"
                                : rank === 2
                                ? "rank-2"
                                : rank === 3
                                ? "rank-3"
                                : "rank-default"
                            }`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td>
                          <div className="lb-candidate-name-cell">
                            <span className="lb-user-name-text">{entry.name}</span>
                            {isMe && <span className="lb-you-pill-badge">YOU</span>}
                          </div>
                        </td>
                        <td>
                          <strong className="lb-points-bold">{entry.score}</strong>
                        </td>
                        <td className="lb-date-cell">
                          {formatLastActive(entry.date)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* If user is not in top rankings, show user's persistent position */}
                  {!viewAllRankings &&
                    progress.username &&
                    !displayedRankings.some(
                      e => e.name && e.name.toLowerCase() === progress.username.toLowerCase()
                    ) && (
                      <tr className="lb-highlight-user-row">
                        <td>
                          <span className="lb-rank-badge rank-default">
                            {userRank}
                          </span>
                        </td>
                        <td>
                          <div className="lb-candidate-name-cell">
                            <span className="lb-user-name-text">{progress.username}</span>
                            <span className="lb-you-pill-badge">YOU</span>
                          </div>
                        </td>
                        <td>
                          <strong className="lb-points-bold">{totalScore}</strong>
                        </td>
                        <td className="lb-date-cell">Just now</td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explore Topics Card */}
          <div className="lb-card lb-topics-box">
            <div className="lb-box-header">
              <div className="lb-box-title-row">
                <div className="lb-icon-box lb-purple-icon-box"><FiBookOpen /></div>
                <div>
                  <h2 className="lb-box-title">Explore Topics</h2>
                  <p className="lb-box-subtitle">Select a topic to start a quiz</p>
                </div>
              </div>

              <div className="lb-topics-controls">
                <div className="lb-filter-pills-group">
                  <button
                    className={`lb-filter-pill ${topicFilter === "started" ? "active" : ""}`}
                    onClick={() => setTopicFilter(prev => (prev === "started" ? "all" : "started"))}
                  >
                    Started
                  </button>
                  <button
                    className={`lb-filter-pill ${topicFilter === "not_started" ? "active" : ""}`}
                    onClick={() => setTopicFilter(prev => (prev === "not_started" ? "all" : "not_started"))}
                  >
                    Not started
                  </button>
                </div>

                <div className="lb-arrow-buttons-group">
                  <button
                    className="lb-round-arrow-btn"
                    onClick={() => scrollSlider("left")}
                    aria-label="Previous topics"
                  >
                    ‹
                  </button>
                  <button
                    className="lb-round-arrow-btn"
                    onClick={() => scrollSlider("right")}
                    aria-label="Next topics"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            {/* Slider track with floating left arrow */}
            <div className="lb-slider-wrapper">
              <button
                className="lb-slider-float-arrow"
                onClick={() => scrollSlider("left")}
                aria-label="Scroll left"
              >
                ‹
              </button>

              <div
                className="lb-topics-carousel"
                ref={topicsTrackRef}
                onScroll={handleSliderScroll}
              >
                {displayedSections.map(sec => {
                  const cfg = TOPIC_CONFIG[sec.slug] || {
                    abbr: sec.label || sec.name.slice(0, 2).toUpperCase(),
                    name: sec.name.replace(" Programming Quiz", "").replace(" Quiz", ""),
                    bg: sec.iconColor || "#3B82F6"
                  };
                  const cp = getCategoryProgress(sec.slug);
                  const done = cp.passed?.length || 0;
                  const total = sec.levels?.length || 10;
                  const score = cp.score || 0;
                  const isCompleted = done === total && total > 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <div
                      key={sec.slug}
                      className="lb-topic-card"
                      onClick={() => {
                        requireAuth(`/playground/${sec.slug}`, () => navigate(`/playground/${sec.slug}`), {
                          title: 'Sign in to Start Quiz',
                          subtitle: `Sign in or create an account to start the ${cfg.name} quiz challenge.`
                        });
                      }}
                      title={`Open ${cfg.name} Quiz`}
                      role="button"
                      tabIndex={0}
                    >
                      <div
                        className="lb-topic-abbr-badge"
                        style={{ backgroundColor: cfg.bg }}
                      >
                        {cfg.abbr}
                      </div>

                      <div className="lb-topic-card-name">{cfg.name}</div>

                      <div
                        className="lb-topic-card-pts"
                        style={{ color: score > 0 ? (cfg.bg || "#EA580C") : "#64748B" }}
                      >
                        {score} pts
                      </div>

                      <div className="lb-topic-card-levels">
                        {done}/{total} levels
                      </div>

                      {/* Mini Progress / Status */}
                      <div className="lb-topic-mini-track">
                        <div
                          className="lb-topic-mini-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cfg.bg || "#2563EB"
                          }}
                        />
                      </div>

                      {isCompleted && (
                        <div className="lb-topic-status-tag completed">
                          Completed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Slider Progress Indicator */}
            <div className="lb-slider-progress-track">
              <div
                className="lb-slider-progress-pill"
                style={{
                  left: `${sliderProgress * 0.7}%`
                }}
              />
            </div>
          </div>
        </section>

        {/* BOTTOM ROW: My Technical Interview History & My Resume Interview History */}
        <section className="lb-bottom-metric-grid">
          {/* My Technical Interview History Card */}
          <div className="lb-card lb-history-box">
            <div className="lb-box-header">
              <div className="lb-box-title-row">
                <div className="lb-icon-box lb-purple-icon-box"><FaRobot /></div>
                <div>
                  <h2 className="lb-box-title">My Technical Interview History</h2>
                  <p className="lb-box-subtitle">Your technical interview attempts and scores</p>
                </div>
              </div>
            </div>

            <div className="lb-table-responsive">
              <table className="lb-modern-table">
                <thead>
                  <tr>
                    <th style={{ width: "65px" }}>Rank</th>
                    <th>Candidate</th>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {technicalInterviewHistory.length > 0 ? (
                    technicalInterviewHistory.map((item, idx) => (
                      <tr key={item._id || item.id || idx}>
                        <td>
                          <span className="lb-rank-badge rank-default">{idx + 1}</span>
                        </td>
                        <td>{item.candidateName || progress.username || "Candidate"}</td>
                        <td>
                          <span className="lb-table-topic-pill">{item.topic || "Technical"}</span>
                        </td>
                        <td>
                          <strong className="lb-points-bold">{item.overallScore || item.score || 0}%</strong>
                        </td>
                        <td className="lb-date-cell">{formatLastActive(item.date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="lb-empty-table-cell">
                        <div className="lb-empty-state-content">
                          <div className="lb-empty-doc-icon">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                          </div>
                          <h4>No technical interviews taken yet.</h4>
                          <p>Complete a technical mock interview to see your results here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* My Resume Interview History Card */}
          <div className="lb-card lb-history-box">
            <div className="lb-box-header">
              <div className="lb-box-title-row">
                <div className="lb-icon-box lb-purple-icon-box"><FiFileText /></div>
                <div>
                  <h2 className="lb-box-title">My Resume Interview History</h2>
                  <p className="lb-box-subtitle">Your resume interview attempts and scores</p>
                </div>
              </div>
            </div>

            <div className="lb-table-responsive">
              <table className="lb-modern-table">
                <thead>
                  <tr>
                    <th style={{ width: "65px" }}>Rank</th>
                    <th>Candidate</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {resumeHistory.length > 0 ? (
                    resumeHistory.map((item, idx) => (
                      <tr key={item._id || item.id || idx}>
                        <td>
                          <span className="lb-rank-badge rank-default">{idx + 1}</span>
                        </td>
                        <td>{item.candidateName || progress.username || "Candidate"}</td>
                        <td>
                          <strong className="lb-points-bold">{item.overallScore || item.score || 0}%</strong>
                        </td>
                        <td className="lb-date-cell">{formatLastActive(item.date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="lb-empty-table-cell">
                        <div className="lb-empty-state-content">
                          <div className="lb-empty-doc-icon">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <polyline points="10 9 9 9 8 9" />
                            </svg>
                          </div>
                          <h4>No resume interview history found.</h4>
                          <p>Complete a resume interview to see your results here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const modernStyles = `
/* Learning Leaderboard Styles */

.lb-modern-page {
  min-height: 100vh;
  background-color: #F8FAFD;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #0F172A;
  padding: 24px 28px 60px;
}

/* TOP HEADER */
.lb-modern-header {
  max-width: 1360px;
  margin: 0 auto 24px;
}

.lb-header-container {
  display: grid;
  grid-template-columns: 160px 1fr 160px;
  align-items: center;
}

.lb-modern-back-btn {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #1E293B;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: all 0.15s ease;
  justify-self: start;
}

.lb-modern-back-btn:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}

.lb-modern-title-block {
  text-align: center;
}

.lb-modern-heading {
  margin: 0;
  font-size: 2.15rem;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.lb-modern-sub {
  margin: 5px 0 0;
  font-size: 0.95rem;
  color: #64748B;
  font-weight: 500;
}

.lb-header-spacer {
  visibility: hidden;
}

/* MAIN LAYOUT */
.lb-modern-main {
  max-width: 1360px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* CARDS COMMON */
.lb-card {
  background: #FFFFFF;
  border: 1px solid #EEF2F6;
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 4px 18px -2px rgba(15, 23, 42, 0.04);
  position: relative;
  overflow: hidden;
}

/* 1. Top Metric Grid */
.lb-top-metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Quiz Score Card */
.lb-quiz-score-card {
  border-left: 4.5px solid #2563EB;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.lb-card-top-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}

.lb-trophy-badge {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  border: 1px solid #BFDBFE;
  display: grid;
  place-items: center;
  font-size: 1.55rem;
  flex-shrink: 0;
}

.lb-metric-title-group {
  display: flex;
  flex-direction: column;
}

.lb-metric-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0F172A;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lb-info-icon {
  font-size: 0.82rem;
  color: #94A3B8;
  cursor: help;
  font-weight: 500;
}

.lb-metric-score-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
}

.lb-score-current {
  font-size: 2.35rem;
  font-weight: 800;
  color: #0F172A;
  line-height: 1;
  letter-spacing: -0.03em;
}

.lb-score-max {
  font-size: 1.1rem;
  font-weight: 600;
  color: #64748B;
}

.lb-metric-progress-track {
  height: 9px;
  background: #E2E8F0;
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 12px;
}

.lb-metric-progress-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #2563EB, #3B82F6);
  transition: width 0.4s ease;
}

.lb-metric-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.lb-footer-percent {
  color: #64748B;
  font-weight: 500;
}

.lb-footer-rank {
  color: #334155;
  font-weight: 700;
}

/* Final Score Card */
.lb-final-score-card {
  background: linear-gradient(135deg, #FFFDF8 0%, #FFFBEA 45%, #FEF3C7 100%);
  border-color: #FDE68A;
  display: flex;
  align-items: center;
  padding: 16px 24px;
  position: relative;
}

.lb-podium-graphic-wrap {
  flex-shrink: 0;
  margin-right: 14px;
  z-index: 2;
}

.lb-final-score-center {
  flex: 1;
  z-index: 2;
}

.lb-final-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0F172A;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lb-final-score-num {
  font-size: 2.7rem;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin: 2px 0 4px;
}

.lb-final-score-desc {
  margin: 0;
  font-size: 0.84rem;
  color: #64748B;
  line-height: 1.35;
  max-width: 260px;
}

.lb-gold-waves {
  position: absolute;
  right: -5px;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

/* 2. Middle Row */
.lb-mid-metric-grid {
  display: grid;
  grid-template-columns: 46% 54%;
  gap: 20px;
  align-items: stretch;
}

.lb-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.lb-box-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lb-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}

.lb-purple-icon-box {
  background: #F5F3FF;
  border: 1px solid #EDE9FE;
  color: #7C3AED;
}

.lb-box-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.01em;
}

.lb-box-subtitle {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: #64748B;
}

.lb-view-all-pill {
  background: #EFF6FF;
  border: 1px solid #DBEAFE;
  color: #2563EB;
  border-radius: 99px;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lb-view-all-pill:hover {
  background: #DBEAFE;
}

/* Modern Tables */
.lb-table-responsive {
  overflow-x: auto;
}

.lb-modern-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.lb-modern-table th {
  background: #F8FAFC;
  padding: 10px 14px;
  text-align: left;
  font-size: 0.76rem;
  font-weight: 700;
  color: #64748B;
  border-top: 1px solid #EDF2F7;
  border-bottom: 1px solid #EDF2F7;
}

.lb-modern-table th:first-child {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  border-left: 1px solid #EDF2F7;
}

.lb-modern-table th:last-child {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  border-right: 1px solid #EDF2F7;
}

.lb-modern-table td {
  padding: 12px 14px;
  font-size: 0.88rem;
  color: #1E293B;
  border-bottom: 1px solid #F1F5F9;
  vertical-align: middle;
}

.lb-modern-table tbody tr:last-child td {
  border-bottom: none;
}

/* Rank Circle Badges */
.lb-rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 0.82rem;
  font-weight: 800;
}

.lb-rank-badge.rank-1 {
  background: #FEF08A;
  color: #854D0E;
}

.lb-rank-badge.rank-2 {
  background: #E2E8F0;
  color: #475569;
}

.lb-rank-badge.rank-3 {
  background: #FED7AA;
  color: #9A3412;
}

.lb-rank-badge.rank-default {
  background: #F1F5F9;
  color: #64748B;
}

.lb-candidate-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lb-user-name-text {
  font-weight: 700;
  color: #0F172A;
}

.lb-you-pill-badge {
  background: #6366F1;
  color: #FFFFFF;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 0.04em;
}

.lb-highlight-user-row {
  background-color: #F5F3FF;
}

.lb-points-bold {
  font-size: 0.92rem;
  font-weight: 800;
  color: #0F172A;
}

.lb-date-cell {
  font-size: 0.78rem;
  color: #64748B;
  white-space: nowrap;
}

/* Explore Topics Controls & Carousel */
.lb-topics-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lb-filter-pills-group {
  display: flex;
  gap: 6px;
}

.lb-filter-pill {
  padding: 5px 12px;
  border-radius: 99px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #E2E8F0;
  background: #FFFFFF;
  color: #475569;
  transition: all 0.15s ease;
}

.lb-filter-pill:hover {
  background: #F8FAFC;
}

.lb-filter-pill.active {
  background: #1E293B;
  color: #FFFFFF;
  border-color: #1E293B;
}

.lb-arrow-buttons-group {
  display: flex;
  gap: 6px;
}

.lb-round-arrow-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  color: #475569;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  transition: all 0.15s;
}

.lb-round-arrow-btn:hover {
  background: #E2E8F0;
  color: #0F172A;
}

.lb-slider-wrapper {
  position: relative;
  margin-top: 4px;
}

.lb-slider-float-arrow {
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  color: #64748B;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 10;
  font-size: 1rem;
}

.lb-topics-carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 4px 2px 14px;
  scrollbar-width: none;
}

.lb-topics-carousel::-webkit-scrollbar {
  display: none;
}

.lb-topic-card {
  min-width: 90px;
  max-width: 96px;
  flex: 0 0 92px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 14px 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.lb-topic-card:hover {
  transform: translateY(-2px);
  border-color: #CBD5E1;
  box-shadow: 0 6px 14px -3px rgba(15, 23, 42, 0.08);
}

.lb-topic-abbr-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  color: #FFFFFF;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.85rem;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.lb-topic-card-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: #0F172A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.lb-topic-card-pts {
  font-size: 0.72rem;
  font-weight: 800;
  margin-top: 3px;
}

.lb-topic-card-levels {
  font-size: 0.68rem;
  color: #64748B;
  font-weight: 600;
  margin-top: 2px;
}

.lb-topic-mini-track {
  width: 100%;
  height: 3px;
  background: #E2E8F0;
  border-radius: 99px;
  overflow: hidden;
  margin-top: 8px;
}

.lb-topic-mini-fill {
  height: 100%;
  border-radius: 99px;
}

.lb-topic-status-tag {
  margin-top: 6px;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 99px;
}

.lb-topic-status-tag.completed {
  background: #ECFDF5;
  color: #059669;
  border: 1px solid #A7F3D0;
}

/* Slider progress indicator */
.lb-slider-progress-track {
  height: 4px;
  background: #E2E8F0;
  border-radius: 99px;
  position: relative;
  margin-top: 4px;
  overflow: hidden;
}

.lb-slider-progress-pill {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32%;
  background: #6366F1;
  border-radius: 99px;
  transition: left 0.15s ease-out;
}

/* 3. Bottom Row */
.lb-bottom-metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.lb-table-topic-pill {
  background: #EEF2FF;
  color: #4F46E5;
  font-weight: 700;
  font-size: 0.76rem;
  padding: 3px 8px;
  border-radius: 6px;
}

/* Empty State */
.lb-empty-table-cell {
  text-align: center;
  padding: 42px 20px !important;
}

.lb-empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.lb-empty-doc-icon {
  margin-bottom: 8px;
}

.lb-empty-state-content h4 {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
}

.lb-empty-state-content p {
  margin: 0;
  font-size: 0.8rem;
  color: #64748B;
}

/* Responsive Breakpoints */
@media (max-width: 1080px) {
  .lb-top-metric-grid {
    grid-template-columns: 1fr;
  }
  .lb-mid-metric-grid {
    grid-template-columns: 1fr;
  }
  .lb-bottom-metric-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .lb-modern-page {
    padding: 16px 14px 40px;
  }
  .lb-header-container {
    grid-template-columns: 1fr;
    gap: 12px;
    text-align: center;
  }
  .lb-modern-back-btn {
    justify-self: center;
  }
  .lb-header-spacer {
    display: none;
  }
  .lb-modern-heading {
    font-size: 1.65rem;
  }
  .lb-final-score-card {
    flex-direction: column;
    text-align: center;
  }
  .lb-podium-graphic-wrap {
    margin-right: 0;
    margin-bottom: 8px;
  }
  .lb-final-score-desc {
    max-width: none;
  }
  .lb-gold-waves {
    display: none;
  }
}
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById("lb-modern-styles");
  if (existing) existing.remove();
  const s = document.createElement("style");
  s.id = "lb-modern-styles";
  s.innerText = modernStyles;
  document.head.appendChild(s);
}
