import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";
import { quizAPI } from "../services/api";

export default function Leaderboard() {
  const { progress, globalLeaderboard, isLoading, fetchGlobalLeaderboard, saveToLeaderboard, getTotalScore, getCategoryProgress } = useUserProgress();
  const [sections, setSections] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const categoriesRef = useRef(null);
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
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
        setShowCategories(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalScore = getTotalScore();
  const maxScore = sections.reduce((total, section) => total + ((section.levels?.length || 0) * 20), 0) || 1800;
  const completedSections = sections.filter(sec => getCategoryProgress(sec.slug).passed?.length > 0).length;
  const totalSections = sections.length || 9;

  const quizLeaderboard = globalLeaderboard.filter(e => e.type !== 'interview');
  const interviewLeaderboard = globalLeaderboard.filter(e => e.type === 'interview');

  return (
    <div className="lb-page">
      <header className="lb-header">
        <div className="lb-header-inner">
          <div>
            <h1 className="lb-heading">Learning Leaderboard</h1>
            <p className="lb-sub">Track scores, quest progress, and global ranks.</p>
          </div>
          <button onClick={() => navigate('/')} className="lb-back-btn">
            Back to Home
          </button>
        </div>
      </header>

      <main className="lb-main">
        {/* Top Row Metric Cards */}
        <section className="lb-top-row">
          <div className="lb-metric-card" style={{ borderLeftColor: '#3B82F6' }}>
            <div className="lb-metric-top">
              <div className="lb-metric-title">My Total Score</div>
            </div>
            <div className="lb-metric-body">
              <div className="lb-metric-val" style={{ color: '#111827' }}>{totalScore}</div>
              <div className="lb-metric-desc">{totalScore} pts / {maxScore} pts</div>
            </div>
            <div className="lb-progress-bar">
              <div className="lb-progress-fill" style={{ width: `${Math.min(100, (totalScore / maxScore) * 100)}%`, backgroundColor: '#3B82F6' }}></div>
            </div>
            {totalScore > 0 && progress.username && (
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={async () => await saveToLeaderboard(progress.username, totalScore)}
                  className="lb-submit-btn-small"
                >
                  Submit Score
                </button>
              </div>
            )}
          </div>

          <div className="lb-metric-card" style={{ borderLeftColor: '#F59E0B' }}>
            <div className="lb-metric-top">
              <div className="lb-metric-title">Personal Highest Score</div>
            </div>
            <div className="lb-metric-body-center">
              <div className="lb-metric-val-large" style={{ color: '#D97706' }}>{progress.highestScore || 0}</div>
              <div className="lb-metric-badge-container">
                <span className="lb-metric-badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>New</span>
                <span className="lb-metric-desc-bottom">Top Quiz Score</span>
              </div>
            </div>
          </div>

          <div className="lb-metric-card" style={{ borderLeftColor: '#8B5CF6' }}>
            <div className="lb-metric-top">
              <div className="lb-metric-title">Completed Quests</div>
            </div>
            <div className="lb-metric-body-circle">
              <div className="lb-circle-progress"></div>
              <div className="lb-circle-val">
                <span className="lb-circle-done" style={{ color: '#6D28D9' }}>{completedSections}</span> / {totalSections}
              </div>
            </div>
          </div>
        </section>

        {/* Middle Row */}
        <section className="lb-mid-row">
          {/* Left Half: Global Performer Rankings */}
          <div className="lb-card lb-rankings-card">
            <h2 className="lb-card-title">Global Performer Rankings</h2>
            <div className="lb-table-container">
              <table className="lb-data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Points</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {quizLeaderboard.slice(0, 7).map((entry, index) => {
                    const isMe = progress.username && entry.name.toLowerCase() === progress.username.toLowerCase();
                    const rank = index + 1;
                    return (
                      <tr key={entry.id || index} className={isMe ? 'lb-row-highlight' : ''}>
                        <td className="lb-cell-rank">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </td>
                        <td className="lb-cell-name">
                          {entry.name}
                          {isMe && <span className="lb-badge-you">YOU</span>}
                        </td>
                        <td className="lb-cell-pts">{entry.score} pts</td>
                        <td className="lb-cell-date">{entry.date || 'Recently'}</td>
                      </tr>
                    );
                  })}
                  {/* Ensure YOU is at the bottom if not in top 7 */}
                  {progress.username && !quizLeaderboard.slice(0, 7).some(e => e.name.toLowerCase() === progress.username.toLowerCase()) && (
                    <tr className="lb-row-highlight">
                      <td className="lb-cell-rank">7+</td>
                      <td className="lb-cell-name">{progress.username} <span className="lb-badge-you">YOU</span></td>
                      <td className="lb-cell-pts">{totalScore} pts</td>
                      <td className="lb-cell-date">Just now</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Half: Topic Mastery & Quiz Progress */}
          <div className="lb-card lb-topics-card">
            <div className="lb-topics-header">
              <h2 className="lb-card-title">Topic Mastery & Quiz Progress</h2>
              <div className="lb-dropdown-container" ref={categoriesRef}>
                <button className="lb-dropdown-btn" onClick={() => setShowCategories(!showCategories)}>
                  Categories ▼
                </button>
                {showCategories && (
                  <div className="lb-dropdown-panel">
                    {sections.map(sec => (
                      <div key={sec.slug} className="lb-dropdown-item" style={{ backgroundColor: sec.iconColor || '#3B82F6' }}>
                        <div className="lb-dropdown-item-title">{sec.name}</div>
                        <div className="lb-dropdown-item-desc">Programming quiz for {sec.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="lb-mini-grid">
              {sections.slice(0, 8).map((section) => {
                const d = getCategoryProgress(section.slug);
                const done = d.passed?.length || 0;
                const totalLevels = section.levels?.length || 10;
                const pct = totalLevels > 0 ? (done / totalLevels) * 100 : 0;
                return (
                  <div key={section.slug} className="lb-mini-card" style={{ borderLeftColor: section.iconColor || '#3B82F6' }}>
                    <div className="lb-mini-top">
                      <span className="lb-mini-icon">{section.label || section.name.charAt(0)}</span>
                      <div className="lb-mini-info">
                        <div className="lb-mini-name">{section.name} Quiz</div>
                        <div className="lb-mini-pts" style={{ color: section.iconColor || '#16A34A' }}>{d.score || 0} pts</div>
                      </div>
                    </div>
                    <div className="lb-mini-progress-text">{done}/{totalLevels} Levels</div>
                    <div className="lb-mini-progress-bar">
                      <div className="lb-mini-progress-fill" style={{ width: `${pct}%`, backgroundColor: section.iconColor || '#3B82F6' }}></div>
                    </div>
                    <div className="lb-mini-status">
                      <span className="lb-chip">Not Started</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom Row */}
        <section className="lb-bottom-row">
          <div className="lb-card lb-perf-card">
            <h2 className="lb-card-title" style={{ textAlign: 'center' }}>My Specific Quiz Performance</h2>
            <div className="lb-table-container">
              <table className="lb-data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate (YOU)</th>
                    <th>Topic</th>
                    <th>Score (Obtained / Total)</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {interviewLeaderboard.slice(0, 4).map((entry, index) => {
                    const isMe = progress.username && entry.name.toLowerCase() === progress.username.toLowerCase();
                    return (
                      <tr key={entry.id || index}>
                        <td>{index + 1}</td>
                        <td className="lb-cell-name">
                          {entry.name}
                          {isMe && <span className="lb-badge-you">YOU</span>}
                        </td>
                        <td>
                          <span className="lb-topic-badge">🎤 {entry.topic || 'General'}</span>
                        </td>
                        <td className="lb-cell-pts-alt">{entry.score} pts</td>
                        <td className="lb-cell-date">{entry.date}</td>
                      </tr>
                    );
                  })}
                  {interviewLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
                        No interview history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="lb-actions-center">
          <button onClick={() => navigate('/')} className="lb-btn-primary">
            Continue Learning
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = `
.lb-page {
  min-height: 100vh;
  background-color: #EFF6FF;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111827;
  padding-bottom: 48px;
}

.lb-header {
  padding: 20px 0;
  margin-bottom: 30px;
}

.lb-header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lb-heading {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: #111827;
}

.lb-sub {
  margin: 4px 0 0;
  color: #4B5563;
  font-size: 0.95rem;
}

.lb-back-btn {
  background-color: #2563EB;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
}

.lb-back-btn:hover {
  background-color: #1D4ED8;
}

.lb-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* TOP ROW */
.lb-top-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.lb-metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border-left: 6px solid #ccc;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.lb-metric-top {
  margin-bottom: 12px;
}

.lb-metric-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.lb-metric-body {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.lb-metric-val {
  font-size: 2.5rem;
  font-weight: 700;
}

.lb-metric-val-large {
  font-size: 2.5rem;
  font-weight: 700;
}

.lb-metric-desc {
  font-size: 0.9rem;
  color: #4B5563;
  font-weight: 500;
}

.lb-progress-bar {
  height: 8px;
  background-color: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
}

.lb-progress-fill {
  height: 100%;
  border-radius: 4px;
}

.lb-metric-body-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.lb-metric-badge-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.lb-metric-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.lb-metric-desc-bottom {
  font-size: 0.9rem;
  color: #4B5563;
}

.lb-metric-body-circle {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lb-circle-progress {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 4px solid #EDE9FE;
  border-top-color: #8B5CF6;
}

.lb-circle-val {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.lb-circle-done {
  font-size: 1.5rem;
  font-weight: 700;
}

.lb-submit-btn-small {
  background: #EFF6FF;
  color: #2563EB;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

/* MIDDLE ROW */
.lb-mid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.lb-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.lb-card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 20px 0;
}

.lb-table-container {
  overflow-x: auto;
}

.lb-data-table {
  width: 100%;
  border-collapse: collapse;
}

.lb-data-table th,
.lb-data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #F3F4F6;
}

.lb-data-table th {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4B5563;
  background-color: #F9FAFB;
}

.lb-data-table td {
  font-size: 0.95rem;
  color: #111827;
}

.lb-cell-rank {
  font-weight: 600;
}

.lb-cell-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lb-badge-you {
  background-color: #3B82F6;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
}

.lb-cell-pts {
  color: #16A34A;
  font-weight: 600;
}

.lb-cell-pts-alt {
  color: #16A34A;
  font-weight: 600;
}

.lb-cell-date {
  color: #6B7280;
  font-size: 0.85rem;
}

.lb-row-highlight {
  background-color: #DBEAFE;
}

/* MINI CARDS */
.lb-topics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.lb-dropdown-container {
  position: relative;
}

.lb-dropdown-btn {
  background: white;
  border: 1px solid #E5E7EB;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  color: #374151;
}

.lb-dropdown-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  width: 480px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  z-index: 50;
  border: 1px solid #E5E7EB;
}

.lb-dropdown-item {
  padding: 16px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.lb-dropdown-item:hover {
  transform: translateY(-2px);
}

.lb-dropdown-item-title {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 4px;
}

.lb-dropdown-item-desc {
  font-size: 0.8rem;
  opacity: 0.9;
}

.lb-mini-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.lb-mini-card {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  border-left-width: 4px;
  padding: 12px;
  background: white;
}

.lb-mini-top {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;
}

.lb-mini-icon {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #F3F4F6;
  border-radius: 4px;
}

.lb-mini-info {
  flex: 1;
}

.lb-mini-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.lb-mini-pts {
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 2px;
}

.lb-mini-progress-text {
  font-size: 0.7rem;
  color: #6B7280;
  margin-bottom: 4px;
}

.lb-mini-progress-bar {
  height: 4px;
  background: #E5E7EB;
  border-radius: 2px;
  margin-bottom: 12px;
}

.lb-mini-progress-fill {
  height: 100%;
  border-radius: 2px;
}

.lb-mini-status {
  display: flex;
  justify-content: center;
}

.lb-chip {
  background: #F3F4F6;
  color: #4B5563;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 600;
}

/* BOTTOM ROW */
.lb-bottom-row {
  display: block;
}

.lb-topic-badge {
  background: #EEF2FF;
  color: #4338CA;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

.lb-actions-center {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.lb-btn-primary {
  background-color: #2563EB;
  color: white;
  border: none;
  border-radius: 24px;
  padding: 12px 32px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}

.lb-btn-primary:hover {
  background-color: #1D4ED8;
}

@media (max-width: 1024px) {
  .lb-top-row {
    grid-template-columns: 1fr;
  }
  .lb-mid-row {
    grid-template-columns: 1fr;
  }
  .lb-mini-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById("lb-styles");
  if (existing) existing.remove();
  const s = document.createElement("style");
  s.id = "lb-styles";
  s.innerText = styles;
  document.head.appendChild(s);
}
