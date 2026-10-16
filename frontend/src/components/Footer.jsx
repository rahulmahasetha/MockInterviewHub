import React from 'react';
import { Link } from 'react-router-dom';
import { useUserProgress } from '../context/UserProgressContext';

export default function Footer({ setActiveNav, navigate }) {
  const { requireAuth } = useUserProgress();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (navKey) => {
    if (setActiveNav) {
      setActiveNav(navKey);
      scrollToTop();
    }
  };

  return (
    <footer className="hd-app-footer">
      {/* Top Highlights Banner */}
      <div className="footer-highlights-banner">
        <div className="highlight-item">
          <span className="hl-icon">⚡</span>
          <div>
            <strong>Real-Time AI Evaluation</strong>
            <p>Instant scoring on technical accuracy & communication</p>
          </div>
        </div>
        <div className="highlight-item">
          <span className="hl-icon">📄</span>
          <div>
            <strong>ATS & Resume Tailored</strong>
            <p>Interview questions mapped to your actual projects</p>
          </div>
        </div>
        <div className="highlight-item">
          <span className="hl-icon">🛡️</span>
          <div>
            <strong>Proctored Environment</strong>
            <p>Camera, tab-switch & multi-person proctoring checks</p>
          </div>
        </div>
        <div className="highlight-item">
          <span className="hl-icon">🏆</span>
          <div>
            <strong>Gamified Learning</strong>
            <p>Earn practice coins, level streaks & climb leaderboard</p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="footer-main-grid">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <div className="footer-logo">
            <span className="f-logo-icon">🎓</span>
            <span className="f-logo-text">MockInterviewHub</span>
          </div>
          <p className="footer-brand-desc">
            The next-generation career preparation platform combining adaptive technical mock interviews,
            real-time AI proctoring, resume evaluations, and verified performance analytics.
          </p>
          <div className="footer-system-status">
            <span className="status-ping"></span>
            <span className="status-text">All AI Services Operational • Models v2.4</span>
          </div>
        </div>

        {/* Practice Tracks */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Practice Tracks</h4>
          <ul className="footer-links-list">
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => {
                  requireAuth('/interview', () => navigate('/interview'), {
                    title: 'Sign in to Start Technical Interview',
                    subtitle: 'Sign in or create an account to start your technical mock interview.'
                  });
                }}
              >
                💻 Technical Mock Interview
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => {
                  requireAuth('/resume-interview', () => navigate('/resume-interview'), {
                    title: 'Sign in to Start Resume-Based Interview',
                    subtitle: 'Sign in or create an account to start your resume interview.'
                  });
                }}
              >
                📄 AI Resume Interview
              </button>
            </li>
            <li>
              <Link to="/resume-builder">📝 ATS Resume Builder</Link>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn" 
                onClick={() => handleNavClick('all')}
              >
                🧠 Daily Quiz Challenges
              </button>
            </li>
          </ul>
        </div>

        {/* Platform & Navigation */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Platform</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/leaderboard">🏆 Global Leaderboard</Link>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn" 
                onClick={() => {
                  requireAuth('profile', () => handleNavClick('profile'), {
                    title: 'Sign in to View Profile',
                    subtitle: 'Sign in or create an account to view your career readiness and interview history.'
                  });
                }}
              >
                📊 Performance Profile
              </button>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn" 
                onClick={() => handleNavClick('dashboard')}
              >
                🪙 Rewards & Coin Hub
              </button>
            </li>
            <li>
              <Link to="/interview">🛡️ Pre-Interview Check</Link>
            </li>
          </ul>
        </div>

        {/* Skill Domains */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Skill Domains</h4>
          <ul className="footer-links-list">
            <li>
              <button 
                type="button" 
                className="footer-link-btn" 
                onClick={() => handleNavClick('fe')}
              >
                ⚛️ Frontend & React
              </button>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn" 
                onClick={() => handleNavClick('be')}
              >
                🚀 Backend & Node.js
              </button>
            </li>
            <li>
              <button 
                type="button" 
                className="footer-link-btn" 
                onClick={() => handleNavClick('prog')}
              >
                🐍 Core Programming
              </button>
            </li>
            <li>
              <span className="footer-tag-highlight">500+ Practice Questions</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-left">
          <span>© {new Date().getFullYear()} MockInterviewHub. All rights reserved.</span>
          <span className="footer-dot-divider">•</span>
          <span>Crafted for engineers aspiring for top tech roles.</span>
        </div>
        <div className="footer-bottom-right">
          <button type="button" className="footer-back-to-top" onClick={scrollToTop}>
            ↑ Back to Top
          </button>
        </div>
      </div>
    </footer>
  );
}
