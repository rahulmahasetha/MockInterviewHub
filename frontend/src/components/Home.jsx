import React, { useState } from "react";
import { FaTrophy, FaBook, FaSync, FaHome, FaChartBar } from 'react-icons/fa';

import { Link } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";
//<FaTrophy className="nav-icon" />
<FaBook className="nav-icon" />

export default function Home() {
  const { progress, resetProgress, loginUser, logoutUser } = useUserProgress();
  const [showInstructions, setShowInstructions] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalScore =
    (progress.science?.score || 0) +
    (progress.jungle?.score || 0) +
    (progress.math?.score || 0) +
    (progress.history?.score || 0);

  const completedSections = [
    (progress.science?.passed?.length || 0) > 0,
    (progress.jungle?.passed?.length || 0) > 0,
    (progress.math?.passed?.length || 0) > 0,
    (progress.history?.passed?.length || 0) > 0
  ].filter(Boolean).length;

  const progressPercentage = (completedSections / 4) * 100;

  // Check if all sections are completed (score 440)
  const isAllCompleted = totalScore === 440;
  const remainingSections = 4 - completedSections;

  const categories = [
    { path: "/playground/science", name: "Science", icon: "🔬", color: "#4CAF50", description: "Explore scientific wonders and discoveries" },
    { path: "/playground/jungle", name: "Jungle", icon: "🐾", color: "#FF9800", description: "Discover wildlife and nature mysteries" },
    { path: "/playground/math", name: "Math", icon: "➗", color: "#2196F3", description: "Solve mathematical puzzles and challenges" },
    { path: "/playground/history", name: "History", icon: "🏛", color: "#9C27B0", description: "Journey through historical events and figures" }
  ];

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all your progress? This action cannot be undone.")) {
      resetProgress();
    }
  };

  return (
    <div className="home-container">
      {/* Nickname / Login Modal */}
      {!progress.username && (
        <div className="instructions-overlay" style={{ zIndex: 1100 }}>
          <div className="instructions-modal" style={{ maxWidth: "450px", textAlign: "center" }}>
            <div className="modal-header" style={{ justifyContent: "center" }}>
              <h2>🎮 Enter Your Nickname</h2>
            </div>
            <div className="instructions-content" style={{ marginTop: "15px" }}>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Embark on your EduQuest adventure! Enter a username to store your progress and leaderboard scores in MongoDB.
              </p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!nicknameInput.trim()) return alert("Please enter a valid nickname!");
                setIsSubmitting(true);
                await loginUser(nicknameInput.trim());
                setIsSubmitting(false);
              }}>
                <input
                  type="text"
                  placeholder="e.g. CaptainQuest"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: "25px",
                    border: "2px solid #e9ecef",
                    fontSize: "1rem",
                    marginBottom: "20px",
                    outline: "none",
                    textAlign: "center",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="start-button"
                  style={{ width: "100%", padding: "12px" }}
                >
                  {isSubmitting ? "Connecting..." : "Begin Quest 🚀"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <div className="modal-header">
              <h2>🎮 Game Instructions</h2>
              <button 
                onClick={() => setShowInstructions(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            
            <div className="instructions-content">
              <div className="instruction-points">
                <div className="instruction-item">
                  <span className="point-icon">🎯</span>
                  <div className="point-content">
                    <h4>Choose Your Adventure</h4>
                    <p>Select from 4 different categories: Science, Jungle, Math, and History</p>
                  </div>
                </div>
                
                <div className="instruction-item">
                  <span className="point-icon">📝</span>
                  <div className="point-content">
                    <h4>Complete Levels</h4>
                    <p>Each category has 10 levels. Complete them in sequence to unlock new challenges</p>
                  </div>
                </div>
                
                <div className="instruction-item">
                  <span className="point-icon">⭐</span>
                  <div className="point-content">
                    <h4>Earn Points</h4>
                    <p>Answer questions correctly to earn points. Each category has a maximum of 110 points</p>
                  </div>
                </div>
                
                <div className="instruction-item">
                  <span className="point-icon">🏆</span>
                  <div className="point-content">
                    <h4>Achieve Mastery</h4>
                    <p>Complete all categories with perfect scores to become a Master Adventurer!</p>
                  </div>
                </div>
                
                <div className="instruction-item">
                  <span className="point-icon">🔒</span>
                  <div className="point-content">
                    <h4>Progressive Unlocking</h4>
                    <p>Levels unlock sequentially. Complete one level to access the next</p>
                  </div>
                </div>
                
                <div className="instruction-item">
                  <span className="point-icon">📊</span>
                  <div className="point-content">
                    <h4>Track Progress</h4>
                    <p>Monitor your progress through progress bars and achievement badges</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="start-button"
                >
                  Let's Start Learning!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="home-navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <span className="nav-icon">🌟</span>
            <span className="nav-title">EduQuest</span>
          </div>
          
          <div className="nav-controls">
            {progress.username && (
              <span className="user-badge-nav" style={{ marginRight: '5px' }}>
                👤 {progress.username}
              </span>
            )}

            <button 
              onClick={() => setShowInstructions(true)}
              className="nav-btn instructions-btn"
            >
              <span className="btn-icon">📖</span>
              <span className="btn-text">Instructions</span>
            </button>
            
            <Link to="/leaderboard" className="nav-btn leaderboard-btn">
              <span className="btn-icon">🏆</span>
              <span className="btn-text">Leaderboard</span>
            </Link>
            
            <button onClick={handleReset} className="nav-btn reset-btn">
              <span className="btn-icon">🔄</span>
              <span className="btn-text">Reset</span>
            </button>

            {progress.username && (
              <button onClick={logoutUser} className="nav-btn logout-btn" style={{ marginLeft: '5px' }}>
                <span className="btn-icon">🚪</span>
                <span className="btn-text">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="home-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            
            <h1 className="hero-title">Choose Your Quest</h1>
            <p className="hero-subtitle">
              {isAllCompleted ? (
                <span className="completed-message">🎉 Master Adventurer! You've conquered all quests!</span>
              ) : (
                "Embark on an educational journey through exciting subjects"
              )}
            </p>
          </div>
        </section>

        {/* Categories Section - Compact Horizontal Layout */}
        <section className="categories-section">
          <div className="section-header">
            <h2 className="section-title">Learning Quests</h2>
            <p className="section-subtitle">Select a quest to begin your adventure</p>
          </div>
          
          <div className="categories-compact">
            {categories.map((category) => {
              const categoryProgress = progress[category.name.toLowerCase()];
              const completedLevels = categoryProgress?.passed?.length || 0;
              const totalLevels = 10;
              const isCategoryCompleted = completedLevels === totalLevels;
              const categoryScore = categoryProgress?.score || 0;
              const maxCategoryScore = 110;
              const progressPercentage = (completedLevels / totalLevels) * 100;
              
              return (
                <Link
                  key={category.name}
                  to={category.path}
                  className={`category-card-compact ${isCategoryCompleted ? 'completed' : ''}`}
                  style={{ '--card-color': category.color }}
                >
                  <div className="card-header-compact">
                    <div className="category-icon-compact">{category.icon}</div>
                    <div className="category-info-compact">
                      <h3 className="category-name">{category.name}</h3>
                      <p className="category-description">{category.description}</p>
                    </div>
                    <div className="completion-indicator">
                      {isCategoryCompleted ? (
                        <span className="completion-badge completed">✅</span>
                      ) : completedLevels > 0 ? (
                        <span className="completion-badge in-progress">{completedLevels}/10</span>
                      ) : (
                        <span className="completion-badge not-started">🎯</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="progress-compact">
                    <div className="progress-info-compact">
                      <span className="score-text">{categoryScore} pts</span>
                      <span className="progress-text">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="progress-bar-compact">
                      <div 
                        className="progress-fill-compact"
                        style={{ 
                          width: `${progressPercentage}%`,
                          backgroundColor: category.color
                        }}
                      ></div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Progress Overview - Compact Design */}
        <section className="progress-overview-compact">
          <div className="progress-header-compact">
            <h2>Adventure Progress</h2>
            <div className="progress-badge-compact">
              {completedSections}/4 Quests
            </div>
          </div>
          
          <div className="progress-cards-compact">
            <div className="progress-item-compact">
              <div className="progress-icon">📈</div>
              <div className="progress-details">
                <div className="progress-value">{totalScore}</div>
                <div className="progress-label">Total Score</div>
              </div>
            </div>
            
            <div className="progress-item-compact">
              <div className="progress-icon">🔥</div>
              <div className="progress-details">
                <div className="progress-value">{progress.highestScore || 0}</div>
                <div className="progress-label">Highest Score</div>
              </div>
            </div>
            
            <div className="progress-item-compact">
              <div className="progress-icon">⏱️</div>
              <div className="progress-details">
                <div className="progress-value">
                  {isAllCompleted ? '100%' : `${Math.round(progressPercentage)}%`}
                </div>
                <div className="progress-label">Completion</div>
              </div>
            </div>
          </div>
          
          <div className="overall-progress-bar">
            <div 
              className="overall-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer-compact">
        <div className="footer-content-compact">
          <div className="footer-brand">
            <span className="footer-icon">🌟</span>
            <span className="footer-title">EduQuest</span>
          </div>
          <div className="footer-tagline">
            Embark on your learning adventure today!
          </div>
          <div className="footer-copyright">
            &copy; 2024 EduQuest. Crafted with ❤️ for learners
          </div>
        </div>
      </footer>
    </div>
  );
}

// CSS Styles
const styles = `
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Poppins', sans-serif;
  display: flex;
  flex-direction: column;
}

/* Instructions Modal */
.instructions-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.instructions-modal {
  background: white;
  border-radius: 20px;
  padding: 30px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
  font-weight: 700;
}

.close-button {
  background: #f8f9fa;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  color: #666;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: #e9ecef;
  color: #333;
}

.instruction-points {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.instruction-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 12px;
  border-left: 4px solid #667eea;
}

.point-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.point-content h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.point-content p {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
  line-height: 1.5;
}

.modal-actions {
  text-align: center;
}

.start-button {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(76, 175, 80, 0.4);
}

/* Navbar */
.home-navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 0;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-icon {
  font-size: 1.3rem;
}

.nav-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 2px solid #e9ecef;
  border-radius: 16px;
  font-weight: 500;
  font-size: 0.8rem;
  transition: all 0.3s ease;
  text-decoration: none;
  background: white;
  color: #495057;
}

.instructions-btn:hover {
  border-color: #2196F3;
  background: #E3F2FD;
  transform: translateY(-1px);
}

.leaderboard-btn:hover {
  border-color: #FFD700;
  background: #FFF9C4;
  transform: translateY(-1px);
}

.reset-btn {
  border-color: #ff6b6b;
  background: white;
  color: #495057;
  cursor: pointer;
}

.reset-btn:hover {
  border-color: #ff6b6b;
  background: #ff6b6b;
  color: white;
  transform: translateY(-1px);
}

.user-badge-nav {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 6px 14px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.8rem;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
}

.logout-btn {
  border-color: #ff6b6b;
  background: white;
  color: #ff6b6b;
  cursor: pointer;
}

.logout-btn:hover {
  border-color: #ff4747;
  background: #fff5f5;
  color: #ff4747;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 0.8rem;
}

/* Main Content */
.home-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Hero Section */
.hero-section {
  text-align: center;
  margin-bottom: 30px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 15px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-icon {
  font-size: 1rem;
}

.hero-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: white;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.hero-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 300;
  max-width: 500px;
  margin: 0 auto;
}

.completed-message {
  color: #FFD700;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

/* Categories Section - Compact Horizontal Layout */
.categories-section {
  margin-bottom: 30px;
}

.section-header {
  text-align: center;
  margin-bottom: 25px;
}

.section-title {
  color: white;
  font-size: 1.5rem;
  margin-bottom: 8px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  font-weight: 300;
}

.categories-compact {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.category-card-compact {
  background: white;
  border-radius: 12px;
  padding: 15px;
  text-decoration: none;
  color: #333;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
}

.category-card-compact:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: var(--card-color);
}

.category-card-compact.completed {
  border-color: #4CAF50;
  background: linear-gradient(135deg, #fff, #f8fff8);
}

.card-header-compact {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.category-icon-compact {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.category-info-compact {
  flex: 1;
}

.category-name {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.category-description {
  margin: 0;
  font-size: 0.75rem;
  color: #666;
  line-height: 1.3;
}

.completion-indicator {
  flex-shrink: 0;
}

.completion-badge {
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.completion-badge.completed {
  background: #E8F5E8;
  color: #2E7D32;
}

.completion-badge.in-progress {
  background: #E3F2FD;
  color: #1565C0;
}

.completion-badge.not-started {
  background: #FFF3E0;
  color: #EF6C00;
}

.progress-compact {
  margin-top: auto;
}

.progress-info-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #666;
}

.progress-bar-compact {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill-compact {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Progress Overview - Compact Design */
.progress-overview-compact {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.progress-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.progress-header-compact h2 {
  margin: 0;
  font-size: 1.2rem;
  color: white;
  font-weight: 600;
}

.progress-badge-compact {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.progress-cards-compact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.progress-item-compact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.progress-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.progress-details {
  flex: 1;
}

.progress-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: white;
  margin-bottom: 2px;
}

.progress-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.overall-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.overall-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* Footer */
.home-footer-compact {
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  padding: 20px;
  margin-top: auto;
}

.footer-content-compact {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 8px;
}

.footer-icon {
  font-size: 1.1rem;
}

.footer-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.footer-tagline {
  font-size: 0.85rem;
  opacity: 0.9;
  margin-bottom: 8px;
}

.footer-copyright {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .categories-compact {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    gap: 12px;
  }
  
  .nav-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .hero-title {
    font-size: 1.8rem;
  }
  
  .categories-compact {
    grid-template-columns: 1fr;
  }
  
  .progress-cards-compact {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .instructions-modal {
    padding: 20px;
    margin: 10px;
  }
}

@media (max-width: 480px) {
  .home-main {
    padding: 15px;
  }
  
  .hero-title {
    font-size: 1.6rem;
  }
  
  .category-card-compact {
    padding: 12px;
  }
  
  .card-header-compact {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .completion-indicator {
    align-self: center;
  }
  
  .progress-item-compact {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
}
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}