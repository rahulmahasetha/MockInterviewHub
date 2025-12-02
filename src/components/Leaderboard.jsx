import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";

export default function Leaderboard() {
  const { progress } = useUserProgress();
  const navigate = useNavigate();

  const totalScore =
    (progress.science?.score || 0) +
    (progress.jungle?.score || 0) +
    (progress.math?.score || 0) +
    (progress.history?.score || 0);

  const sections = [
    { name: "Science", icon: "🔬", color: "#4CAF50", data: progress.science },
    { name: "Jungle", icon: "🐾", color: "#FF9800", data: progress.jungle },
    { name: "Math", icon: "➗", color: "#2196F3", data: progress.math },
    { name: "History", icon: "🏛", color: "#9C27B0", data: progress.history }
  ];

  const completedSections = sections.filter(sec => sec.data?.passed?.length > 0).length;
  const totalSections = sections.length;
  const completionPercentage = (completedSections / totalSections) * 100;

  const handleContinueLearning = () => {
    // Navigate to home page where user can choose category
    navigate('/');
  };

  return (
    <div className="leaderboard-container">
      {/* Header Section */}
      <header className="leaderboard-header">
        <div className="header-content">
          <div className="title-section">
            <span className="trophy-icon">🏆</span>
            <div>
              <h1>Learning Leaderboard</h1>
              <p className="subtitle">Track your learning journey and achievements</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="leaderboard-main">
        {/* Overview Section - Medium Size Cards */}
        <section className="overview-section">
          <div className="overview-grid">
            {/* Total Score Card */}
            <div className="total-score-card">
              <div className="score-header">
                <span className="score-icon">⭐</span>
                <h3>Total Score</h3>
              </div>
              <div className="score-value">{totalScore}</div>
              <div className="score-max">/ 800</div>
              <div className="progress-info">
                <div className="progress-text">
                  {Math.round((totalScore / 800) * 100)}% Complete
                </div>
              </div>
            </div>

            {/* Highest Score Card */}
            <div className="highest-score-card">
              <div className="score-header">
                <span className="score-icon">🔥</span>
                <h3>Highest Score</h3>
              </div>
              <div className="highest-value">{progress.highestScore || 0}</div>
              <div className="achievement-badge">
                {progress.highestScore >= 700 ? "🏆 Master" : 
                 progress.highestScore >= 600 ? "⭐ Advanced" :
                 progress.highestScore >= 400 ? "🚀 Intermediate" :
                 progress.highestScore >= 200 ? "🌱 Beginner" : "🎯 Newbie"}
              </div>
            </div>

            {/* Completion Stats */}
            <div className="completion-card">
              <div className="score-header">
                <span className="score-icon">📊</span>
                <h3>Progress</h3>
              </div>
              <div className="completion-stats">
                <div className="stat-item">
                  <div className="stat-value">{completedSections}</div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{totalSections}</div>
                  <div className="stat-label">Total</div>
                </div>
              </div>
              <div className="completion-text">
                {Math.round(completionPercentage)}% Complete
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section - Horizontal Layout */}
        <section className="categories-section">
          <div className="section-header">
            <h2>Category Performance</h2>
            <p>Your progress across different learning adventures</p>
          </div>

          <div className="categories-horizontal">
            {sections.map((section) => {
              const sectionData = section.data || {};
              const completedLevels = sectionData.passed?.length || 0;
              const totalLevels = 10;
              const sectionScore = sectionData.score || 0;
              const progressPercentage = (completedLevels / totalLevels) * 100;

              return (
                <div 
                  key={section.name} 
                  className="category-card-horizontal"
                  style={{ '--card-color': section.color }}
                >
                  <div className="card-main">
                    <div className="category-icon-large">{section.icon}</div>
                    <div className="category-info">
                      <h3 className="category-name">{section.name}</h3>
                      <div className="level-info">
                        Levels: {completedLevels}/{totalLevels}
                      </div>
                    </div>
                    <div className="score-display">
                      <div className="score-number">{sectionScore}</div>
                      <div className="score-label">points</div>
                    </div>
                  </div>
                  
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${progressPercentage}%`,
                          backgroundColor: section.color
                        }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {Math.round(progressPercentage)}% Complete
                    </div>
                  </div>

                  <div className="status-section">
                    {completedLevels === totalLevels ? (
                      <span className="status completed">✅ Completed</span>
                    ) : completedLevels > 0 ? (
                      <span className="status in-progress">🔄 In Progress</span>
                    ) : (
                      <span className="status not-started">🎯 Start Now</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Action Section */}
        <section className="action-section">
          <div className="action-buttons">
            <button
              onClick={() => navigate('/')}
              className="home-button"
            >
              <span className="button-icon">🏠</span>
              Back to Home
            </button>
            <button
              onClick={handleContinueLearning}
              className="continue-button"
            >
              <span className="button-icon">🎮</span>
              Continue Learning
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

// CSS Styles
const styles = `
.leaderboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Poppins', sans-serif;
  padding-bottom: 40px;
}

.leaderboard-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 25px 0;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
  text-align: center;
}

.trophy-icon {
  font-size: 3rem;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
}

.title-section h1 {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  margin: 8px 0 0 0;
  font-size: 1.1rem;
  color: #666;
  font-weight: 300;
}

.leaderboard-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Overview Section - Medium Size Cards */
.overview-section {
  margin-bottom: 40px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.total-score-card, .highest-score-card, .completion-card {
  background: white;
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  text-align: center;
  transition: transform 0.3s ease;
}

.total-score-card:hover, .highest-score-card:hover, .completion-card:hover {
  transform: translateY(-5px);
}

.score-header {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 15px;
}

.score-icon {
  font-size: 1.5rem;
}

.score-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  font-weight: 600;
}

.total-score-card .score-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: #4CAF50;
  margin-bottom: 5px;
}

.score-max {
  font-size: 1rem;
  color: #666;
  margin-bottom: 15px;
}

.progress-info {
  margin-top: 10px;
}

.progress-text {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
}

.highest-value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #FF6B35;
  margin-bottom: 15px;
}

.achievement-badge {
  background: linear-gradient(135deg, #FF6B35, #FF8E53);
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-block;
}

.completion-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.completion-text {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
}

/* Categories Section - Horizontal Layout */
.categories-section {
  margin-bottom: 40px;
}

.section-header {
  text-align: center;
  margin-bottom: 30px;
}

.section-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.section-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  font-weight: 300;
}

.categories-horizontal {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.category-card-horizontal {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.category-card-horizontal:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
  border-color: var(--card-color);
}

.card-main {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.category-icon-large {
  font-size: 2.2rem;
  flex-shrink: 0;
}

.category-info {
  flex: 1;
}

.category-name {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.level-info {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.score-display {
  text-align: center;
  flex-shrink: 0;
}

.score-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--card-color);
  margin-bottom: 2px;
}

.score-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.progress-section {
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
  text-align: center;
}

.status-section {
  text-align: center;
}

.status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
}

.status.completed {
  background: #E8F5E8;
  color: #2E7D32;
}

.status.in-progress {
  background: #E3F2FD;
  color: #1565C0;
}

.status.not-started {
  background: #FFF3E0;
  color: #EF6C00;
}

/* Action Section */
.action-section {
  text-align: center;
  margin-top: 30px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.home-button, .continue-button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.home-button {
  background: white;
  color: #333;
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
}

.continue-button {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
}

.home-button:hover, .continue-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.button-icon {
  font-size: 1.1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .categories-horizontal {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
}

@media (max-width: 768px) {
  .leaderboard-header {
    padding: 20px 0;
    margin-bottom: 20px;
  }
  
  .title-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .title-section h1 {
    font-size: 1.8rem;
  }
  
  .trophy-icon {
    font-size: 2.5rem;
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    max-width: 400px;
  }
  
  .categories-horizontal {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
  
  .section-header h2 {
    font-size: 1.5rem;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .home-button, .continue-button {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .leaderboard-main {
    padding: 0 15px;
  }
  
  .total-score-card, .highest-score-card, .completion-card, .category-card-horizontal {
    padding: 20px;
  }
  
  .total-score-card .score-value {
    font-size: 2rem;
  }
  
  .highest-value {
    font-size: 1.8rem;
  }
  
  .card-main {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .category-info {
    text-align: center;
  }
}
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}