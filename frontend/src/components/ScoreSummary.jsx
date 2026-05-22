import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProgress } from '../context/UserProgressContext';
import { quizAPI } from '../services/api';

export default function ScoreSummary() {
  const { progress, updateHighestScore, getTotalScore, getCategoryProgress } = useUserProgress();
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  const totalScore = getTotalScore();

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await quizAPI.getCategories();
        setCategories(response.data || []);
      } catch (error) {
        setCategories([]);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    updateHighestScore(totalScore);
  }, [totalScore]);

  return (
    <div className="ss-page">
      <div className="ss-card">
        <div className="ss-header">
          <h1>Final Score Summary</h1>
          <p className="ss-subtitle">Your score across all quest categories.</p>
        </div>

        <div className="ss-scores-grid">
          {categories.map(cat => (
            <div key={cat.slug} className="ss-score-item" style={{ '--accent': cat.iconColor }}>
              <span className="ss-cat-icon" style={{ color: cat.iconColor }}>{cat.label}</span>
              <span className="ss-cat-name">{cat.name}</span>
              <span className="ss-cat-val" style={{ color: cat.iconColor }}>{getCategoryProgress(cat.slug).score || 0}</span>
            </div>
          ))}
        </div>

        <div className="ss-total-row">
          <div className="ss-total-card">
            <span>Total Score</span>
            <strong>{totalScore}</strong>
          </div>
          <div className="ss-total-card ss-highest">
            <span>Highest Score</span>
            <strong>{progress.highestScore}</strong>
          </div>
        </div>

        <button onClick={() => navigate('/')} className="ss-home-btn">
          Back to Home
        </button>
      </div>
    </div>
  );
}

const styles = `
.ss-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 32rem),
    radial-gradient(circle at bottom right, rgba(124, 58, 237, 0.12), transparent 34rem),
    linear-gradient(135deg, #f8fbff 0%, #eef6ff 48%, #f7f4ff 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #0f172a;
}

.ss-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 34px;
  max-width: 560px;
  width: 100%;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  border-top: 5px solid #2563eb;
}

.ss-header {
  margin-bottom: 24px;
  text-align: center;
}

.ss-header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1d4ed8, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ss-subtitle {
  color: #64748b;
  margin-top: 6px;
}

.ss-scores-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 22px;
}

.ss-score-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid var(--accent);
  border-radius: 8px;
  padding: 14px;
}

.ss-cat-icon {
  font-size: 0.86rem;
  font-weight: 800;
}

.ss-cat-name {
  flex: 1;
  font-weight: 700;
}

.ss-cat-val {
  font-size: 1.3rem;
  font-weight: 800;
}

.ss-total-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 22px;
}

.ss-total-card {
  background: #0f172a;
  color: white;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
}

.ss-total-card span {
  font-size: 0.84rem;
  font-weight: 700;
  opacity: 0.85;
}

.ss-total-card strong {
  font-size: 1.9rem;
  font-weight: 800;
}

.ss-highest {
  background: #1d4ed8;
}

.ss-home-btn {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 13px 26px;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
}

.ss-home-btn:hover {
  background: linear-gradient(135deg, #1d4ed8, #4338ca);
}

@media (max-width: 480px) {
  .ss-scores-grid,
  .ss-total-row {
    grid-template-columns: 1fr;
  }

  .ss-card {
    padding: 24px;
  }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById("ss-styles");
  if (existing) existing.remove();
  const s = document.createElement("style");
  s.id = "ss-styles";
  s.innerText = styles;
  document.head.appendChild(s);
}
