import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";
import { quizAPI, usersAPI } from "../services/api";
import { toast } from "react-toastify";

export default function Home() {
  const {
    progress,
    resetProgress,
    signInUser,
    signUpUser,
    logoutUser,
    getTotalScore,
    getCategoryProgress,
    forgotPasswordUser,
    globalLeaderboard,
    fetchGlobalLeaderboard,
    updateUserProfile
  } = useUserProgress();

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [programmingExpanded, setProgrammingExpanded] = useState(true);
  const [frontendExpanded, setFrontendExpanded] = useState(true);
  const [backendExpanded, setBackendExpanded] = useState(true);
  
  const [activeNav, setActiveNav] = useState("dashboard"); // Default to Dashboard View
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sidebar Accordion State
  const [sbProgExpanded, setSbProgExpanded] = useState(false);
  const [sbFeExpanded, setSbFeExpanded] = useState(false);
  const [sbBeExpanded, setSbBeExpanded] = useState(false);

  // Profile View States
  const [editMode, setEditMode] = useState(false);
  const [profileTab, setProfileTab] = useState("details"); // 'details' or 'interview'
  
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
      setEditMode(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Close sidebar on route-like navigation (nav clicks)
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const openProfileDetails = () => {
    setActiveNav('profile');
    setProfileTab('details');
    setEditMode(false);
    setDropdownOpen(false);
    closeSidebar();
  };

  const openProfileSettings = () => {
    setActiveNav('profile');
    setProfileTab('details');
    setEditMode(true);
    setDropdownOpen(false);
    closeSidebar();
  };

  // Close sidebar on escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") closeSidebar(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeSidebar]);

  // Lock body scroll when sidebar overlay is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

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

  const handleReset = () => {
    if (window.confirm("Reset all progress?")) resetProgress();
  };

  const handleAuthSubmit = async e => {
    e.preventDefault();
    const u = username.trim();
    const em = email.trim();
    const pw = password.trim();
    setIsSubmitting(true);
    if (activeTab === "signin") {
      if (!u || !pw) { setIsSubmitting(false); return alert("Fill all fields."); }
      await signInUser(u, pw);
    } else if (activeTab === "signup") {
      if (!u || !em || !pw) { setIsSubmitting(false); return alert("Fill all fields."); }
      await signUpUser(u, em, pw);
    } else {
      if (!u || !em || !pw) { setIsSubmitting(false); return alert("Fill all fields."); }
      await forgotPasswordUser(u, em, pw);
    }
    setIsSubmitting(false);
  };

  /* ── AUTH SCREEN ── */
  if (!progress.username) {
    return (
      <div className="hd-auth-bg">
        <div className="hd-auth-card">
          <div className="hd-auth-logo">
            <span className="hd-logo-icon">🎓</span>
            <span className="hd-logo-text">EduQuest</span>
          </div>
          <h2 className="hd-auth-heading">
            {activeTab === 'forgot' ? 'Reset Password' : activeTab === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="hd-auth-sub">
            {activeTab === 'signin'
              ? 'Sign in to continue your learning journey'
              : activeTab === 'signup'
              ? 'Join thousands of learners today'
              : 'Enter your details to reset your password'}
          </p>
          {activeTab !== 'forgot' && (
            <div className="hd-auth-tabs">
              <button className={`hd-atab ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => { setActiveTab('signin'); setUsername(''); setEmail(''); setPassword(''); }}>
                Sign In
              </button>
              <button className={`hd-atab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => { setActiveTab('signup'); setUsername(''); setEmail(''); setPassword(''); }}>
                Sign Up
              </button>
            </div>
          )}
          <form onSubmit={handleAuthSubmit} className="hd-auth-form">
            <div className="hd-fgroup">
              <label>Username</label>
              <input type="text" placeholder="Enter username" value={username}
                onChange={e => setUsername(e.target.value)} disabled={isSubmitting} required />
            </div>
            {(activeTab === 'signup' || activeTab === 'forgot') && (
              <div className="hd-fgroup">
                <label>Email</label>
                <input type="email" placeholder="Enter email" value={email}
                  onChange={e => setEmail(e.target.value)} disabled={isSubmitting} required />
              </div>
            )}
            <div className="hd-fgroup">
              <div className="hd-flabel-row">
                <label>{activeTab === 'forgot' ? 'New Password' : 'Password'}</label>
                {activeTab === 'signin' && (
                  <button type="button" className="hd-forgot-link"
                    onClick={() => { setActiveTab('forgot'); setUsername(''); setEmail(''); setPassword(''); }}>
                    Forgot?
                  </button>
                )}
              </div>
              <div className="hd-pw-wrap">
                <input type={showPassword ? "text" : "password"} placeholder="Enter password"
                  value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} required />
                <button type="button" className="hd-pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" className="hd-auth-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…'
                : activeTab === 'signin' ? 'Sign In'
                : activeTab === 'signup' ? 'Create Account'
                : 'Update Password'}
            </button>
            {activeTab === 'forgot' && (
              <button type="button" className="hd-back-link"
                onClick={() => { setActiveTab('signin'); setUsername(''); setEmail(''); setPassword(''); }}>
                ← Back to Sign In
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  /* ── CATEGORY CARD ── */
  const CategoryCard = ({ category }) => {
    const cp = getCategoryProgress(category.slug);
    const done = cp?.passed?.length || 0;
    const total = category.levels?.length || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isComplete = done === total && total > 0;
    return (
      <Link
        to={`/playground/${category.slug}`}
        className="hd-subcard"
        style={{ '--acc': category.iconColor }}
      >
        <div className="hd-subcard-icon" style={{ background: category.color }}>
          <span style={{ color: category.iconColor, fontWeight: 800, fontSize: '0.78rem' }}>
            {category.label}
          </span>
        </div>
        <div className="hd-subcard-body">
          <div className="hd-subcard-name">
            {category.name.replace(' Programming Quiz', '').replace(' Quiz', '')}
          </div>
          <div className="hd-subcard-bar-wrap">
            <div className="hd-subcard-bar" style={{ width: `${pct}%`, background: category.iconColor }} />
          </div>
          <div className="hd-subcard-meta">
            <span>{done}/{total} lvls</span>
            <span style={{ color: isComplete ? '#16a34a' : '#64748b' }}>{pct}%</span>
          </div>
        </div>
      </Link>
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
        
        <Link to="/resume-interview" className="hd-nav-item" onClick={closeSidebar} style={{ color: '#2563eb', fontWeight: 600 }}>
          📄 Resume AI Interview
        </Link>
        
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
                <Link key={c.slug} to={`/playground/${c.slug}`} className="hd-acc-item" onClick={closeSidebar}>
                  <span className="acc-dot" style={{ background: c.iconColor }}></span>
                  <span className="acc-text">{c.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</span>
                </Link>
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
                <Link key={c.slug} to={`/playground/${c.slug}`} className="hd-acc-item" onClick={closeSidebar}>
                  <span className="acc-dot" style={{ background: c.iconColor }}></span>
                  <span className="acc-text">{c.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</span>
                </Link>
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
                <Link key={c.slug} to={`/playground/${c.slug}`} className="hd-acc-item" onClick={closeSidebar}>
                  <span className="acc-dot" style={{ background: c.iconColor }}></span>
                  <span className="acc-text">{c.name.replace(' Programming Quiz', '').replace(' Quiz', '')}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
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
            <span className="hd-logo-text-nav">EduQuest</span>
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
          <Link to="/resume-interview" className="hd-icon-btn" title="AI Resume Interview">📄</Link>
          <Link to="/interview" className="hd-icon-btn" title="Technical Mock Interview">🤖</Link>
          <Link to="/leaderboard" className="hd-icon-btn" title="Leaderboard">🏆</Link>
          <button className="hd-icon-btn" title="Notifications">🔔</button>
          
          <div className="hd-profile-dropdown-wrap">
            <button className="hd-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)} style={{ padding: 0, overflow: 'hidden' }}>
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
                  <span>Level {LEVEL} • {XP} XP</span>
                </div>
                <hr />
                <button onClick={openProfileDetails}>👤 My Profile</button>
                <button onClick={openProfileSettings}>⚙️ Settings</button>
                <hr />
                <button onClick={() => { logoutUser(); setDropdownOpen(false); }} className="logout-text">↪ Log Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="hd-shell">
        {sidebarOpen && <div className="hd-overlay" onClick={closeSidebar} aria-hidden="true" />}
        
        <aside className="hd-sidebar"><SidebarContent /></aside>
        <aside className={`hd-sidebar hd-sidebar-drawer ${sidebarOpen ? 'open' : ''}`}><SidebarContent /></aside>

        <main className="hd-main">

        {activeNav === 'dashboard' && (
          <div className="hd-dashboard-view">
             {/* Welcome Card */}
             <div className="hd-welcome-banner">
                <div className="hd-welcome-text">
                  <h1>Welcome back, {progress.username}! 👋</h1>
                  <p>You're currently Level {LEVEL}. Keep learning to reach Level {LEVEL + 1}!</p>
                </div>
                <div className="hd-welcome-xp">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="circle" strokeDasharray={`${Math.min(100, (XP % 200) / 2)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="xp-text">{XP} XP</div>
                </div>
             </div>

             {/* Stats Grid */}
             <div className="hd-stats-overview">
                <div className="hd-stat-box">
                  <div className="stat-icon" style={{ background: 'var(--brand)', color: '#fff' }}>📚</div>
                  <div className="stat-info">
                    <div className="stat-val">{completedSections}</div>
                    <div className="stat-lbl">Quizzes Passed</div>
                  </div>
                </div>
                <div className="hd-stat-box">
                  <div className="stat-icon" style={{ background: 'var(--success)', color: '#fff' }}>⭐</div>
                  <div className="stat-info">
                    <div className="stat-val">{totalScore}</div>
                    <div className="stat-lbl">Total Score</div>
                  </div>
                </div>
                <div className="hd-stat-box">
                  <div className="stat-icon" style={{ background: 'var(--warning)', color: '#fff' }}>🔥</div>
                  <div className="stat-info">
                    <div className="stat-val">3 Days</div>
                    <div className="stat-lbl">Current Streak</div>
                  </div>
                </div>
                <div className="hd-stat-box">
                  <div className="stat-icon" style={{ background: '#ec4899', color: '#fff' }}>🏆</div>
                  <div className="stat-info">
                    <div className="stat-val">Level {LEVEL}</div>
                    <div className="stat-lbl">Current Rank</div>
                  </div>
                </div>
             </div>

             {/* Groups block */}
             <section className="hd-categories-dashboard">
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
             </section>
          </div>
        )}

        {activeNav === 'profile' && (
          <div className="hd-profile-view">
             {/* Hero Profile Section */}
             <div className="profile-hero-card">
               <div className="profile-hero-bg"></div>
               <div className="profile-hero-content">
                 {/* Left: Avatar */}
                 <div className="profile-avatar-container" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
                   {profilePhoto ? (
                     <img src={profilePhoto} alt={progress.username} className="profile-avatar-img" />
                   ) : (
                     <div className="profile-avatar-large">{progress.username?.[0]?.toUpperCase()}</div>
                   )}
                   <div className="profile-avatar-overlay">
                     <span>📸 Upload</span>
                   </div>
                   <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" style={{ display: 'none' }} />
                   <div className="profile-level-badge">Lv {LEVEL}</div>
                 </div>

                 {/* Center: Full Name, @username & College Info */}
                 <div className="profile-info-main">
                   <h2>{progress.fullName || progress.username}</h2>
                   <p className="profile-username">@{progress.username}</p>
                   <p className="profile-title">
                     {collegeName ? `${collegeName}` : "Explorer"} 
                     {branch ? ` • ${branch}` : ""}
                     {year ? ` • ${year}` : ""}
                   </p>
                 </div>

                 {/* Right: Actions */}
                 <div className="profile-hero-actions">
                  {profileTab === 'details' && (
                    editMode ? (
                      <button className="btn-secondary" onClick={() => setEditMode(false)}>
                        View Details
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={openProfileSettings} title="Edit profile settings">
                        <span>⚙️</span> Settings
                      </button>
                    )
                  )}
                 </div>
               </div>
             </div>

             {/* Professional Summary Cards — 4 columns, always visible above tabs */}
             <div className="profile-stats-row">
               <div className="stat-card">
                 <div className="stat-icon stat-icon-blue">🏆</div>
                 <div className="stat-info">
                   <div className="stat-value">{totalScore}</div>
                   <div className="stat-label">Total Score</div>
                 </div>
               </div>
               <div className="stat-card">
                 <div className="stat-icon stat-icon-green">✅</div>
                 <div className="stat-info">
                   <div className="stat-value">{completedSections}</div>
                   <div className="stat-label">Quizzes Passed</div>
                 </div>
               </div>
               <div className="stat-card">
                 <div className="stat-icon stat-icon-purple">🌟</div>
                 <div className="stat-info">
                    <div className="stat-value">Level {LEVEL}</div>
                    <div className="stat-label">Current Level</div>
                 </div>
               </div>
               <div className="stat-card">
                 <div className="stat-icon stat-icon-orange">🔥</div>
                 <div className="stat-info">
                    <div className="stat-value">{XP}</div>
                    <div className="stat-label">Total XP</div>
                 </div>
               </div>
             </div>

             {/* Tab Navigation */}
             <div className="profile-tabs-nav">
               <button className={`profile-tab-btn ${profileTab === 'details' ? 'active' : ''}`} onClick={() => { setProfileTab('details'); setEditMode(false); }}>
                 👤 Profile Details
               </button>
               <button className={`profile-tab-btn ${profileTab === 'interview' ? 'active' : ''}`} onClick={() => { setProfileTab('interview'); setEditMode(false); }}>
                 🤖 Interview Performance
               </button>
             </div>

             {/* Details Tab */}
             {profileTab === 'details' && (
               <div className="profile-tab-content">
               <div className="profile-grid-layout">
                  {/* Left Column: Progress */}
                  <div className="profile-left-col">
                    <div className="profile-card">
                      <div className="card-header">
                        <h3>Level Progress</h3>
                        <span className="card-header-badge">{XP} / {LEVEL * 200} XP</span>
                      </div>
                      <div className="card-body">
                        <div className="progress-bar-container-lg">
                          <div className="progress-bar-fill-lg" style={{ width: `${Math.min(100, (XP % 200) / 2)}%` }}></div>
                        </div>
                        <p className="progress-text-muted">You need {(LEVEL * 200) - XP} more XP to reach Level {LEVEL + 1}.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Edit Form or Account Info */}
                  <div className="profile-right-col">
                    <div className="profile-card">
                      <div className="card-header">
                        <h3>{editMode ? "Edit Profile Settings" : "Account Information"}</h3>
                      </div>
                      <div className="card-body">
                        {editMode ? (
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
                              <button type="button" className="btn-secondary" onClick={() => { setEditMode(false); }} disabled={isSubmitting}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div className="profile-details-list">
                            <div className="detail-row">
                              <div className="detail-icon">👤</div>
                              <div className="detail-content">
                                <span className="detail-label">Full Name</span>
                                <span className="detail-value">{progress.fullName || progress.username}</span>
                              </div>
                            </div>
                            <div className="detail-row">
                              <div className="detail-icon">🏫</div>
                              <div className="detail-content">
                                <span className="detail-label">College</span>
                                <span className="detail-value">{collegeName || '—'}</span>
                              </div>
                            </div>
                            <div className="detail-row">
                              <div className="detail-icon">📚</div>
                              <div className="detail-content">
                                <span className="detail-label">Branch / Department</span>
                                <span className="detail-value">{branch || '—'}</span>
                              </div>
                            </div>
                            <div className="detail-row">
                              <div className="detail-icon">📅</div>
                              <div className="detail-content">
                                <span className="detail-label">Year / Semester</span>
                                <span className="detail-value">{year || '—'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
               </div>
               </div>
             )}

             {/* Interview Dashboard Tab */}
             {profileTab === 'interview' && (
               <div className="profile-tab-content">
                 <div className="profile-grid-layout">
                   {interviews.length === 0 ? (
                     <>
                       <div className="profile-left-col">
                         <div className="profile-card profile-card-stable">
                           <div className="card-header">
                             <h3>Interview Performance</h3>
                           </div>
                           <div className="card-body interview-empty-state">
                             <div className="interview-empty-icon">AI</div>
                             <h3>No Mock Interviews Yet</h3>
                             <p className="text-muted">Start a practice session to see your score, strengths, and improvement areas here.</p>
                             <button className="btn-primary" onClick={() => navigate('/interview')}>
                               Start Practice Session
                             </button>
                           </div>
                         </div>
                       </div>
                       <div className="profile-right-col">
                         <div className="profile-card profile-card-stable">
                           <div className="card-header">
                             <h3>Latest Session Analysis</h3>
                           </div>
                           <div className="card-body interview-placeholder-panel">
                             <p className="text-muted">Your feedback summary and session history will appear after your first interview.</p>
                           </div>
                         </div>
                       </div>
                     </>
                   ) : (
                     (() => {
                       const totalOverall = interviews.reduce((sum, i) => sum + i.overallScore, 0);
                       const totalComm = interviews.reduce((sum, i) => sum + i.communicationScore, 0);
                       const totalTech = interviews.reduce((sum, i) => sum + i.technicalScore, 0);
                       const totalConf = interviews.reduce((sum, i) => sum + i.confidenceScore, 0);
                       const count = interviews.length;

                       const avgOverall = Math.round(totalOverall / count);
                       const avgComm = Math.round(totalComm / count);
                       const avgTech = Math.round(totalTech / count);
                       const avgConf = Math.round(totalConf / count);

                       const latestInterview = interviews[0];

                       return (
                         <>
                           <div className="profile-left-col">
                             <div className="profile-card profile-card-stable">
                               <div className="card-header">
                                 <h3>Interview Performance</h3>
                                 <span className="card-header-badge">{count} sessions</span>
                               </div>
                               <div className="card-body">
                                 <div className="iv-summary-score-card">
                                   <div className="iv-score-ring-wrap">
                                     <svg viewBox="0 0 36 36" className="circular-chart-lg">
                                       <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                       <path className="circle-overall" strokeDasharray={`${avgOverall}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                     </svg>
                                     <div className="iv-ring-center">
                                       <span className="ring-score-val">{avgOverall}</span>
                                       <span className="ring-score-lbl">Avg Score</span>
                                     </div>
                                   </div>
                                   <div className="iv-summary-meta">
                                     <h3>Performance Profile</h3>
                                     <p className="text-muted">Based on recent mock interviews</p>
                                     <button className="btn-primary-sm" onClick={() => navigate('/interview')}>
                                       New Interview
                                     </button>
                                   </div>
                                 </div>

                                 <div className="iv-sub-bars">
                                   <div className="iv-bar-row">
                                     <div className="bar-row-lbl">
                                       <span>Technical Skills</span>
                                       <strong>{avgTech}%</strong>
                                     </div>
                                     <div className="progress-bar-container-sm">
                                       <div className="progress-bar-fill-tech" style={{ width: `${avgTech}%` }} />
                                     </div>
                                   </div>
                                   <div className="iv-bar-row">
                                     <div className="bar-row-lbl">
                                       <span>Communication</span>
                                       <strong>{avgComm}%</strong>
                                     </div>
                                     <div className="progress-bar-container-sm">
                                       <div className="progress-bar-fill-comm" style={{ width: `${avgComm}%` }} />
                                     </div>
                                   </div>
                                   <div className="iv-bar-row">
                                     <div className="bar-row-lbl">
                                       <span>Confidence Level</span>
                                       <strong>{avgConf}%</strong>
                                     </div>
                                     <div className="progress-bar-container-sm">
                                       <div className="progress-bar-fill-conf" style={{ width: `${avgConf}%` }} />
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>

                           <div className="profile-right-col">
                             <div className="profile-card profile-card-stable">
                               <div className="card-header">
                                 <h3>Latest Session Analysis ({latestInterview.topic})</h3>
                                 <span className="card-header-date">
                                   {new Date(latestInterview.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </span>
                               </div>
                               <div className="card-body interview-card-scroll">
                                 <div className="iv-feedback-quote">
                                   <p>"{latestInterview.feedbackSummary}"</p>
                                 </div>

                                 <div className="tags-container-grid">
                                   <div className="tags-group">
                                     <h4 className="strengths-title">Key Strengths</h4>
                                     <div className="tags-list">
                                       {latestInterview.strengths.map((s, idx) => (
                                         <span key={idx} className="tag-badge strength-badge">{s}</span>
                                       ))}
                                     </div>
                                   </div>
                                   <div className="tags-group">
                                     <h4 className="improvements-title">Areas for Improvement</h4>
                                     <div className="tags-list">
                                       {latestInterview.areasForImprovement.map((s, idx) => (
                                         <span key={idx} className="tag-badge improvement-badge">{s}</span>
                                       ))}
                                     </div>
                                   </div>
                                 </div>

                                 <div className="interview-history-compact">
                                   <h4>Session History</h4>
                                   <div className="table-responsive">
                                     <table className="iv-history-table">
                                       <thead>
                                         <tr>
                                           <th>Topic</th>
                                           <th>Date</th>
                                           <th>Score</th>
                                         </tr>
                                       </thead>
                                       <tbody>
                                         {interviews.map((iv, idx) => (
                                           <tr key={idx}>
                                             <td><strong>{iv.topic}</strong></td>
                                             <td>{new Date(iv.date).toLocaleDateString()}</td>
                                             <td>
                                               <span className={`score-badge-cell ${iv.overallScore >= 80 ? 'good' : iv.overallScore >= 60 ? 'avg' : 'poor'}`}>
                                                 {iv.overallScore}%
                                               </span>
                                             </td>
                                           </tr>
                                         ))}
                                       </tbody>
                                     </table>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </>
                       );
                     })()
                   )}
                 </div>
               </div>
              )}
           </div>
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
    </div>
  );
}
