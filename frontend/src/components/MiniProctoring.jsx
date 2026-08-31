import React, { useEffect, useRef, useState } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function MiniProctoring({ violations, maxViolations = 10, onViolation, onTerminate }) {
  const videoRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!cancelled && videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.error("Camera access denied or unavailable in MiniProctoring");
      }
    }
    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onViolation();
      }
    };

    const handleBlur = () => {
      onViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onViolation]);

  useEffect(() => {
    if (violations >= maxViolations) {
      onTerminate();
    }
  }, [violations, maxViolations, onTerminate]);

  return (
    <div className="mini-proctoring-widget">
      <div className="mini-video-container">
        <video ref={videoRef} autoPlay muted playsInline />
        {!streamActive && <div className="mini-video-placeholder">No Camera</div>}
      </div>
      {violations > 0 && (
        <div className="mini-warnings">
          <FaExclamationTriangle /> {violations}/{maxViolations} Warnings
        </div>
      )}
    </div>
  );
}
