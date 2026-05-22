import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";
import { quizAPI } from "../services/api";

export default function Leaderboard() {
  const { progress, globalLeaderboard, isLoading, fetchGlobalLeaderboard, saveToLeaderboard, getTotalScore, getCategoryProgress } = useUserProgress();
  const [sections, setSections] = useState([]);
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

  const totalScore = getTotalScore();
  const maxScore = sections.reduce((total, section) => total + ((section.levels?.length || 0) * 20), 0) || 1;
  const completedSections = sections.filter(sec => getCategoryProgress(sec.slug).passed?.length > 0).length;
  const totalSections = sections.length || 1;
  const completionPercentage = (completedSections / totalSections) * 100;

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
        <section className="lb-overview">
          <div className="lb-stat-card">
            <div className="lb-stat-val" style={{ color: '#16A34A' }}>{totalScore}</div>
            <div className="lb-stat-lbl">Total Score</div>
            <div className="lb-stat-extra">{Math.round((totalScore / maxScore) * 100)}% of {maxScore}</div>
            {totalScore > 0 && progress.username && (
              <button
                onClick={async () => await saveToLeaderboard(progress.username, totalScore)}
                className="lb-submit-btn"
              >
                Submit Score
              </button>
            )}
          </div>

          <div className="lb-stat-card">
            <div className="lb-stat-val" style={{ color: '#D97706' }}>{progress.highestScore || 0}</div>
            <div className="lb-stat-lbl">Highest Score</div>
            <div className="lb-badge">
              {progress.highestScore >= 700 ? "Master" :
               progress.highestScore >= 600 ? "Advanced" :
               progress.highestScore >= 400 ? "Intermediate" :
               progress.highestScore >= 200 ? "Beginner" : "New"}
            </div>
          </div>

          <div className="lb-stat-card">
            <div className="lb-stat-val" style={{ color: '#2563EB' }}>{completedSections}/{totalSections}</div>
            <div className="lb-stat-lbl">Quests Done</div>
            <div className="lb-stat-extra">{Math.round(completionPercentage)}% Complete</div>
          </div>
        </section>

        <section className="lb-categories">
          <h2 className="lb-section-title">Category Performance</h2>
          <div className="lb-cat-grid">
            {sections.map((section) => {
              const d = getCategoryProgress(section.slug);
              const done = d.passed?.length || 0;
              const totalLevels = section.levels?.length || 0;
              const pct = totalLevels > 0 ? (done / totalLevels) * 100 : 0;
              return (
                <div key={section.slug} className="lb-cat-card" style={{ '--accent': section.iconColor }}>
                  <div className="lb-cat-top">
                    <span className="lb-cat-icon" style={{ color: section.iconColor }}>{section.label}</span>
                    <div className="lb-cat-info">
                      <h3>{section.name}</h3>
                      <span className="lb-cat-levels">{done}/{totalLevels} Levels</span>
                    </div>
                    <div className="lb-cat-score" style={{ color: section.iconColor }}>{d.score || 0}<small> pts</small></div>
                  </div>
                  <div className="lb-cat-bar-track">
                    <div className="lb-cat-bar-fill" style={{ width: `${pct}%`, background: section.iconColor }}></div>
                  </div>
                  <div className="lb-cat-status">
                    {totalLevels > 0 && done === totalLevels ? <span className="lb-status-done">Completed</span> :
                     done > 0 ? <span className="lb-status-prog">In Progress</span> :
                     <span className="lb-status-new">Not Started</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lb-hall">
          <h2 className="lb-section-title">Global Hall of Fame</h2>
          <p className="lb-section-sub">Real-time ranks stored in MongoDB.</p>

          <div className="lb-table-wrap">
            {isLoading ? (
              <div className="lb-loading">Loading global scores...</div>
            ) : globalLeaderboard.length === 0 ? (
              <div className="lb-loading">No scores yet. Submit your first score.</div>
            ) : (
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th style={{ textAlign: 'right' }}>Score</th>
                    <th style={{ textAlign: 'right' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {globalLeaderboard.map((entry, index) => {
                    const isMe = progress.username && entry.name.toLowerCase() === progress.username.toLowerCase();
                    const rank = index + 1;
                    return (
                      <tr key={entry.id || index} className={isMe ? 'lb-row-me' : ''}>
                        <td className="lb-rank">{rank}</td>
                        <td>
                          {entry.name}
                          {isMe && <span className="lb-you-badge">YOU</span>}
                        </td>
                        <td className="lb-score-col">{entry.score} pts</td>
                        <td className="lb-date-col">{entry.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="lb-actions">
          <button onClick={() => navigate('/')} className="lb-action-btn lb-home-btn">Back to Home</button>
          <button onClick={() => navigate('/')} className="lb-action-btn lb-continue-btn">Continue Learning</button>
        </div>
      </main>
    </div>
  );
}

const styles = `
.lb-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(22, 163, 74, 0.1), transparent 30rem),
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 32rem),
    linear-gradient(135deg, #f8fbff 0%, #eef6ff 48%, #f7f4ff 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  padding-bottom: 48px;
}

.lb-header {
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e2e8f0;
  padding: 20px 0;
  margin-bottom: 30px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.lb-header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.lb-heading {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1d4ed8, #16a34a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.lb-sub {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.lb-back-btn,
.lb-submit-btn,
.lb-action-btn {
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 800;
  cursor: pointer;
}

.lb-back-btn,
.lb-continue-btn,
.lb-submit-btn {
  background: #2563eb;
  color: white;
}

.lb-back-btn:hover,
.lb-continue-btn:hover,
.lb-submit-btn:hover {
  background: #1d4ed8;
}

.lb-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}

.lb-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
  margin-bottom: 36px;
}

.lb-stat-card,
.lb-cat-card,
.lb-table-wrap {
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.lb-stat-card {
  padding: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border-top: 5px solid #2563eb;
}

.lb-stat-card:nth-child(2) {
  border-top-color: #d97706;
}

.lb-stat-card:nth-child(3) {
  border-top-color: #7c3aed;
}

.lb-stat-val {
  font-size: 2.3rem;
  font-weight: 800;
}

.lb-stat-lbl {
  font-size: 0.9rem;
  color: #475569;
  font-weight: 800;
}

.lb-stat-extra {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
}

.lb-badge {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 5px 12px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.82rem;
}

.lb-section-title {
  font-size: 1.35rem;
  font-weight: 800;
  text-align: center;
  margin: 0 0 10px;
}

.lb-section-sub {
  text-align: center;
  color: #64748b;
  margin-bottom: 20px;
  font-weight: 600;
}

.lb-categories {
  margin-bottom: 40px;
}

.lb-cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin-top: 18px;
}

.lb-cat-card {
  padding: 18px;
  border-left: 4px solid var(--accent);
}

.lb-cat-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.lb-cat-icon {
  font-size: 0.88rem;
  font-weight: 800;
}

.lb-cat-info {
  flex: 1;
}

.lb-cat-info h3 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
}

.lb-cat-levels {
  font-size: 0.8rem;
  color: #64748b;
}

.lb-cat-score {
  font-size: 1.25rem;
  font-weight: 800;
}

.lb-cat-score small {
  font-size: 0.7rem;
  font-weight: 700;
}

.lb-cat-bar-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 10px;
}

.lb-cat-bar-fill {
  height: 100%;
  border-radius: 999px;
}

.lb-cat-status {
  text-align: center;
}

.lb-status-done,
.lb-status-prog,
.lb-status-new {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
}

.lb-status-done { background: #dcfce7; color: #166534; }
.lb-status-prog { background: #dbeafe; color: #1e40af; }
.lb-status-new { background: #f1f5f9; color: #475569; }

.lb-hall {
  margin-bottom: 34px;
}

.lb-table-wrap {
  padding: 24px;
  overflow-x: auto;
  max-width: 880px;
  margin: 0 auto;
}

.lb-loading {
  text-align: center;
  padding: 34px;
  font-size: 1rem;
  color: #64748b;
  font-weight: 700;
}

.lb-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 500px;
}

.lb-table thead tr {
  border-bottom: 2px solid #e2e8f0;
}

.lb-table th {
  padding: 12px;
  font-weight: 800;
  font-size: 0.92rem;
  color: #475569;
}

.lb-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.95rem;
}

.lb-row-me {
  background: #eff6ff;
  font-weight: 700;
}

.lb-rank {
  font-weight: 800;
}

.lb-you-badge {
  font-size: 0.68rem;
  background: #2563eb;
  color: white;
  padding: 2px 7px;
  border-radius: 999px;
  margin-left: 8px;
  font-weight: 800;
}

.lb-score-col {
  text-align: right;
  font-weight: 800;
  color: #16a34a;
}

.lb-date-col {
  text-align: right;
  color: #64748b;
  font-size: 0.88rem;
}

.lb-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 26px;
}

.lb-home-btn {
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.lb-home-btn:hover {
  background: #f8fafc;
}

@media (max-width: 768px) {
  .lb-header-inner {
    flex-direction: column;
    text-align: center;
  }

  .lb-heading {
    font-size: 1.6rem;
  }

  .lb-overview,
  .lb-cat-grid {
    grid-template-columns: 1fr;
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
