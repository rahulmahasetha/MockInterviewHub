import React, { useEffect, useState } from "react";
import { FaBook, FaTrophy, FaSync, FaSignOutAlt } from 'react-icons/fa';
import { Link } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";
import { quizAPI } from "../services/api";

export default function Home() {
  const { progress, resetProgress, signInUser, signUpUser, logoutUser, getTotalScore, getCategoryProgress, forgotPasswordUser } = useUserProgress();
  const [showInstructions, setShowInstructions] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const totalScore = getTotalScore();
  const completedSections = categories.filter((category) => getCategoryProgress(category.slug).passed?.length > 0).length;
  const totalSections = categories.length || 1;

  const progressPercentage = (completedSections / totalSections) * 100;
  const isAllCompleted = categories.length > 0 && completedSections === categories.length;

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all your progress? This action cannot be undone.")) {
      resetProgress();
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();
    
    setIsSubmitting(true);
    if (activeTab === "signin") {
      if (!trimmedUser || !trimmedPass) {
        setIsSubmitting(false);
        return alert("Please fill in all fields.");
      }
      await signInUser(trimmedUser, trimmedPass);
    } else if (activeTab === "signup") {
      if (!trimmedUser || !trimmedEmail || !trimmedPass) {
        setIsSubmitting(false);
        return alert("Please fill in all fields.");
      }
      await signUpUser(trimmedUser, trimmedEmail, trimmedPass);
    } else if (activeTab === "forgot") {
      if (!trimmedUser || !trimmedEmail || !trimmedPass) {
        setIsSubmitting(false);
        return alert("Please fill in all fields.");
      }
      await forgotPasswordUser(trimmedUser, trimmedEmail, trimmedPass);
    }
    setIsSubmitting(false);
  };

  if (!progress.username) {
    return (
      <div className="auth-fullscreen-container app-shell">
        <div className="auth-card">
          <div className="auth-logo">
            <h1>EduQuest</h1>
            <p className="logo-tagline">Professional MCQ practice for focused learning</p>
          </div>

          {activeTab !== 'forgot' ? (
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => { setActiveTab('signin'); setUsername(''); setEmail(''); setPassword(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => { setActiveTab('signup'); setUsername(''); setEmail(''); setPassword(''); }}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="auth-tabs">
              <button
                type="button"
                className="auth-tab active"
                onClick={() => { setActiveTab('signin'); setUsername(''); setEmail(''); setPassword(''); }}
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                className="auth-input"
                required
              />
            </div>

            {(activeTab === 'signup' || activeTab === 'forgot') && (
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="auth-input"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">{activeTab === 'forgot' ? 'New Password' : 'Password'}</label>
                {activeTab === 'signin' && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    onClick={() => { setActiveTab('forgot'); setUsername(''); setEmail(''); setPassword(''); }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="auth-input"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : activeTab === 'signin' ? "Sign In" : activeTab === 'signup' ? "Create Account" : "Update Password"}
            </button>
          </form>
          <div className="auth-footer-notice">
            <p>Your progress is saved securely.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container app-shell">
      {showInstructions && (
        <div className="instructions-overlay">
          <div className="instructions-modal">
            <div className="modal-header">
              <h2>Game Instructions</h2>
              <button onClick={() => setShowInstructions(false)} className="close-button">Close</button>
            </div>
            <div className="instructions-content">
              {[
                "Choose a programming quiz category.",
                "Complete levels sequentially to unlock new challenges.",
                "Answer questions correctly to earn points.",
                "Complete all categories to finish the full learning path."
              ].map((item, index) => (
                <div className="instruction-item" key={item}>
                  <span className="point-icon">{index + 1}</span>
                  <p>{item}</p>
                </div>
              ))}
              <button onClick={() => setShowInstructions(false)} className="start-button">
                Start Learning
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="top-navbar">
        <div className="nav-brand">
          <span className="nav-title">EduQuest</span>
        </div>

        <div className="nav-controls">
          <div className="user-profile-pill">{progress.username}</div>
          <button onClick={() => setShowInstructions(true)} className="nav-btn">
            <FaBook /> Instructions
          </button>
          <Link to="/leaderboard" className="nav-btn">
            <FaTrophy /> Leaderboard
          </Link>
          <button onClick={handleReset} className="nav-btn reset-btn">
            <FaSync /> Reset
          </button>
          <button onClick={logoutUser} className="nav-btn signout-btn">
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="hero-section">
          <h1 className="hero-heading">Learning Dashboard</h1>
          <p className="hero-subtitle">
            {isAllCompleted ? "All quests completed. Excellent work." : "Choose a category and continue your progress."}
          </p>
        </div>

        <div className="quest-cards-row">
          {categories.map((category) => {
            const categoryProgress = getCategoryProgress(category.slug);
            const completedLevels = categoryProgress?.passed?.length || 0;
            const totalLevels = category.levels?.length || 0;
            const score = categoryProgress?.score || 0;
            const pct = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;

            return (
              <Link to={`/playground/${category.slug}`} key={category.slug} className="quest-card" style={{ "--card-color": category.iconColor }}>
                <div className="quest-icon-container" style={{ background: category.color }}>
                  <span className="quest-icon" style={{ color: category.iconColor }}>{category.label}</span>
                </div>
                <h3 className="quest-title">{category.name}</h3>
                <p className="quest-desc">{category.description}</p>
                <div className="quest-stats">
                  <span>{score} pts</span>
                  <span>{completedLevels}/{totalLevels} levels</span>
                </div>
                <div className="quest-progress-track">
                  <div className="quest-progress-fill" style={{ width: `${pct}%`, background: category.iconColor }}></div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="adventure-progress-section">
          <div className="progress-header">
            <h2>Overall Progress</h2>
            <div className="quest-badge">{completedSections}/{categories.length} Quests</div>
          </div>

          <div className="stat-cards-row">
            <div className="stat-card">
              <div className="stat-icon-wrap"><span className="stat-icon">TS</span></div>
              <div className="stat-info">
                <div className="stat-val">{totalScore}</div>
                <div className="stat-label">Total Score</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap"><span className="stat-icon">HS</span></div>
              <div className="stat-info">
                <div className="stat-val">{progress.highestScore || 0}</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrap"><span className="stat-icon">CP</span></div>
              <div className="stat-info">
                <div className="stat-val">{Math.round(progressPercentage)}%</div>
                <div className="stat-label">Completion</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <div className="footer-logo">EduQuest</div>
        <div className="footer-text">Focused practice. Clear progress.</div>
        <div className="footer-copy">&copy; 2026 EduQuest</div>
      </footer>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 34rem),
    linear-gradient(135deg, #f8fbff 0%, #eef6ff 46%, #f7f4ff 100%);
  color: #0f172a;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.dashboard-container {
  display: flex;
  flex-direction: column;
}

.top-navbar {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  margin: 18px auto 0;
  max-width: 1180px;
  width: calc(100% - 32px);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.nav-title {
  background: linear-gradient(135deg, #1d4ed8, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: 0;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-profile-pill {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.9rem;
}

.nav-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 700;
  font-size: 0.88rem;
  color: #334155;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.reset-btn {
  color: #7c3aed;
  border-color: #ddd6fe;
}

.signout-btn {
  color: #b91c1c;
  border-color: #fecaca;
}

.dashboard-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 36px 16px 24px;
  width: 100%;
}

.hero-section {
  margin-bottom: 28px;
  background: linear-gradient(135deg, #1d4ed8, #4f46e5 52%, #7c3aed);
  color: #ffffff;
  border-radius: 8px;
  padding: 34px;
  box-shadow: 0 18px 38px rgba(37, 99, 235, 0.18);
}

.hero-heading {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
}

.hero-subtitle {
  font-size: 1rem;
  color: #dbeafe;
  margin-top: 8px;
  font-weight: 500;
}

.quest-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(245px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.quest-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 22px;
  color: #0f172a;
  text-decoration: none;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.quest-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 5px;
  background: var(--card-color, #2563eb);
}

.quest-card:hover {
  border-color: var(--card-color, #2563eb);
}

.quest-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

.quest-icon {
  font-size: 1rem;
  font-weight: 800;
}

.quest-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0 0 6px;
}

.quest-desc {
  font-size: 0.92rem;
  color: #64748b;
  margin: 0 0 18px;
  line-height: 1.45;
  flex-grow: 1;
}

.quest-stats {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 0.84rem;
  margin-bottom: 8px;
  color: #475569;
}

.quest-progress-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.quest-progress-fill {
  height: 100%;
  border-radius: 999px;
}

.adventure-progress-section {
  background: linear-gradient(135deg, #ffffff, #f8fbff);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  gap: 12px;
}

.progress-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}

.quest-badge {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 7px 12px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.85rem;
}

.stat-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon-wrap {
  background: #e0f2fe;
  color: #0369a1;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 800;
}

.stat-card:nth-child(1) .stat-icon-wrap {
  background: #dbeafe;
  color: #1d4ed8;
}

.stat-card:nth-child(2) .stat-icon-wrap {
  background: #ede9fe;
  color: #7c3aed;
}

.stat-card:nth-child(3) .stat-icon-wrap {
  background: #dcfce7;
  color: #15803d;
}

.stat-val {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.1;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
}

.dashboard-footer {
  text-align: center;
  padding: 24px 16px 32px;
  color: #64748b;
}

.footer-logo {
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
}

.footer-text,
.footer-copy {
  font-size: 0.82rem;
}

.auth-fullscreen-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.auth-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 34px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.auth-logo {
  margin-bottom: 20px;
  text-align: center;
}

.auth-logo h1 {
  background: linear-gradient(135deg, #1d4ed8, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
}

.logo-tagline {
  font-size: 0.94rem;
  color: #64748b;
  margin: 8px 0 0;
}

.auth-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 4px;
  margin: 20px 0;
}

.auth-tab {
  flex: 1;
  background: transparent;
  border: none;
  color: #475569;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 800;
  font-size: 0.9rem;
}

.auth-tab.active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: #334155;
}

.auth-input {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  color: #0f172a;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  font-size: 0.96rem;
}

.auth-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.password-input-wrapper {
  position: relative;
  width: 100%;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 5px 8px;
  color: #334155;
}

.auth-submit-btn,
.start-button {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  border: none;
  border-radius: 8px;
  padding: 13px;
  color: white;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 4px;
  width: 100%;
}

.auth-submit-btn:hover,
.start-button:hover {
  background: linear-gradient(135deg, #1d4ed8, #4338ca);
}

.auth-submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-footer-notice {
  margin-top: 18px;
  font-size: 0.82rem;
  color: #64748b;
  text-align: center;
}

.instructions-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.instructions-modal {
  background: #ffffff;
  color: #0f172a;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 520px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 14px;
  margin-bottom: 18px;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}

.close-button {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 800;
}

.instruction-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  background: #f8fafc;
  padding: 14px;
  border-radius: 8px;
  align-items: center;
}

.point-icon {
  background: linear-gradient(135deg, #dbeafe, #ede9fe);
  color: #1d4ed8;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 800;
  flex-shrink: 0;
}

.instruction-item p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: #475569;
}

@media (max-width: 768px) {
  .top-navbar {
    flex-direction: column;
    align-items: stretch;
  }

  .nav-controls {
    justify-content: center;
  }

  .hero-heading {
    font-size: 2rem;
  }

  .progress-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById("eduquest-home-styles");
  if (existing) existing.remove();
  const styleSheet = document.createElement("style");
  styleSheet.id = "eduquest-home-styles";
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
