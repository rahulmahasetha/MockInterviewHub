import React from 'react';
import { Link } from 'react-router-dom';
import { useUserProgress } from '../context/UserProgressContext';
import {
  FiZap, FiFileText, FiShield, FiAward,
  FiMonitor, FiLayers, FiServer, FiSettings,
  FiBarChart2, FiCode, FiGlobe, FiArrowUp,
  FiUser, FiGift
} from 'react-icons/fi';
import { MdOutlinePsychology, MdSecurity } from 'react-icons/md';
import { SiDocker } from 'react-icons/si';

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

  const highlights = [
    {
      icon: <FiZap className="hl-icon" />,
      title: 'Real-Time AI Evaluation',
      desc: 'Instant scoring on technical accuracy & communication'
    },
    {
      icon: <FiFileText className="hl-icon" />,
      title: 'ATS & Resume Tailored',
      desc: 'Interview questions mapped to your actual projects'
    },
    {
      icon: <FiShield className="hl-icon" />,
      title: 'Proctored Environment',
      desc: 'Camera, tab-switch & multi-person proctoring checks'
    },
    {
      icon: <FiAward className="hl-icon" />,
      title: 'Gamified Learning',
      desc: 'Earn practice coins, level streaks & climb leaderboard'
    }
  ];

  const skillTracks = [
    { id: 'fe', label: 'Frontend Engineering', icon: <FiLayers size={13} /> },
    { id: 'be', label: 'Backend & APIs', icon: <FiServer size={13} /> },
    { id: 'core', label: 'Core CS (OS, DBMS, CN)', icon: <FiSettings size={13} /> },
    { id: 'devops', label: 'DevOps & Docker / K8s', icon: <SiDocker size={12} /> },
    { id: 'ai', label: 'AI, ML & Deep Learning', icon: <MdOutlinePsychology size={14} /> },
    { id: 'security', label: 'Cyber Security Defense', icon: <MdSecurity size={14} /> },
  ];

  return (
    <footer className="hd-app-footer">
      {/* Highlights Banner */}
      <div className="footer-highlights-banner">
        {highlights.map((h, i) => (
          <div key={i} className="highlight-item">
            {h.icon}
            <div>
              <strong>{h.title}</strong>
              <p>{h.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Footer Grid */}
      <div className="footer-main-grid">
        {/* Brand Column */}
        <div className="footer-brand-col">
          <div className="footer-logo">
            <FiAward className="f-logo-icon" color="#60a5fa" size={24} />
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
                <FiMonitor size={13} /> Technical Mock Interview
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
                <FiFileText size={13} /> AI Resume Interview
              </button>
            </li>
            <li>
              <Link to="/resume-builder" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiFileText size={13} /> ATS Resume Builder
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavClick('all')}
              >
                <FiCode size={13} /> Daily Quiz Challenges
              </button>
            </li>
          </ul>
        </div>

        {/* Platform Links */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Platform</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/leaderboard" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiAward size={13} /> Global Leaderboard
              </Link>
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
                <FiBarChart2 size={13} /> Performance Profile
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavClick('dashboard')}
              >
                <FiGift size={13} /> Rewards & Coin Hub
              </button>
            </li>
            <li>
              <Link to="/interview" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiShield size={13} /> Pre-Interview Check
              </Link>
            </li>
          </ul>
        </div>

        {/* Skill Tracks */}
        <div className="footer-links-col">
          <h4 className="footer-col-title">Skill Tracks</h4>
          <ul className="footer-links-list">
            {skillTracks.map(track => (
              <li key={track.id}>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => handleNavClick(track.id)}
                >
                  {track.icon} {track.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => handleNavClick('all')}
                style={{ fontWeight: 600, color: '#60a5fa' }}
              >
                <FiGlobe size={13} /> View All 10 Tracks →
              </button>
            </li>
            <li>
              <span className="footer-tag-highlight">10 Tracks • 36 Quizzes • 360 Levels</span>
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
            <FiArrowUp size={14} /> Back to Top
          </button>
        </div>
      </div>
    </footer>
  );
}
