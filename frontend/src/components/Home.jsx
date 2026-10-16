import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { COIN_REWARDS, useUserProgress } from "../context/UserProgressContext";
import { quizAPI, usersAPI } from "../services/api";
import { toast } from "react-toastify";
import ProfileSection from "./ProfileSection";
import Footer from "./Footer";

export default function Home() {
  const {
    progress,
    resetProgress,
    resetCoins,
    signInUser,
    signUpUser,
    logoutUser,
    getTotalScore,
    getCategoryProgress,
    forgotPasswordUser,
    globalLeaderboard,
    fetchGlobalLeaderboard,
    updateUserProfile,
    claimDailyLoginReward,
    requireAuth,
    openAuthModal
  } = useUserProgress();

  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [programmingExpanded, setProgrammingExpanded] = useState(true);
  const [frontendExpanded, setFrontendExpanded] = useState(true);
  const [backendExpanded, setBackendExpanded] = useState(true);
  
  const [activeNav, setActiveNav] = useState("dashboard"); // Default to Dashboard View
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [rewardsHelpOpen, setRewardsHelpOpen] = useState(false);
  const notificationsRef = useRef(null);
  const rewardsHelpRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sidebar Accordion State
  const [sbProgExpanded, setSbProgExpanded] = useState(false);
  const [sbFeExpanded, setSbFeExpanded] = useState(false);
  const [sbBeExpanded, setSbBeExpanded] = useState(false);

  // Profile View States
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
  // Editable fields
  const [profileUsername, setProfileUsername] = useState(progress?.username || "");
  const [profileFullName, setProfileFullName] = useState(progress?.fullName || "");
  const [profileEmail, setProfileEmail] = useState(progress?.email || "");
  const [profilePhoto, setProfilePhoto] = useState(progress?.profilePhoto || "");
  const [collegeName, setCollegeName] = useState(progress?.collegeName || "");
  const [branch, setBranch] = useState(progress?.branch || "");
  const [year, setYear] = useState(progress?.year || "");

  // Secure Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Interview Dashboard History State
  const [interviews, setInterviews] = useState([]);

  // Sync form state when user changes
  useEffect(() => {
    if (progress) {
      setProfileUsername(progress.username || "");
      setProfileFullName(progress.fullName || "");
      setProfileEmail(progress.email || "");
      setProfilePhoto(progress.profilePhoto || "");
      setCollegeName(progress.collegeName || "");
      setBranch(progress.branch || "");
      setYear(progress.year || "");
    }
  }, [progress]);

  // Load interview history
  const loadInterviewHistory = async () => {
    if (progress?.userId) {
      try {
        const { interviewAPI } = await import("../services/api");
        const res = await interviewAPI.getHistory(progress.userId);
        if (res.data?.success) {
          setInterviews(res.data.results || []);
        }
      } catch (err) {
        console.error("Failed to load interview history", err);
      }
    }
  };

  useEffect(() => {
    if (activeNav === 'profile' && progress?.userId) {
      loadInterviewHistory();
    }
  }, [activeNav, progress?.userId]);

  // Photo change handler
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      setProfilePhoto(base64Data);
      
      setIsSubmitting(true);
      const res = await updateUserProfile({ profilePhoto: base64Data });
      setIsSubmitting(false);
      if (res.success) {
        toast.success("Profile photo updated successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Profile form submission
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    // Valid Gmail check
    if (profileEmail && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(profileEmail)) {
      toast.error("Please enter a valid Gmail address (e.g., name@gmail.com).");
      return;
    }

    // Password validation
    if (newPassword) {
      if (!currentPassword) {
        toast.error("Current password is required to change password.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    const updateData = {
      email: profileEmail,
      fullName: profileFullName,
      collegeName,
      branch,
      year
    };

    if (newPassword) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    const res = await updateUserProfile(updateData);
    setIsSubmitting(false);
    
    if (res.success) {
      setIsSettingsModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Close sidebar on route-like navigation (nav clicks)
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const openProfileDetails = () => {
    setActiveNav('profile');
    setIsSettingsModalOpen(false);
    setDropdownOpen(false);
    closeSidebar();
  };

  const openProfileSettings = () => {
    setActiveNav('profile');
    setIsSettingsModalOpen(true);
    setDropdownOpen(false);
    closeSidebar();
  };

  // Close sidebar on escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeSidebar(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeSidebar]);

  // Lock body scroll when sidebar overlay or settings modal is open
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen || isSettingsModalOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen, isSettingsModalOpen]);

  // Close header popovers when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (rewardsHelpRef.current && !rewardsHelpRef.current.contains(e.target)) {
        setRewardsHelpOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setRewardsHelpOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    fetchGlobalLeaderboard();
  }, []);

  // Listen to ?tab=... query param and auto-switch tabs
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'profile') {
      if (progress?.username) {
        setActiveNav('profile');
      } else {
        requireAuth('profile', () => setActiveNav('profile'), {
          title: 'Sign in to View Profile',
          subtitle: 'Sign in or create an account to view your career readiness and interview history.'
        });
      }
    } else if (tab === 'all') {
      setActiveNav('all');
    } else if (tab === 'dashboard') {
      setActiveNav('dashboard');
    }
  }, [location.search, progress?.username]);

  // Listen to custom event from AuthModal or other components
  useEffect(() => {
    const handleSwitchToProfile = () => {
      setActiveNav('profile');
    };
    window.addEventListener('switch-to-profile-tab', handleSwitchToProfile);
    return () => window.removeEventListener('switch-to-profile-tab', handleSwitchToProfile);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const PROGRAMMING_SLUGS = ["science", "jungle", "math", "history"];
  const FRONTEND_SLUGS = ["html", "css", "react"];
  const BACKEND_SLUGS = ["nodejs", "dsa"];

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const programmingCategories = filteredCategories.filter(c => PROGRAMMING_SLUGS.includes(c.slug));
  const frontendCategories = filteredCategories.filter(c => FRONTEND_SLUGS.includes(c.slug));
  const backendCategories = filteredCategories.filter(c => BACKEND_SLUGS.includes(c.slug));

  const totalScore = getTotalScore();
  const completedSections = categories.filter(c => getCategoryProgress(c.slug).passed?.length > 0).length;

  const groupStats = cats => {
    const tLvl = cats.reduce((a, c) => a + (c.levels?.length || 0), 0);
    const cLvl = cats.reduce((a, c) => a + (getCategoryProgress(c.slug).passed?.length || 0), 0);
    const pct = tLvl > 0 ? Math.round((cLvl / tLvl) * 100) : 0;
    return { tLvl, cLvl, pct };
  };

  const prog = groupStats(programmingCategories);
  const fe = groupStats(frontendCategories);
  const be = groupStats(backendCategories);

  const XP = totalScore > 0 ? totalScore : 1200;
  const LEVEL = Math.floor(XP / 200) + 1;
  const coinBalance = progress.coins || 0;
  const coinHistory = progress.coinHistory || [];
  const sortedLeaderboard = [...(globalLeaderboard || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  const leaderboardRank = progress?.username ? (sortedLeaderboard.findIndex(entry => entry.name === progress.username) + 1 || '-') : '-';

  const handleReset = () => {
    if (window.confirm("Reset all progress?")) resetProgress();
  };

  /* ── CATEGORY CARD ── */
  const CategoryCard = ({ category }) => {
    const cp = getCategoryProgress(category.slug);
    const done = cp?.passed?.length || 0;
    const total = category.levels?.length || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isComplete = done === total && total > 0;

    const handleStartQuiz = (e) => {
      e.preventDefault();
      requireAuth(`/playground/${category.slug}`, () => {
        navigate(`/playground/${category.slug}`);
      }, {
        title: 'Sign in to Start Quiz',
        subtitle: `Sign in or create an account to start the ${category.name} challenge.`
      });
    };

    return (
      <div
        onClick={handleStartQuiz}
        className="hd-subcard card-large-premium"
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleStartQuiz(e); }}
      >
        <div className="card-header-premium">
          <div className="card-icon-premium" style={{ background: `${category.color}15`, border: `1px solid ${category.iconColor}30` }}>
            <span style={{ color: category.iconColor, fontWeight: 800, fontSize: '0.85rem' }}>{category.label}</span>
          </div>
          <div className="card-badge-premium" style={{ background: isComplete ? '#ecfdf5' : done > 0 ? '#eff6ff' : '#f1f5f9', color: isComplete ? '#049669' : done > 0 ? '#1d4ed8' : '#475569' }}>
            {done} / {total} Questions
          </div>
        </div>

        <div className="card-body-premium">
          <div className="card-name-premium">{category.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</div>
          <div className="card-desc-premium">{category.description}</div>
        </div>

        <div className="card-footer-premium">
          <div className="progress-section-premium">
            <div className="progress-bar-wrap-premium">
              <div className="progress-bar-fill-premium" style={{ width: `${pct}%`, background: category.iconColor }} />
            </div>
            <span className="progress-label-premium" style={{ color: category.iconColor }}>{pct}%</span>
          </div>

          <div className={`card-cta-premium ${isComplete ? 'complete' : done > 0 ? 'in-progress' : 'not-started'}`} style={{ '--brand-color': category.iconColor }}>
            {isComplete ? 'Completed' : done > 0 ? 'Resume Play' : 'Start Quiz'}
          </div>
        </div>
      </div>
    );
  };

  /* ── GROUP BLOCK ── */
  const GroupBlock = ({ title, subtitle, headerGrad, borderCol, subBg, subBorder, expanded, setExpanded, stats, cats }) => (
    <div className="hd-group" style={{ borderColor: borderCol }}>
      <div
        className="hd-group-header"
        style={{ background: headerGrad }}
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="hd-group-left">
          <div className="hd-group-title">{title}</div>
          <div className="hd-group-sub">{subtitle}</div>
        </div>
        <div className="hd-group-right">
          <span className="hd-group-pct">{stats.pct}%</span>
          <span className="hd-expand-btn">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="hd-group-body" style={{ background: subBg, borderTopColor: subBorder }}>
          <div className="hd-subcards-grid">
            {cats.map(c => <CategoryCard key={c.slug} category={c} />)}
          </div>
        </div>
      )}
    </div>
  );

  /* ── SIDEBAR CONTENT ── */
  const SidebarContent = () => (
    <>
      <nav className="hd-sb-nav">
        <button
          className={`hd-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveNav('dashboard'); closeSidebar(); }}
        >⌂ Dashboard</button>
        
        <button
          className={`hd-nav-item ${activeNav === 'all' ? 'active' : ''}`}
          onClick={() => { setActiveNav('all'); closeSidebar(); }}
        >🗂 All Categories</button>

        <button
          type="button"
          className="hd-nav-item"
          onClick={() => {
            closeSidebar();
            requireAuth('/interview', () => navigate('/interview'), {
              title: 'Sign in to Start Technical Interview',
              subtitle: 'Sign in or create an account to launch your AI-proctored technical interview.'
            });
          }}
          style={{ color: '#059669', fontWeight: 600, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          🤖 Start Technical Interview
        </button>

        <button
          type="button"
          className="hd-nav-item"
          onClick={() => {
            closeSidebar();
            requireAuth('/resume-interview', () => navigate('/resume-interview'), {
              title: 'Sign in to Start Resume-Based Interview',
              subtitle: 'Sign in or create an account to start your resume interview.'
            });
          }}
          style={{ color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          📄 Start Resume-Based Interview
        </button>
        
        <div className="hd-nav-label">Subject Areas</div>
        
        {/* Programming Accordion */}
        <div className="hd-sb-accordion">
          <button
            className={`hd-nav-item hd-accordion-header ${sbProgExpanded ? 'expanded' : ''} ${activeNav === 'prog' ? 'active' : ''}`}
            onClick={() => {
              setSbProgExpanded(!sbProgExpanded);
              setActiveNav('prog');
              setProgrammingExpanded(true);
            }}
          >
            <span className="acc-title">🖋 Programming</span>
            <span className="acc-arrow">{sbProgExpanded ? '▼' : '▶'}</span>
          </button>
          <div className={`hd-accordion-body ${sbProgExpanded ? 'open' : ''}`}>
            <div className="hd-accordion-inner">
              {programmingCategories.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  className="hd-acc-item"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => {
                    closeSidebar();
                    requireAuth(`/playground/${c.slug}`, () => navigate(`/playground/${c.slug}`), {
                      title: 'Sign in to Start Quiz',
                      subtitle: `Sign in or create an account to start the ${c.name} challenge.`
                    });
                  }}
                >
                  <span className="acc-dot" style={{ background: c.iconColor }}></span>
                  <span className="acc-text">{c.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Frontend Accordion */}
        <div className="hd-sb-accordion">
          <button
            className={`hd-nav-item hd-accordion-header ${sbFeExpanded ? 'expanded' : ''} ${activeNav === 'fe' ? 'active' : ''}`}
            onClick={() => {
              setSbFeExpanded(!sbFeExpanded);
              setActiveNav('fe');
              setFrontendExpanded(true);
            }}
          >
            <span className="acc-title">▭ Frontend</span>
            <span className="acc-arrow">{sbFeExpanded ? '▼' : '▶'}</span>
          </button>
          <div className={`hd-accordion-body ${sbFeExpanded ? 'open' : ''}`}>
            <div className="hd-accordion-inner">
              {frontendCategories.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  className="hd-acc-item"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => {
                    closeSidebar();
                    requireAuth(`/playground/${c.slug}`, () => navigate(`/playground/${c.slug}`), {
                      title: 'Sign in to Start Quiz',
                      subtitle: `Sign in or create an account to start the ${c.name} challenge.`
                    });
                  }}
                >
                  <span className="acc-dot" style={{ background: c.iconColor }}></span>
                  <span className="acc-text">{c.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Backend Accordion */}
        <div className="hd-sb-accordion">
          <button
            className={`hd-nav-item hd-accordion-header ${sbBeExpanded ? 'expanded' : ''} ${activeNav === 'be' ? 'active' : ''}`}
            onClick={() => {
              setSbBeExpanded(!sbBeExpanded);
              setActiveNav('be');
              setBackendExpanded(true);
            }}
          >
            <span className="acc-title">◈ Backend</span>
            <span className="acc-arrow">{sbBeExpanded ? '▼' : '▶'}</span>
          </button>
          <div className={`hd-accordion-body ${sbBeExpanded ? 'open' : ''}`}>
            <div className="hd-accordion-inner">
              {backendCategories.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  className="hd-acc-item"
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => {
                    closeSidebar();
                    requireAuth(`/playground/${c.slug}`, () => navigate(`/playground/${c.slug}`), {
                      title: 'Sign in to Start Quiz',
                      subtitle: `Sign in or create an account to start the ${c.name} challenge.`
                    });
                  }}
                >
                  <span className="acc-dot" style={{ background: c.iconColor }}></span>
                  <span className="acc-text">{c.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {!progress?.username && (
          <div className="hd-sidebar-guest-card">
            <div className="hd-guest-badge">Guest Mode</div>
            <p>Sign in to save your coins, quiz scores, and interview streaks.</p>
            <button
              type="button"
              className="hd-guest-signin-btn"
              onClick={() => {
                closeSidebar();
                openAuthModal(null, {
                  title: 'Welcome to MockInterviewHub',
                  subtitle: 'Sign in or create an account to track your progress.'
                });
              }}
            >
              Sign In / Sign Up
            </button>
          </div>
        )}
      </nav>
    </>
  );

  /* ── MAIN RENDER ── */
  return (
    <div className="hd-layout">
      {/* Top Navbar */}
      <header className="hd-top-navbar">
        <div className="hd-nav-left">
          <button className="hd-hamburger-desktop" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
          <div className="hd-logo-nav">
            <span className="hd-logo-icon">🎓</span>
            <span className="hd-logo-text-nav">MockInterviewHub</span>
          </div>
        </div>
        
        <div className="hd-nav-center">
          <div className="hd-search-bar">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search courses, quizzes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="hd-nav-right">
          <button
            type="button"
            className="hd-icon-btn"
            title="Start Resume-Based Interview"
            onClick={() => {
              requireAuth('/resume-interview', () => navigate('/resume-interview'), {
                title: 'Sign in to Start Resume-Based Interview',
                subtitle: 'Sign in or create an account to start your resume interview.'
              });
            }}
          >
            📄
          </button>
          <button
            type="button"
            className="hd-icon-btn"
            title="Start Technical Interview"
            onClick={() => {
              requireAuth('/interview', () => navigate('/interview'), {
                title: 'Sign in to Start Technical Interview',
                subtitle: 'Sign in or create an account to launch your AI-proctored technical interview.'
              });
            }}
          >
            🤖
          </button>
          <Link to="/leaderboard" className="hd-icon-btn" title="Leaderboard">🏆</Link>

          {/* Rewards Help Icon Button & Popover */}
          <div className="hd-popover-wrap" ref={rewardsHelpRef}>
            <button
              className={`hd-icon-btn ${rewardsHelpOpen ? 'active' : ''}`}
              title="Rewards & Coin Rules Help"
              onClick={() => {
                setRewardsHelpOpen(prev => !prev);
                setNotificationsOpen(false);
                setDropdownOpen(false);
              }}
              aria-label="Rewards & Coin Rules Information"
              aria-expanded={rewardsHelpOpen}
            >
              <span style={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1 }}>?</span>
            </button>

            {rewardsHelpOpen && (
              <div className="hd-popover-card hd-rewards-popover" role="dialog" aria-label="Coin Rules Help">
                <div className="hd-popover-header">
                  <div className="hd-popover-title-row">
                    <span className="hd-popover-icon">🪙</span>
                    <div>
                      <h4>Coin Rewards & Rules</h4>
                      <p>How to earn coins across MockInterviewHub</p>
                    </div>
                  </div>
                  <button 
                    className="hd-popover-close" 
                    onClick={() => setRewardsHelpOpen(false)}
                    aria-label="Close rules popover"
                  >
                    ✕
                  </button>
                </div>

                <div className="hd-rules-list">
                  <div className="hd-rule-item">
                    <div className="hd-rule-icon">📅</div>
                    <div className="hd-rule-content">
                      <div className="hd-rule-title-row">
                        <strong>Daily Login</strong>
                        <span className="hd-rule-badge">+5 coins</span>
                      </div>
                      <p>Claim once every 24 hours to boost your balance and keep your streak alive.</p>
                    </div>
                  </div>

                  <div className="hd-rule-item">
                    <div className="hd-rule-icon">🎯</div>
                    <div className="hd-rule-content">
                      <div className="hd-rule-title-row">
                        <strong>Correct Quiz Answer</strong>
                        <span className="hd-rule-badge">+1 coin</span>
                      </div>
                      <p>Awarded for each correct answer submitted in trivia and category quiz questions.</p>
                    </div>
                  </div>

                  <div className="hd-rule-item">
                    <div className="hd-rule-icon">🔥</div>
                    <div className="hd-rule-content">
                      <div className="hd-rule-title-row">
                        <strong>7-Day Login Streak</strong>
                        <span className="hd-rule-badge">+25 bonus coins</span>
                      </div>
                      <p>Awarded at every 7-day milestone of continuous daily logins (Days 7, 14, 21, etc.).</p>
                    </div>
                  </div>

                  <div className="hd-rule-item">
                    <div className="hd-rule-icon">🤖</div>
                    <div className="hd-rule-content">
                      <div className="hd-rule-title-row">
                        <strong>Technical Mock Interview</strong>
                        <span className="hd-rule-badge">Score-based</span>
                      </div>
                      <p>
                        Earn <code>Math.floor(scorePercentage / 10)</code> coins based on your evaluation.
                        <span className="hd-rule-example">Example: 77% score awards +7 coins (85% → 8 coins, 100% → 10 coins).</span>
                      </p>
                    </div>
                  </div>

                  <div className="hd-rule-item">
                    <div className="hd-rule-icon">📄</div>
                    <div className="hd-rule-content">
                      <div className="hd-rule-title-row">
                        <strong>Resume-Based Interview</strong>
                        <span className="hd-rule-badge">Score-based</span>
                      </div>
                      <p>
                        Earn <code>Math.floor(scorePercentage / 10)</code> coins from your overall resume interview.
                        <span className="hd-rule-example">Example: 77% score awards +7 coins automatically added to your wallet.</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hd-popover-footer">
                  <span>Current Balance: <strong>{(progress.coins || 0).toLocaleString()} coins</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Icon Button & Popover */}
          <div className="hd-popover-wrap" ref={notificationsRef}>
            <button 
              className={`hd-icon-btn hd-notification-btn ${notificationsOpen ? 'active' : ''}`}
              title="Notifications"
              onClick={() => {
                setNotificationsOpen(prev => !prev);
                setRewardsHelpOpen(false);
                setDropdownOpen(false);
              }}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              🔔
              {coinHistory.length > 0 && (
                <span className="hd-badge-dot" />
              )}
            </button>

            {notificationsOpen && (
              <div className="hd-popover-card hd-notifications-popover" role="dialog" aria-label="Notifications Panel">
                <div className="hd-popover-header">
                  <div className="hd-popover-title-row">
                    <span className="hd-popover-icon">🔔</span>
                    <div>
                      <h4>Notifications</h4>
                      <p>Coin reward transactions & milestones</p>
                    </div>
                  </div>
                  <button 
                    className="hd-popover-close" 
                    onClick={() => setNotificationsOpen(false)}
                    aria-label="Close notifications popover"
                  >
                    ✕
                  </button>
                </div>

                <div className="hd-notifications-list">
                  {coinHistory.length > 0 ? (
                    coinHistory.map((item) => {
                      let icon = "🪙";
                      if (item.source === "DAILY_LOGIN") icon = "📅";
                      else if (item.source === "SEVEN_DAY_STREAK") icon = "🔥";
                      else if (item.source === "ANSWER_CORRECTLY") icon = "🎯";
                      else if (item.source === "INTERVIEW_SCORE") {
                        icon = item.activity?.toLowerCase().includes("resume") ? "📄" : "🤖";
                      }

                      return (
                        <div className="hd-notif-item" key={item.id}>
                          <div className="hd-notif-icon-circle">{icon}</div>
                          <div className="hd-notif-details">
                            <div className="hd-notif-top">
                              <span className="hd-notif-activity" title={item.activity}>{item.activity}</span>
                              <span className="hd-notif-amount">+{item.coins} coins</span>
                            </div>
                            <span className="hd-notif-date">{item.date}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="hd-notif-empty">
                      <div className="hd-empty-bell">🔔</div>
                      <h5>No notifications yet</h5>
                      <p>Complete daily logins, quizzes, and interviews to earn coins and track rewards here!</p>
                    </div>
                  )}
                </div>

                <div className="hd-popover-footer">
                  <span>Balance: <strong>{(progress.coins || 0).toLocaleString()} coins</strong></span>
                  {coinHistory.length > 0 && (
                    <small>{coinHistory.length} transaction{coinHistory.length > 1 ? 's' : ''}</small>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {progress?.username ? (
            <div className="hd-profile-dropdown-wrap" ref={dropdownRef}>
              <button 
                className="hd-avatar-btn" 
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setNotificationsOpen(false);
                  setRewardsHelpOpen(false);
                }} 
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {progress.profilePhoto ? (
                  <img src={progress.profilePhoto} alt={progress.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  progress.username?.[0]?.toUpperCase()
                )}
              </button>
              
              {dropdownOpen && (
                <div className="hd-dropdown-menu">
                  <div className="hd-dropdown-header">
                    <strong>{progress.username}</strong>
                    <span>{XP} XP</span>
                  </div>
                  <hr />
                  <button onClick={openProfileDetails}>👤 My Profile</button>
                  <button onClick={openProfileSettings}>⚙️ Settings</button>
                  <hr />
                  <button onClick={() => { logoutUser(); setDropdownOpen(false); }} className="logout-text">↪ Log Out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hd-guest-nav-actions">
              <button
                type="button"
                className="hd-profile-nav-link"
                onClick={() => {
                  requireAuth('profile', () => setActiveNav('profile'), {
                    title: 'Sign in to View Profile',
                    subtitle: 'Sign in or create an account to view your career readiness and interview history.'
                  });
                }}
              >
                <span className="hd-profile-nav-icon">👤</span>
                <span className="hd-profile-nav-text">Profile</span>
              </button>
              <button
                type="button"
                className="hd-signin-nav-btn"
                onClick={() => {
                  openAuthModal(null, {
                    title: 'Welcome to MockInterviewHub',
                    subtitle: 'Sign in or create an account to track your progress.'
                  });
                }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="hd-shell">
        {sidebarOpen && <div className="hd-overlay" onClick={closeSidebar} aria-hidden="true" />}
        
        <aside className="hd-sidebar"><SidebarContent /></aside>
        <aside className={`hd-sidebar hd-sidebar-drawer ${sidebarOpen ? 'open' : ''}`}><SidebarContent /></aside>

        <main className="hd-main">

        {activeNav === 'dashboard' && (
          <div className="rewards-dashboard">
            <section className="rewards-hero rewards-glass">
              <div className="rewards-hero-copy">
                <span className="rewards-kicker">Coin & Rewards</span>
                <h1>{progress?.username ? `Welcome back, ${progress.username}` : 'Master Technical & Resume Interviews'}</h1>
                <p>
                  {progress?.username
                    ? 'Earn coins from daily logins, quizzes, 7-day streaks, and interview performance.'
                    : 'Interactive coding quizzes, real-time AI proctored technical interviews, and ATS resume evaluations.'}
                </p>
                <div className="rewards-hero-actions">
                  <button onClick={() => setActiveNav('all')} className="reward-primary-btn">
                    {progress?.username ? 'Start Earning' : 'Explore Practice Quizzes'}
                  </button>
                  <button onClick={() => navigate('/leaderboard')} className="reward-secondary-btn">View Rank</button>
                </div>
              </div>
              <div className="coin-balance-card">
                <div className="coin-orbit">
                  <span className="coin-core">$</span>
                </div>
                <span className="coin-label">Coin Balance</span>
                <strong>{coinBalance.toLocaleString()}</strong>
                <small>{progress?.username ? `${completedSections} quizzes passed` : 'Sign in to save your coins'}</small>
              </div>
            </section>

            <section className="rewards-grid">
              <div className="reward-card daily-login-card">
                <div className="reward-card-head">
                  <div>
                    <span>Daily Login</span>
                    <h2>+{COIN_REWARDS.DAILY_LOGIN.coins} coins</h2>
                  </div>
                  <div className="reward-medal">{COIN_REWARDS.DAILY_LOGIN.coins}</div>
                </div>
                <p>Claim once every day and keep your streak alive.</p>
                <button
                  onClick={() => {
                    requireAuth(null, () => claimDailyLoginReward(), {
                      title: 'Sign in to Claim Daily Reward',
                      subtitle: 'Sign in or create an account to start claiming daily coins and streaks.'
                    });
                  }}
                  className="reward-primary-btn"
                >
                  Claim Daily Reward
                </button>
              </div>

              <div className="reward-card streak-card">
                <div className="reward-card-head">
                  <div>
                    <span>Streak Rewards</span>
                    <h2>{progress.streakDays || 1} day streak</h2>
                  </div>
                  <div className="streak-flame"></div>
                </div>
                <div className="streak-track">
                  <div style={{ width: `${Math.min(100, ((progress.streakDays || 1) / 7) * 100)}%` }}></div>
                </div>
                <p>7-day streak unlocks +{COIN_REWARDS.SEVEN_DAY_STREAK.coins} bonus coins.</p>
              </div>

              <div className="reward-card rank-card">
                <span>Leaderboard Rank</span>
                <h2>#{leaderboardRank}</h2>
                <p>{totalScore} score points across your learning quests.</p>
                <button onClick={() => navigate('/leaderboard')} className="reward-secondary-btn">Open Leaderboard</button>
              </div>
            </section>

          </div>
         )}

        {activeNav === 'profile' && (
          progress?.username ? (
            <ProfileSection
              progress={progress}
              LEVEL={LEVEL}
              XP={XP}
              totalScore={totalScore}
              completedSections={completedSections}
              categories={categories}
              getCategoryProgress={getCategoryProgress}
              fileInputRef={fileInputRef}
              handlePhotoChange={handlePhotoChange}
              profilePhoto={profilePhoto}
              collegeName={collegeName}
              branch={branch}
              year={year}
              openProfileSettings={openProfileSettings}
              navigate={navigate}
              setActiveNav={setActiveNav}
              resetCoins={resetCoins}
            />
          ) : (
            <div className="guest-profile-gate-card">
              <div className="gate-icon">👤</div>
              <h2>Authentication Required</h2>
              <p>Sign in or create an account to view your career readiness score, performance history, and customized improvement plan.</p>
              <div className="gate-actions">
                <button
                  type="button"
                  className="reward-primary-btn"
                  onClick={() => requireAuth('profile', () => setActiveNav('profile'), {
                    title: 'Sign in to View Profile',
                    subtitle: 'Sign in to view your career readiness and interview history.'
                  })}
                >
                  Sign In to Continue
                </button>
                <button
                  type="button"
                  className="reward-secondary-btn"
                  onClick={() => setActiveNav('dashboard')}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )
        )}
                {/* Category groups for activeNav === 'all' / 'prog' / 'fe' / 'be' */}
        {activeNav !== 'dashboard' && activeNav !== 'profile' && (
          <section className="hd-categories">
            {(activeNav === 'all' || activeNav === 'prog') && (
              <GroupBlock
                title="Programming"
                subtitle="Core programming language quizzes"
                headerGrad="linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)"
                borderCol="#c7d2fe"
                subBg="linear-gradient(135deg,#eef2ff,#f5f3ff)"
                subBorder="#e0e7ff"
                expanded={programmingExpanded}
                setExpanded={setProgrammingExpanded}
                stats={prog}
                cats={programmingCategories}
              />
            )}
            {(activeNav === 'all' || activeNav === 'fe') && (
              <GroupBlock
                title="Frontend"
                subtitle="HTML, CSS & React"
                headerGrad="linear-gradient(135deg,#0f3d38,#0d766b,#0f9689)"
                borderCol="#99f6e4"
                subBg="linear-gradient(135deg,#f0fdfa,#ecfdf5)"
                subBorder="#ccfbf1"
                expanded={frontendExpanded}
                setExpanded={setFrontendExpanded}
                stats={fe}
                cats={frontendCategories}
              />
            )}
            {(activeNav === 'all' || activeNav === 'be') && (
              <GroupBlock
                title="Backend"
                subtitle="Node.js & Algorithms"
                headerGrad="linear-gradient(135deg,#431407,#9a3412,#c2410c)"
                borderCol="#fed7aa"
                subBg="linear-gradient(135deg,#fff7ed,#fffbeb)"
                subBorder="#fed7aa"
                expanded={backendExpanded}
                setExpanded={setBackendExpanded}
                stats={be}
                cats={backendCategories}
              />
            )}
          </section>
        )}
      </main>
      </div>

      <Footer setActiveNav={setActiveNav} navigate={navigate} />

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="instructions-overlay" onClick={() => setIsSettingsModalOpen(false)}>
          <div className="instructions-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h2>Edit Profile Settings</h2>
              <button className="close-button" onClick={() => setIsSettingsModalOpen(false)}>✕</button>
            </div>
            <div className="card-body" style={{padding: '24px', display: 'block'}}>
              <form className="profile-edit-form" onSubmit={handleProfileUpdate}>
                            <div className="form-row-grid">
                              <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" className="form-input" value={profileFullName} onChange={e => setProfileFullName(e.target.value)} placeholder="Full Name" disabled={isSubmitting} />
                              </div>
                              <div className="form-group">
                                <label>Username <span className="text-muted">(Read-only)</span></label>
                                <input type="text" className="form-input" value={profileUsername} disabled />
                              </div>
                            </div>

                            <div className="form-row-grid">
                              <div className="form-group">
                                <label>Email Address <span className="text-danger">*</span></label>
                                <input type="email" className="form-input" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} required placeholder="name@gmail.com" disabled={isSubmitting} />
                              </div>
                              <div className="form-group">
                                <label>College Name</label>
                                <input type="text" className="form-input" value={collegeName} onChange={e => setCollegeName(e.target.value)} placeholder="e.g. Stanford University" disabled={isSubmitting} />
                              </div>
                            </div>

                            <div className="form-row-grid">
                              <div className="form-group">
                                <label>Branch / Department</label>
                                <input type="text" className="form-input" value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Computer Science" disabled={isSubmitting} />
                              </div>
                              <div className="form-group">
                                <label>Year / Semester</label>
                                <input type="text" className="form-input" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 3rd Year" disabled={isSubmitting} />
                              </div>
                            </div>

                            <div className="password-section-divider">
                              <h4>🔐 Change Password <span className="text-muted">(Optional)</span></h4>
                            </div>

                            <div className="form-group">
                              <label>Current Password</label>
                              <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Required only if changing password" disabled={isSubmitting} />
                            </div>

                            <div className="form-row-grid">
                              <div className="form-group">
                                <label>New Password</label>
                                <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" disabled={isSubmitting} />
                              </div>
                              <div className="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" disabled={isSubmitting} />
                              </div>
                            </div>

                            <div className="form-actions">
                              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button type="button" className="btn-secondary" onClick={() => { setIsSettingsModalOpen(false); }} disabled={isSubmitting}>Cancel</button>
                            </div>
                          </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
