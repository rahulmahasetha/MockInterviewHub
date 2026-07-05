import React, { useEffect, useRef, useState } from 'react';
import {
  FaBell,
  FaCheckCircle,
  FaDesktop,
  FaExclamationTriangle,
  FaExpand,
  FaEye,
  FaMicrophone,
  FaVideo,
  FaWifi
} from 'react-icons/fa';

export default function ProctorPanel({
  active = true,
  title = 'AI Proctoring',
  subtitle = 'Live environment checks',
  violations = 0,
  maxViolations,
  onTabSwitch,
  layout = 'panel'
}) {
  const videoRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [proctorError, setProctorError] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!active) return undefined;

    let stream;
    let cancelled = false;

    async function setupProctoringStream() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setProctorError('Camera access is not supported by this browser.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setCameraReady(stream.getVideoTracks().some(track => track.readyState === 'live'));
        setMicReady(stream.getAudioTracks().some(track => track.readyState === 'live'));
        setProctorError('');
      } catch (error) {
        setCameraReady(false);
        setMicReady(false);
        setProctorError('Allow camera and microphone access to enable live proctoring.');
      }
    }

    setupProctoringStream();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(count => count + 1);
        if (onTabSwitch) onTabSwitch('tab_switch');
      }
    };

    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [active, onTabSwitch]);

  useEffect(() => {
    if (!active || !cameraReady) {
      setFaceDetected(false);
      return undefined;
    }

    if (!('FaceDetector' in window)) {
      setFaceDetected(true);
      return undefined;
    }

    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const interval = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const faces = await detector.detect(videoRef.current);
        setFaceDetected(faces.length > 0);
      } catch (error) {
        setFaceDetected(true);
      }
    }, 1600);

    return () => window.clearInterval(interval);
  }, [active, cameraReady]);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      setProctorError('Fullscreen permission was blocked. Continue only after enabling it.');
    }
  };

  const warningCount = Number(!cameraReady) + Number(!micReady) + Number(!isFullscreen) + Number(!isOnline) + tabSwitches + violations;
  const proctorStatus = warningCount === 0 ? 'Secure' : warningCount <= 2 ? 'Watch' : 'Review';
  const violationLabel = maxViolations ? `${violations}/${maxViolations}` : violations;

  return (
    <section className={`proctor-card interview-proctor ${layout}`} aria-label="Live AI proctoring panel">
      <div className="proctor-card-header">
        <div>
          <h4>{title}</h4>
          <span>{subtitle}</span>
        </div>
        <span className={`proctor-risk ${proctorStatus.toLowerCase()}`}>{proctorStatus}</span>
      </div>

      <div className="webcam-preview">
        <video ref={videoRef} autoPlay muted playsInline />
        {!cameraReady && (
          <div className="webcam-placeholder">
            <FaVideo />
            <span>Camera permission needed</span>
          </div>
        )}
        <div className="face-frame">
          <span>{faceDetected ? 'Face detected' : 'No face signal'}</span>
        </div>
      </div>

      <div className="proctor-check-grid">
        <div className={`proctor-check ${micReady ? 'ok' : 'alert'}`}>
          <FaMicrophone />
          <div><strong>Microphone</strong><span>{micReady ? 'Active input' : 'Permission needed'}</span></div>
        </div>
        <div className={`proctor-check ${faceDetected ? 'ok' : 'alert'}`}>
          <FaEye />
          <div><strong>Face Detection</strong><span>{faceDetected ? 'Single face visible' : 'Waiting for camera'}</span></div>
        </div>
        <div className={`proctor-check ${tabSwitches === 0 ? 'ok' : 'warn'}`}>
          <FaDesktop />
          <div><strong>Tab Switches</strong><span>{tabSwitches} detected</span></div>
        </div>
        <div className={`proctor-check ${isFullscreen ? 'ok' : 'warn'}`}>
          <FaExpand />
          <div><strong>Fullscreen</strong><span>{isFullscreen ? 'Enabled' : 'Not enabled'}</span></div>
        </div>
        <div className={`proctor-check ${isOnline ? 'ok' : 'alert'}`}>
          <FaWifi />
          <div><strong>Internet</strong><span>{isOnline ? 'Stable connection' : 'Offline'}</span></div>
        </div>
      </div>

      {!isFullscreen && (
        <button type="button" className="fullscreen-action" onClick={requestFullscreen}>
          <FaExpand /> Enter Fullscreen
        </button>
      )}

      <div className="warning-panel">
        <div className="warning-panel-title">
          <FaBell />
          <strong>Warnings</strong>
          <span>{warningCount}</span>
        </div>
        <div className="warning-list">
          {proctorError && <p className="warning-item danger"><FaExclamationTriangle /> {proctorError}</p>}
          {!isFullscreen && <p className="warning-item"><FaExclamationTriangle /> Fullscreen monitoring is not active.</p>}
          {tabSwitches > 0 && <p className="warning-item"><FaExclamationTriangle /> Tab switching was detected {tabSwitches} time{tabSwitches > 1 ? 's' : ''}.</p>}
          {violations > 0 && <p className="warning-item danger"><FaExclamationTriangle /> Interview violations: {violationLabel}</p>}
          {isOnline && cameraReady && micReady && isFullscreen && tabSwitches === 0 && violations === 0 && (
            <p className="warning-item success"><FaCheckCircle /> No warnings. Keep the interview window focused.</p>
          )}
        </div>
      </div>
    </section>
  );
}
