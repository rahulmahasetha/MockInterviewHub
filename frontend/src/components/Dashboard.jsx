import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUserProgress } from "../context/UserProgressContext";

export default function Dashboard() {
  const { progress, globalLeaderboard, fetchGlobalLeaderboard, getTotalScore, logoutUser, requireAuth, openAuthModal } = useUserProgress();
  const navigate = useNavigate();
  const [isCoursesOpen, setIsCoursesOpen] = useState(true);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, []);

  const totalScore = getTotalScore();
  
  // Calculate rankings and stats
  const sortedQuizLeaderboard = [...globalLeaderboard]
    .filter(e => e.type !== 'interview')
    .sort((a, b) => b.score - a.score);
    
  const myRank = sortedQuizLeaderboard.findIndex(
    e => progress.username && e.name.toLowerCase() === progress.username.toLowerCase()
  ) + 1;

  const mockInterviewsDone = globalLeaderboard.filter(
    e => e.type === 'interview' && progress.username && e.name.toLowerCase() === progress.username.toLowerCase()
  ).length;

  // Mock data for UI elements that don't exist in the context yet
  const resumeReviews = 5; 
  const performanceHistory = [
    { id: 1, date: '01/12/2023', topic: 'Quiz', score: 85, type: 'Quiz' },
    { id: 2, date: '07/12/2023', topic: 'Frontend', score: 80, type: 'Mock' },
    { id: 3, date: '07/12/2023', topic: 'Quiz', score: 82, type: 'Resume' },
    { id: 4, date: '01/11/2023', topic: 'Frontend', score: 80, type: 'Quiz' },
    { id: 5, date: '01/11/2023', topic: 'Quiz', score: 85, type: 'Resume' }
  ];

  return (
    <div className="dash-layout">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="dash-logo-icon">🎓</span>
          MockInterviewHub
        </div>
        
        <nav className="dash-nav">
          <div className="dash-nav-item dash-nav-active">
            <span className="dash-nav-icon">🏠</span> Dashboard
          </div>
          
          <div className="dash-nav-group">
            <div 
              className="dash-nav-item" 
              onClick={() => setIsCoursesOpen(!isCoursesOpen)}
              style={{ cursor: 'pointer', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="dash-nav-icon">📚</span> Courses
              </div>
              <span style={{ fontSize: '0.8rem', transform: isCoursesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </div>
            
            {isCoursesOpen && (
              <div className="dash-nav-submenu">
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=all')}>🌐 All Tracks (10)</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=fe')}>▭ Frontend</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=be')}>◈ Backend</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=core')}>⚙️ Core Computer Science</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=devops')}>🚀 DevOps & Cloud</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=ai')}>🤖 Artificial Intelligence</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=ml')}>🧠 Machine Learning</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=dl')}>⚡ Deep Learning</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=ds')}>📊 Data Science</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=security')}>🛡️ Cyber Security</div>
                <div className="dash-nav-subitem" onClick={() => navigate('/?tab=prog')}>🖋 Programming & DSA</div>
              </div>
            )}
          </div>
          
          <div 
            className="dash-nav-item" 
            onClick={() => {
              requireAuth('/resume-interview', () => navigate('/resume-interview'), {
                title: 'Sign in to Start Resume-Based Interview',
                subtitle: 'Sign in or create an account to start your resume interview.'
              });
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="dash-nav-icon">🤖</span> Resume AI Interview
          </div>
          <div 
            className="dash-nav-item" 
            onClick={() => {
              requireAuth('/interview', () => navigate('/interview'), {
                title: 'Sign in to Start Technical Interview',
                subtitle: 'Sign in or create an account to start your technical mock interview.'
              });
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="dash-nav-icon">🎯</span> Technical Mock Interview
          </div>
          <Link to="/leaderboard" className="dash-nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="dash-nav-icon">🏆</span> Leaderboard
          </Link>
          {progress.username ? (
            <div className="dash-nav-item" onClick={() => { logoutUser(); navigate('/'); }} style={{ cursor: 'pointer' }}>
              <span className="dash-nav-icon">↪️</span> Logout
            </div>
          ) : (
            <div className="dash-nav-item" onClick={() => openAuthModal()} style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 700 }}>
              <span className="dash-nav-icon">🔑</span> Sign In
            </div>
          )}
        </nav>

        <div className="dash-subject-areas">
          <div className="dash-subject-title">SUBJECT AREAS (10 TRACKS)</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=fe')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">▭</span> Frontend</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=be')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">◈</span> Backend</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=core')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">⚙️</span> Core CS (OS/DBMS/CN)</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=devops')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">🚀</span> DevOps & Cloud</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=ai')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">🤖</span> Artificial Intelligence</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=ml')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">🧠</span> Machine Learning</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=dl')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">⚡</span> Deep Learning</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=ds')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">📊</span> Data Science</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=security')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">🛡️</span> Cyber Security</div>
          <div className="dash-nav-item" onClick={() => navigate('/?tab=prog')} style={{ cursor: 'pointer' }}><span className="dash-nav-icon">🖋</span> Programming & DSA</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        {/* Header */}
        <header className="dash-header">
          <div>
            <h1 className="dash-welcome">Welcome{progress.username ? ` back, ${progress.username}` : ' to MockInterviewHub'}! 👋</h1>
            <p className="dash-subtitle">Ready for your next interview?</p>
          </div>
          <button
            className="dash-btn-start"
            onClick={() => {
              requireAuth('/interview', () => navigate('/interview'), {
                title: 'Sign in to Start Technical Interview',
                subtitle: 'Sign in or create an account to start your technical mock interview.'
              });
            }}
          >
            Start Technical Interview
          </button>
        </header>

        {/* Row 1: Metrics */}
        <div className="dash-metrics-row">
          <div className="dash-metric-card">
            <div className="dash-metric-label">Total Score</div>
            <div className="dash-metric-value">{totalScore} pts</div>
            <div className="dash-metric-bar"><div className="dash-metric-fill" style={{ width: '40%', background: '#3B82F6' }}></div></div>
          </div>
          <div className="dash-metric-card">
            <div className="dash-metric-label">Mock Interviews Done</div>
            <div className="dash-metric-value">{mockInterviewsDone || 12}</div>
            <div className="dash-metric-bar"><div className="dash-metric-fill" style={{ width: '60%', background: '#14B8A6' }}></div></div>
          </div>
          <div className="dash-metric-card">
            <div className="dash-metric-label">Resume Reviews</div>
            <div className="dash-metric-value">{resumeReviews}</div>
            <div className="dash-metric-bar"><div className="dash-metric-fill" style={{ width: '25%', background: '#8B5CF6' }}></div></div>
          </div>
          <div className="dash-metric-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="dash-metric-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Global Rank <span style={{ fontSize: '1.5rem' }}>🏆</span>
            </div>
            <div className="dash-metric-value">#{myRank > 0 ? myRank : 3}</div>
          </div>
        </div>

        {/* Row 2: Features */}
        <div className="dash-features-row">
          {/* Courses */}
          <div className="dash-card dash-courses-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Courses</h2>
              <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>▲</span>
            </div>
            <div className="dash-course-grid">
              {/* Course 1 */}
              <div className="dash-course-item">
                <div className="dash-course-top">
                  <div className="dash-course-icon-bg" style={{ background: '#EFF6FF', color: '#3B82F6' }}>📘</div>
                  <div>
                    <div className="dash-course-name">Programming</div>
                    <div className="dash-course-desc">8 quizzes, 10 levels each</div>
                  </div>
                </div>
                <div className="dash-course-mid">
                  <span className="dash-lang-icon">☕</span>
                  <span className="dash-lang-icon">C</span>
                  <span className="dash-lang-icon" style={{ color: '#6366F1' }}>C++</span>
                  <span className="dash-lang-icon">🐍</span>
                </div>
                <div className="dash-course-bottom">
                  <div className="dash-course-level">Level 3</div>
                  <button className="dash-btn-outline" onClick={() => navigate('/playground/java')}>Start</button>
                </div>
              </div>
              
              {/* Course 2 */}
              <div className="dash-course-item">
                <div className="dash-course-top">
                  <div className="dash-course-icon-bg" style={{ background: '#F0FDF4', color: '#10B981' }}>⚛️</div>
                  <div>
                    <div className="dash-course-name">Frontend</div>
                    <div className="dash-course-desc">HTML, CSS, React, NodeJS</div>
                  </div>
                </div>
                <div className="dash-course-bottom" style={{ marginTop: '32px' }}>
                  <div className="dash-course-level">Level 3</div>
                  <button className="dash-btn-outline">Start</button>
                </div>
              </div>

              {/* Course 3 */}
              <div className="dash-course-item">
                <div className="dash-course-top">
                  <div className="dash-course-icon-bg" style={{ background: '#F1F5F9', color: '#64748B' }}>⚙️</div>
                  <div>
                    <div className="dash-course-name">Backend</div>
                    <div className="dash-course-desc">Node, Express, MongoDB</div>
                  </div>
                </div>
                <div className="dash-course-bottom" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                  <div className="dash-course-level">Level 10</div>
                  <button className="dash-btn-outline">Start</button>
                </div>
                <div className="dash-metric-bar" style={{ marginTop: '8px' }}><div className="dash-metric-fill" style={{ width: '100%', background: '#475569' }}></div></div>
              </div>

              {/* Course 4 */}
              <div className="dash-course-item">
                <div className="dash-course-top">
                  <div className="dash-course-icon-bg" style={{ background: '#ECFCCB', color: '#65A30D' }}>🧩</div>
                  <div>
                    <div className="dash-course-name">Data Structures & Algorithms</div>
                  </div>
                </div>
                <div className="dash-course-bottom" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                  <div className="dash-course-level">Level 5</div>
                  <button className="dash-btn-outline">Start</button>
                </div>
                <div className="dash-metric-bar" style={{ marginTop: '8px' }}><div className="dash-metric-fill" style={{ width: '50%', background: '#65A30D' }}></div></div>
              </div>
            </div>
          </div>

          {/* AI Resume */}
          <div className="dash-card dash-resume-card" style={{ border: '1px solid #C4B5FD', borderTop: '4px solid #8B5CF6' }}>
            <h2 className="dash-card-title">Resume AI Interview</h2>
            <p className="dash-card-desc">AI analyzes your resume and asks personalized questions</p>
            <div className="dash-resume-stats">
              <div className="dash-resume-icon">
                <span style={{ fontSize: '1.5rem', color: '#8B5CF6' }}>↑</span>
                <span style={{ fontSize: '0.8rem', color: '#8B5CF6', fontWeight: 'bold' }}>PDF</span>
              </div>
              <div>
                <div className="dash-stat-primary">5 Sessions Completed</div>
                <div className="dash-stat-secondary">Last Score: <b>78%</b></div>
              </div>
            </div>
            <button className="dash-btn-full dash-btn-green" onClick={() => navigate('/resume-interview')}>Start New Session</button>
          </div>

          {/* Tech Mock */}
          <div className="dash-card dash-mock-card" style={{ border: '1px solid #FED7AA', borderTop: '4px solid #F97316' }}>
            <h2 className="dash-card-title">Technical Mock Interview</h2>
            <p className="dash-card-desc">Simulate real tech interviews with AI</p>
            <div className="dash-mock-stats">
              <div className="dash-stat-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.2rem' }}>🕒</span> 45 min avg
              </div>
              <div className="dash-stat-primary">12 Sessions Done</div>
              <div className="dash-stat-secondary" style={{ marginTop: '4px' }}>Best Score: <b>85%</b></div>
            </div>
            <button className="dash-btn-full dash-btn-orange" onClick={() => navigate('/interview')}>Practice Now</button>
          </div>
        </div>

        {/* Row 3: Tables */}
        <div className="dash-tables-row">
          {/* Global Leaderboard */}
          <div className="dash-card">
            <h2 className="dash-card-title">Global Leaderboard</h2>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Score</th>
                    <th>Interviews Done</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQuizLeaderboard.slice(0, 3).map((entry, index) => {
                    const isMe = progress.username && entry.name.toLowerCase() === progress.username.toLowerCase();
                    const rank = index + 1;
                    return (
                      <tr key={entry.id || index}>
                        <td className="dash-rank">
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                        </td>
                        <td className="dash-name">
                          <div className="dash-avatar"></div>
                          {entry.name}
                          {isMe && <span className="dash-badge-you">YOU</span>}
                        </td>
                        <td className="dash-score">{entry.score}pts</td>
                        <td className="dash-score">{Math.floor(Math.random() * 15) + 1}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="dash-rank">#2</td>
                    <td className="dash-name"><div className="dash-avatar"></div> {progress.username || 'Rahul Mahaseth'}</td>
                    <td className="dash-score">220pts</td>
                    <td className="dash-score">4</td>
                  </tr>
                  <tr className="dash-row-highlight">
                    <td className="dash-rank">#3</td>
                    <td className="dash-name">
                      <div className="dash-avatar"></div> 
                      {progress.username || 'Rahul Mahaseth'}
                    </td>
                    <td className="dash-score">{totalScore > 0 ? totalScore : 280}pts</td>
                    <td><span className="dash-badge-you">YOU</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance History */}
          <div className="dash-card">
            <h2 className="dash-card-title">Performance History</h2>
            <div className="dash-perf-content">
              <div className="dash-chart-mock">
                <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="none">
                  <path d="M0,80 L40,40 L80,60 L120,20 L160,50 L200,10" fill="none" stroke="#3B82F6" strokeWidth="3" />
                </svg>
              </div>
              <div className="dash-table-wrapper" style={{ flex: 1 }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Topic</th>
                      <th>Score</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceHistory.map(item => (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>{item.topic}</td>
                        <td style={{ color: '#10B981', fontWeight: '500' }}>{item.score}</td>
                        <td>{item.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = `
.dash-layout {
  display: flex;
  min-height: 100vh;
  background-color: #F0F4FF;
  font-family: 'Inter', 'Poppins', -apple-system, sans-serif;
  color: #111827;
}

/* SIDEBAR */
.dash-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1A237E 0%, #0D47A1 100%);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  flex-shrink: 0;
}

.dash-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.2rem;
  font-weight: 700;
  padding: 0 24px;
  margin-bottom: 40px;
}

.dash-logo-icon {
  font-size: 1.5rem;
}

.dash-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px;
}

.dash-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.dash-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.dash-nav-active {
  background-color: #2563EB;
  color: white;
}

.dash-nav-active:hover {
  background-color: #1D4ED8;
}

.dash-nav-icon {
  font-size: 1.1rem;
}

.dash-nav-submenu {
  margin-left: 44px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  margin-bottom: 8px;
}

.dash-nav-subitem {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.dash-nav-subitem:hover {
  color: white;
}

.dash-subject-areas {
  margin-top: auto;
  padding: 0 16px;
}

.dash-subject-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  padding: 0 16px;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

/* MAIN CONTENT */
.dash-main {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
  height: 100vh;
  box-sizing: border-box;
}

.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.dash-welcome {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: #111827;
}

.dash-subtitle {
  color: #4B5563;
  margin: 4px 0 0 0;
  font-size: 1rem;
}

.dash-btn-start {
  background-color: #2563EB;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}

.dash-btn-start:hover {
  background-color: #1D4ED8;
}

/* METRICS ROW */
.dash-metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.dash-metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dash-metric-label {
  font-size: 0.9rem;
  color: #4B5563;
  font-weight: 500;
  margin-bottom: 8px;
}

.dash-metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 12px;
}

.dash-metric-bar {
  height: 6px;
  background-color: #E5E7EB;
  border-radius: 3px;
  overflow: hidden;
}

.dash-metric-fill {
  height: 100%;
  border-radius: 3px;
}

/* FEATURES ROW */
.dash-features-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.dash-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.dash-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.dash-card-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.dash-card-desc {
  font-size: 0.85rem;
  color: #6B7280;
  margin: 4px 0 16px 0;
  line-height: 1.4;
}

/* COURSES */
.dash-course-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dash-course-item {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.dash-course-top {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.dash-course-icon-bg {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.dash-course-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.dash-course-desc {
  font-size: 0.75rem;
  color: #6B7280;
}

.dash-course-mid {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.dash-lang-icon {
  font-size: 1rem;
}

.dash-course-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dash-course-level {
  font-size: 0.8rem;
  color: #4B5563;
  font-weight: 500;
}

.dash-btn-outline {
  background: white;
  border: 1px solid #3B82F6;
  color: #3B82F6;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.dash-btn-outline:hover {
  background: #EFF6FF;
}

/* AI CARDS */
.dash-resume-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: auto;
  background: #F9FAFB;
  padding: 12px;
  border-radius: 8px;
}

.dash-resume-icon {
  width: 48px;
  height: 48px;
  background: #EDE9FE;
  border: 1px dashed #C4B5FD;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.dash-stat-primary {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}

.dash-stat-secondary {
  font-size: 0.85rem;
  color: #4B5563;
}

.dash-btn-full {
  width: 100%;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  margin-top: 20px;
}

.dash-btn-green {
  background-color: #10B981;
}
.dash-btn-green:hover {
  background-color: #059669;
}

.dash-btn-orange {
  background-color: #F97316;
}
.dash-btn-orange:hover {
  background-color: #EA580C;
}

/* TABLES ROW */
.dash-tables-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.dash-table-wrapper {
  overflow-x: auto;
}

.dash-table {
  width: 100%;
  border-collapse: collapse;
}

.dash-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.8rem;
  color: #6B7280;
  font-weight: 500;
  border-bottom: 1px solid #E5E7EB;
}

.dash-table td {
  padding: 12px 16px;
  font-size: 0.9rem;
  color: #111827;
  border-bottom: 1px solid #F3F4F6;
}

.dash-rank {
  font-weight: 600;
}

.dash-name {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.dash-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #E5E7EB;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239CA3AF"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>');
  background-size: cover;
}

.dash-badge-you {
  background-color: #3B82F6;
  color: white;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
}

.dash-score {
  color: #4B5563;
}

.dash-row-highlight {
  background-color: #EFF6FF;
}

.dash-row-highlight td {
  border-bottom-color: #DBEAFE;
}

.dash-perf-content {
  display: flex;
  gap: 24px;
  align-items: center;
}

.dash-chart-mock {
  width: 140px;
  height: 80px;
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .dash-features-row {
    grid-template-columns: 1fr;
  }
  .dash-tables-row {
    grid-template-columns: 1fr;
  }
  .dash-course-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dash-layout {
    flex-direction: column;
  }
  .dash-sidebar {
    width: 100%;
    height: auto;
    padding: 16px;
  }
  .dash-nav {
    display: none; /* In a real app, add a hamburger menu */
  }
  .dash-subject-areas {
    display: none;
  }
  .dash-metrics-row {
    grid-template-columns: 1fr 1fr;
  }
  .dash-course-grid {
    grid-template-columns: 1fr;
  }
  .dash-perf-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById("dash-styles");
  if (existing) existing.remove();
  const s = document.createElement("style");
  s.id = "dash-styles";
  s.innerText = styles;
  document.head.appendChild(s);
}
