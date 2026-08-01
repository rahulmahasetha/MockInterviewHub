import React, { useState, useEffect, useRef } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaDesktop, FaVideo, FaMicrophone, FaExpand } from 'react-icons/fa';

export default function PreInterviewCheck({ onComplete, title = "Interview Instructions & Proctoring Check" }) {
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [instructionsRead, setInstructionsRead] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function setupMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera/Microphone access is not supported by this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(stream.getVideoTracks().some(t => t.readyState === 'live'));
        setMicReady(stream.getAudioTracks().some(t => t.readyState === 'live'));
        setError('');
      } catch (err) {
        setCameraReady(false);
        setMicReady(false);
        setError('Allow camera and microphone access to proceed.');
      }
    }
    setupMedia();

    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      setError('Fullscreen permission was blocked. Continue only after enabling it.');
    }
  };

  const allChecksPassed = cameraReady && micReady && isFullscreen && instructionsRead;

  const handleStart = () => {
    if (allChecksPassed) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      onComplete();
    }
  };

  return (
    <div className="pre-interview-container">
      <div className="pre-interview-card">
        <h2>{title}</h2>
        <p className="subtitle">Please complete the setup below before starting your session.</p>

        <div className="split-view">
          <div className="instructions-section">
            <h3>📝 Important Instructions</h3>
            <ul className="rules-list">
              <li><strong>Do not exit fullscreen</strong> during the session.</li>
              <li><strong>Do not switch tabs</strong> or open other applications.</li>
              <li>Ensure your face is clearly visible in the camera.</li>
              <li>Ensure you are in a quiet environment.</li>
              <li>Violation of these rules will result in warnings. 10 warnings will auto-terminate the session.</li>
            </ul>
            <div className="checkbox-wrap">
              <input 
                type="checkbox" 
                id="ackRules" 
                checked={instructionsRead}
                onChange={(e) => setInstructionsRead(e.target.checked)} 
              />
              <label htmlFor="ackRules">I have read and understood the instructions.</label>
            </div>
          </div>

          <div className="hardware-section">
            <h3>🔧 System Checks</h3>
            <div className="video-preview-box">
              <video ref={videoRef} autoPlay muted playsInline />
              {!cameraReady && <div className="no-video"><FaVideo /> Camera required</div>}
            </div>
            
            <div className="checks-list">
              <div className={`check-item ${cameraReady && micReady ? 'pass' : 'fail'}`}>
                {cameraReady && micReady ? <FaCheckCircle /> : <FaExclamationTriangle />}
                <span>Camera & Microphone {cameraReady && micReady ? 'Ready' : 'Required'}</span>
              </div>
              <div className={`check-item ${isFullscreen ? 'pass' : 'fail'}`}>
                {isFullscreen ? <FaCheckCircle /> : <FaExpand />}
                <span>Fullscreen {isFullscreen ? 'Enabled' : 'Required'}</span>
                {!isFullscreen && (
                  <button className="btn-small-action" onClick={requestFullscreen}>Enable</button>
                )}
              </div>
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
        </div>

        <div className="action-row">
          <button 
            className={`btn-primary btn-large ${allChecksPassed ? '' : 'disabled'}`} 
            onClick={handleStart}
            disabled={!allChecksPassed}
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
}
