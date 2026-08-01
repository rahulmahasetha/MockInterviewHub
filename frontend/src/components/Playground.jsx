import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// LevelMarker removed — using clean quiz layout
import MCQCard from './MCQCard';
import PreInterviewCheck from './PreInterviewCheck';
import MiniProctoring from './MiniProctoring';
import { useUserProgress } from '../context/UserProgressContext';
import { quizAPI } from '../services/api';
import {
  FaBell,
  FaCheckCircle,
  FaDesktop,
  FaExclamationTriangle,
  FaExpand,
  FaEye,
  FaMicrophone,
  FaVideo,
  FaWifi
} from 'react-icons/fa';

// map removed

export default function Playground() {
  const { category } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const { getCategoryProgress } = useUserProgress();
  const [data, setData] = useState({ levels: [] });
  const [categoryData, setCategoryData] = useState(null);
  const [isLoadingCategory, setIsLoadingCategory] = useState(true);
  const [showProgressOverview, setShowProgressOverview] = useState(false);
  const [passedPreCheck, setPassedPreCheck] = useState(false);
  const [violations, setViolations] = useState(0);
  const MAX_VIOLATIONS = 10;

  useEffect(() => {
    async function loadCategory() {
      setIsLoadingCategory(true);
      setSelectedLevel(null);
      try {
        const response = await quizAPI.getCategory(category);
        const nextCategory = response.data;
        setCategoryData(nextCategory);
        setData({ levels: nextCategory?.levels || [] });
      } catch (error) {
        setCategoryData(null);
        setData({ levels: [] });
      } finally {
        setIsLoadingCategory(false);
      }
    }

    loadCategory();
  }, [category]);

  const handleProctorViolation = () => {
    setViolations(prev => Math.min(prev + 1, MAX_VIOLATIONS));
  };

  const handleTerminate = () => {
    alert('Maximum proctoring violations reached. Terminating quiz.');
    navigate('/home');
  };

  function onLevelClick(level) {
    setSelectedLevel(level);
  }

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      setProctorError('Fullscreen permission was blocked. Continue only after enabling it.');
    }
  };

  const categoryProgress = getCategoryProgress(category);
  const passed = new Set(categoryProgress?.passed || []);
  const currentScore = Math.max(categoryProgress?.score || 0, 0);
  const passedCount = passed.size;
  const totalLevels = data.levels.length;
  const progressPercentage = totalLevels > 0 ? (passedCount / totalLevels) * 100 : 0;
  const categoryTitle = categoryData?.name || (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Quest');
  const categoryColor = categoryData?.iconColor || '#2563eb';
  const categoryLabel = categoryData?.label || 'QZ';

  // map positions removed

  if (!passedPreCheck) {
    return <PreInterviewCheck onComplete={() => setPassedPreCheck(true)} />;
  }

  return (
    <div className="playground-container app-shell">
      <MiniProctoring violations={violations} maxViolations={MAX_VIOLATIONS} onViolation={handleProctorViolation} onTerminate={handleTerminate} />
      <header className="playground-header">
        <div className="header-content">
          <button onClick={() => navigate('/')} className="back-button nav-button">
            Back to Quests
          </button>
          <div className="category-title">
            <span className="category-icon" style={{ backgroundColor: categoryColor }}>{categoryLabel}</span>
            <h1>{categoryTitle} Quest</h1>
          </div>

          <nav className="playground-nav">
            <button onClick={() => navigate('/leaderboard')} className="nav-button" title="View Leaderboard">
              Leaderboard
            </button>
            <button onClick={() => setShowProgressOverview(!showProgressOverview)} className="nav-button" title="Progress Overview">
              Progress
            </button>
            <div className="score-badge">{currentScore} Points</div>
          </nav>
        </div>
      </header>

      {showProgressOverview && (
        <div className="instructions-overlay">
          <div className="instructions-modal progress-modal">
            <div className="modal-header">
              <h2>{categoryTitle} Progress</h2>
              <button onClick={() => setShowProgressOverview(false)} className="close-button">
                Close
              </button>
            </div>

            <div className="progress-content">
              <div className="progress-header-box">
                <span className="count">{passedCount}/{totalLevels}</span>
                <span className="label">Levels Completed</span>
              </div>

              <div className="progress-details-modal">
                <div className="progress-item-modal">
                  <span className="progress-label">Levels Completed</span>
                  <span className="progress-value">{passedCount}</span>
                </div>
                <div className="progress-item-modal">
                  <span className="progress-label">Current Score</span>
                  <span className="progress-value">{currentScore} pts</span>
                </div>
                <div className="progress-item-modal">
                  <span className="progress-label">Levels Remaining</span>
                  <span className="progress-value">{totalLevels - passedCount}</span>
                </div>
              </div>

              <div className="category-progress-section">
                <h3>Category Progress</h3>
                <div className="progress-bar-large">
                  <div
                    className="progress-fill-large"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: categoryColor
                    }}
                  ></div>
                </div>
                <div className="progress-percentage">
                  {Math.round(progressPercentage)}% Complete
                </div>
              </div>

              <div className="level-breakdown">
                <h4>Level Progress</h4>
                <div className="levels-grid">
                  {data.levels.map((_, index) => {
                    const levelNumber = index + 1;
                    const isCompleted = passed.has(levelNumber - 1);
                    const isCurrent = !isCompleted && (index === 0 || passed.has(index));

                    return (
                      <div key={index} className="level-status">
                        <div className={`level-indicator ${isCompleted ? 'completed' : isCurrent ? 'current' : 'locked'}`}>
                          {isCompleted ? 'OK' : isCurrent ? 'Now' : levelNumber}
                        </div>
                        <span className="level-text">Level {levelNumber}</span>
                        <span className="level-state">
                          {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => setShowProgressOverview(false)} className="start-button">
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="playground-main">
        <div className="layout-grid">
          <section className="quiz-section">
            <div className="quiz-container">
              <div className="quiz-header">
                <div className="quiz-progress">
                  <div className="qp-top">
                    <span>Question {selectedLevel ? selectedLevel.level : 1} of {totalLevels}</span>
                    <span className="qp-timer">{/* timer could go here */}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round(progressPercentage)}%`, background: categoryColor }} />
                  </div>
                </div>
                <h2 className="quiz-title">{categoryTitle} Challenge</h2>
              </div>

              <div className="quiz-body">
                <div className="quiz-card">
                  {isLoadingCategory && <div className="map-loading">Loading quiz...</div>}
                  {!isLoadingCategory && (
                    <>
                      {!selectedLevel && data.levels.length > 0 && (
                        <button className="start-quiz-btn" onClick={() => setSelectedLevel(data.levels[0])}>Start Quiz</button>
                      )}

                      {selectedLevel && (
                        <MCQCard
                          levelObj={selectedLevel}
                          category={category}
                          totalLevels={totalLevels}
                          onCorrectNextLevel={(nextLevel) => {
                            const next = data.levels.find(l => l.level === nextLevel);
                            if (next) setSelectedLevel(next);
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="sidebar quiz-sidebar">


            <div className="sidebar-top">
              <h4>Your Progress</h4>
              <div className="progress-circle">
                <div className="progress-number">{Math.round(progressPercentage)}%</div>
              </div>
              <div className="progress-stats">
                <div><strong>{passedCount}</strong><span>Correct</span></div>
                <div><strong>{totalLevels - passedCount}</strong><span>Remaining</span></div>
              </div>
            </div>

            <div className="navigator">
              <h5>Question Navigator</h5>
              <div className="nav-grid">
                {data.levels.map((lvl, idx) => {
                  const levelNumber = idx + 1;
                  const isCompleted = passed.has(levelNumber - 1);
                  const isCurrent = selectedLevel?.level === levelNumber;
                  const previousLevelCompleted = levelNumber === 1 || passed.has(levelNumber - 2);
                  const isLocked = !previousLevelCompleted && !isCompleted;

                  return (
                    <button
                      key={idx}
                      className={`nav-cell ${isCompleted ? 'answered' : isCurrent ? 'current' : isLocked ? 'locked' : 'unanswered'}`}
                      onClick={() => !isLocked && setSelectedLevel(data.levels[idx])}
                      disabled={isLocked}
                    >
                      {levelNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.playground-container {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  background:
    radial-gradient(circle at top right, rgba(124, 58, 237, 0.12), transparent 32rem),
    linear-gradient(135deg, #f8fbff 0%, #eef6ff 48%, #f7f4ff 100%);
}

.playground-header {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  margin: 18px auto 0;
  max-width: 1400px;
  width: calc(100% - 32px);
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-title h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1d4ed8, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.category-icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 0.86rem;
}

.playground-nav {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.nav-button,
.stop-mcq-button {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 9px 13px;
  font-weight: 800;
  font-size: 0.88rem;
  color: #334155;
  cursor: pointer;
}

.nav-button:hover,
.stop-mcq-button:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.score-badge {
  background: linear-gradient(135deg, #dbeafe, #ede9fe);
  color: #1e40af;
  padding: 9px 13px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.9rem;
}

.playground-main {
  padding: 28px 16px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 24px;
  align-items: start;
}

.map-section,
.mcq-container,
.welcome-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.map-section {
  padding: 22px;
  min-height: 600px;
  border-top: 5px solid #2563eb;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.map-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}

.map-wrapper {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
}

.map-image {
  width: 100%;
  height: auto;
  display: block;
}

.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(248, 250, 252, 0.86);
  color: #1d4ed8;
  font-weight: 800;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.86rem;
  color: #475569;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.legend-color.current { background: #0f172a; }
.legend-color.completed { background: #16a34a; }
.legend-color.locked { background: #94a3b8; }

.sidebar {
  width: 100%;
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.mcq-container {
  overflow: hidden;
}

.mcq-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  color: white;
}

.mcq-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
}

.stop-mcq-button {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.25);
  color: white;
}

.welcome-card {
  padding: 30px 24px;
  text-align: left;
}

.welcome-icon {
  display: inline-flex;
  background: linear-gradient(135deg, #dbeafe, #ede9fe);
  color: #1d4ed8;
  padding: 9px 12px;
  border-radius: 8px;
  font-weight: 800;
  margin-bottom: 18px;
}

.welcome-card h3 {
  font-size: 1.45rem;
  font-weight: 800;
  margin: 0 0 10px;
}

.welcome-card p {
  color: #64748b;
  font-size: 0.94rem;
  margin-bottom: 20px;
  line-height: 1.5;
}

.tips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tip {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
}

.progress-modal {
  max-width: 640px;
}

.progress-header-box {
  text-align: center;
  margin-bottom: 18px;
  padding: 18px;
  background: linear-gradient(135deg, #eff6ff, #f5f3ff);
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.progress-header-box .count {
  display: block;
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 4px;
  color: #0f172a;
}

.progress-header-box .label {
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 700;
}

.progress-details-modal {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 18px;
  margin-bottom: 18px;
}

.progress-item-modal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 0;
  border-bottom: 1px solid #e2e8f0;
}

.progress-item-modal:last-child {
  border-bottom: none;
}

.progress-label {
  color: #64748b;
  font-weight: 700;
}

.progress-value {
  color: #0f172a;
  font-weight: 800;
}

.category-progress-section {
  margin-bottom: 20px;
}

.category-progress-section h3,
.level-breakdown h4 {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 800;
}

.progress-bar-large {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill-large {
  height: 100%;
  border-radius: 999px;
}

.progress-percentage {
  text-align: center;
  font-weight: 700;
  color: #64748b;
  font-size: 0.9rem;
}

.level-breakdown {
  margin-bottom: 20px;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.level-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.level-indicator {
  width: 34px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  color: white;
}

.level-indicator.completed { background: #16a34a; }
.level-indicator.current { background: #0f172a; }
.level-indicator.locked { background: #94a3b8; }

.level-text {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
}

.level-state {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 800;
  text-transform: uppercase;
}

.mcq-card-inner {
  padding: 22px;
  color: #0f172a;
}

.mcq-empty {
  padding: 36px;
  text-align: center;
  color: #475569;
}

.mcq-timer {
  margin-bottom: 18px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  font-weight: 800;
  font-size: 1rem;
}

.time-safe { color: #1d4ed8; }
.time-danger { color: #dc2626; }

.mcq-image {
  width: 100%;
  max-height: 250px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 18px;
  border: 1px solid #e2e8f0;
}

.mcq-question {
  margin-bottom: 18px;
  color: #0f172a;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.45;
}

.mcq-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 22px;
}

.mcq-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.98rem;
}

.mcq-option:hover:not(.disabled) {
  border-color: #2563eb;
  background: #eff6ff;
}

.mcq-option.selected {
  border-color: #2563eb;
  background: #dbeafe;
}

.mcq-option.disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.mcq-radio {
  width: 18px;
  height: 18px;
  accent-color: #2563eb;
}

.mcq-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.mcq-btn {
  padding: 13px 18px;
  border-radius: 8px;
  border: none;
  font-weight: 800;
  font-size: 0.96rem;
  cursor: pointer;
  flex: 1;
  min-width: 120px;
  text-align: center;
}

.mcq-submit {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: white;
}

.mcq-submit:hover {
  background: linear-gradient(135deg, #1d4ed8, #4338ca);
}

.mcq-hint-toggle {
  background: #f59e0b;
  color: #111827;
}

.mcq-hint-toggle:hover {
  background: #d97706;
  color: white;
}

.mcq-hint-box {
  margin-top: 18px;
  padding: 14px;
  background: #fffbeb;
  border: 1px solid #facc15;
  border-radius: 8px;
  color: #92400e;
  font-weight: 600;
}

.mcq-result {
  margin-top: 18px;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  font-weight: 800;
  font-size: 1rem;
}

.mcq-result.success { background: #dcfce7; border: 1px solid #86efac; color: #166534; }
.mcq-result.neutral { background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; }
.mcq-result.grand-success { background: #dbeafe; border: 1px solid #93c5fd; color: #1e40af; padding: 24px; }
.mcq-result.error { background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; }
.mcq-result.warning { background: #ffedd5; border: 1px solid #fed7aa; color: #9a3412; }
.grand-icon { display: none; }

@media (max-width: 1024px) {
  .layout-grid { grid-template-columns: 1fr; }
  .sidebar { max-width: 640px; margin: 0 auto; position: static; max-height: none; }
}

@media (max-width: 768px) {
  .header-content { justify-content: center; text-align: center; }
  .playground-nav { width: 100%; justify-content: center; }
  .levels-grid { grid-template-columns: 1fr; }
  .mcq-actions { flex-direction: column; }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById("eduquest-playground-styles");
  if (existing) existing.remove();
  const styleSheet = document.createElement("style");
  styleSheet.id = "eduquest-playground-styles";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
