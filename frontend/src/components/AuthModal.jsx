import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserProgress } from '../context/UserProgressContext';

export default function AuthModal({ onAuthSuccess }) {
  const {
    authModalConfig,
    closeAuthModal,
    signInUser,
    signUpUser,
    forgotPasswordUser
  } = useUserProgress();

  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('signin'); // signin, signup, forgot
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock background scroll when modal is open and handle Escape key
  useEffect(() => {
    if (authModalConfig?.isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          closeAuthModal();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [authModalConfig?.isOpen, closeAuthModal]);

  // Reset form when modal opens
  useEffect(() => {
    if (authModalConfig?.isOpen) {
      setActiveTab('signin');
      setUsername('');
      setEmail('');
      setPassword('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [authModalConfig?.isOpen]);

  if (!authModalConfig?.isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const u = username.trim();
    const em = email.trim();
    const pw = password.trim();

    if (!u || !pw || ((activeTab === 'signup' || activeTab === 'forgot') && !em)) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    let result = null;

    try {
      if (activeTab === 'signin') {
        result = await signInUser(u, pw);
      } else if (activeTab === 'signup') {
        result = await signUpUser(u, em, pw);
      } else {
        result = await forgotPasswordUser(u, em, pw);
        if (result?.success) {
          setActiveTab('signin');
          setIsSubmitting(false);
          setErrorMessage('');
          return;
        }
      }

      if (result?.success) {
        setErrorMessage('');
        const target = authModalConfig.targetPath;
        closeAuthModal();

        if (typeof onAuthSuccess === 'function') {
          onAuthSuccess(target);
        }

        if (target) {
          if (target === 'profile') {
            if (location.pathname === '/') {
              window.dispatchEvent(new CustomEvent('switch-to-profile-tab'));
            } else {
              navigate('/?tab=profile');
            }
          } else if (target.startsWith('/')) {
            navigate(target);
          }
        }
      } else {
        setErrorMessage(result?.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMessage(err?.response?.data?.error || err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="hd-auth-modal-overlay" onClick={closeAuthModal} role="dialog" aria-modal="true">
      <div className="hd-auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="hd-auth-modal-close"
          onClick={closeAuthModal}
          title="Close and continue browsing"
          aria-label="Close auth dialog"
        >
          ✕
        </button>

        <div className="hd-auth-logo">
          <span className="hd-logo-icon">🎓</span>
          <span className="hd-logo-text">MockInterviewHub</span>
        </div>

        <h2 className="hd-auth-heading">
          {activeTab === 'forgot'
            ? 'Reset Password'
            : activeTab === 'signup'
            ? 'Create Free Account'
            : authModalConfig.title || 'Welcome Back'}
        </h2>

        <p className="hd-auth-sub">
          {authModalConfig.subtitle ||
            (activeTab === 'signin'
              ? 'Sign in to access your interview session and track progress'
              : activeTab === 'signup'
              ? 'Join thousands of engineers practicing with AI'
              : 'Enter your credentials to reset your password')}
        </p>

        {activeTab !== 'forgot' && (
          <div className="hd-auth-tabs">
            <button
              type="button"
              className={`hd-atab ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('signin');
                setPassword('');
                setErrorMessage('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`hd-atab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('signup');
                setPassword('');
                setErrorMessage('');
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="hd-auth-error-alert" role="alert">
            <span className="hd-auth-error-icon">⚠️</span>
            <span className="hd-auth-error-text">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="hd-auth-form">
          <div className="hd-fgroup">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMessage('');
              }}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </div>

          {(activeTab === 'signup' || activeTab === 'forgot') && (
            <div className="hd-fgroup">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                disabled={isSubmitting}
                required
              />
            </div>
          )}

          <div className="hd-fgroup">
            <div className="hd-flabel-row">
              <label>{activeTab === 'forgot' ? 'New Password' : 'Password'}</label>
              {activeTab === 'signin' && (
                <button
                  type="button"
                  className="hd-fpass-link"
                  onClick={() => {
                    setActiveTab('forgot');
                    setErrorMessage('');
                  }}
                >
                  Forgot?
                </button>
              )}
            </div>
            <input
              type="password"
              placeholder={activeTab === 'forgot' ? 'Enter new password' : 'Enter password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              disabled={isSubmitting}
              required
            />
          </div>

          <button type="submit" className="hd-auth-btn" disabled={isSubmitting}>
            {isSubmitting
              ? 'Authenticating...'
              : activeTab === 'forgot'
              ? 'Update Password'
              : activeTab === 'signup'
              ? 'Create Account & Continue →'
              : 'Sign In & Continue →'}
          </button>
        </form>

        {activeTab === 'forgot' ? (
          <button
            type="button"
            className="hd-auth-back"
            onClick={() => setActiveTab('signin')}
            style={{ marginTop: '14px', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
          >
            ← Back to Sign In
          </button>
        ) : (
          <div className="hd-auth-modal-browse-hint">
            <span>Just looking around? </span>
            <button type="button" onClick={closeAuthModal} className="browse-freely-btn">
              Browse website freely without signing in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
