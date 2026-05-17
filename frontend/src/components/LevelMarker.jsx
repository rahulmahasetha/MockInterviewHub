import React, { useState, useEffect } from 'react';

export default function LevelMarker({ level, locked, completed, current, pulsing, onClick, style, category }) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setShouldAnimate(true), level * 100);
    return () => clearTimeout(timer);
  }, [level]);

  const getMarkerClass = () => {
    let className = 'level-marker';
    if (locked) className += ' locked';
    if (completed) className += ' completed';
    if (current) className += ' current';
    if (pulsing) className += ' pulsing';
    if (isHovered && !locked) className += ' hovered';
    if (shouldAnimate) className += ' animated';
    return className;
  };

  const getMarkerContent = () => {
    if (locked) return '🔒';
    if (completed) return '✓';
    return level;
  };

  const getTooltipText = () => {
    if (locked) return 'Complete previous level to unlock';
    if (completed) return `Level ${level} - Completed!`;
    if (current) return `Level ${level} - Current`;
    return `Level ${level} - Click to play`;
  };

  return (
    <>
      <div
        className={getMarkerClass()}
        title={getTooltipText()}
        onClick={!locked ? onClick : undefined}
        onMouseEnter={() => !locked && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{...style}}
        data-level={level}
        data-category={category}
      >
        {getMarkerContent()}
        
        {/* Glow effect for pulsing markers */}
        {pulsing && <div className="pulse-ring"></div>}
        
        {/* Hover effect trail */}
        {isHovered && <div className="hover-trail"></div>}
      </div>

      <style jsx>{`
        .level-marker {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
          transform: scale(0);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          z-index: 10;
          font-size: 1.1rem;
          border: 3px solid transparent;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          animation: markerEntrance 0.6s ease-out forwards;
          animation-delay: ${level * 0.1}s;
        }

        .level-marker.animated {
          transform: scale(1);
        }

        .level-marker.locked {
          background: #9e9e9e;
          cursor: not-allowed;
          transform: scale(0.8);
          animation: shake 0.5s ease-in-out;
        }

        .level-marker.completed {
          background: #4CAF50;
          animation: completedGlow 2s ease-in-out infinite;
        }

        .level-marker.current {
          background: #2196F3;
          border-color: #FFD700;
          animation: currentPulse 2s ease-in-out infinite;
        }

        .level-marker.pulsing {
          animation: suggestPulse 1.5s ease-in-out infinite;
        }

        .level-marker.hovered:not(.locked) {
          transform: scale(1.2) translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          z-index: 20;
        }

        /* Pulse ring for suggested levels */
        .pulse-ring {
          position: absolute;
          width: 70px;
          height: 70px;
          border: 2px solid #FF9800;
          border-radius: 50%;
          animation: ringPulse 2s ease-out infinite;
          pointer-events: none;
        }

        /* Hover trail effect */
        .hover-trail {
          position: absolute;
          width: 70px;
          height: 70px;
          border: 2px solid rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: trailExpand 0.6s ease-out forwards;
          pointer-events: none;
        }

        /* Animations */
        @keyframes markerEntrance {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          70% {
            transform: scale(1.1) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes completedGlow {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
          }
          50% {
            box-shadow: 0 4px 20px rgba(76, 175, 80, 0.8), 0 0 30px rgba(76, 175, 80, 0.6);
          }
        }

        @keyframes currentPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 4px 20px rgba(33, 150, 243, 0.8), 0 0 30px rgba(33, 150, 243, 0.6);
          }
        }

        @keyframes suggestPulse {
          0%, 100% {
            transform: scale(1);
            background: linear-gradient(135deg, #FF9800, #FF5722);
          }
          50% {
            transform: scale(1.15);
            background: linear-gradient(135deg, #FFB74D, #FF9800);
            box-shadow: 0 0 25px rgba(255, 152, 0, 0.8);
          }
        }

        @keyframes ringPulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes trailExpand {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) scale(0.8); }
          25% { transform: translateX(-3px) scale(0.8); }
          75% { transform: translateX(3px) scale(0.8); }
        }

        /* Category-specific colors */
        .level-marker[data-category="science"]:not(.locked):not(.completed):not(.current) {
          background: linear-gradient(135deg, #4CAF50, #45a049);
        }

        .level-marker[data-category="jungle"]:not(.locked):not(.completed):not(.current) {
          background: linear-gradient(135deg, #FF9800, #F57C00);
        }

        .level-marker[data-category="math"]:not(.locked):not(.completed):not(.current) {
          background: linear-gradient(135deg, #2196F3, #1976D2);
        }

        .level-marker[data-category="history"]:not(.locked):not(.completed):not(.current) {
          background: linear-gradient(135deg, #9C27B0, #7B1FA2);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .level-marker {
            width: 40px;
            height: 40px;
            font-size: 0.9rem;
          }
          
          .pulse-ring {
            width: 55px;
            height: 55px;
          }
          
          .hover-trail {
            width: 55px;
            height: 55px;
          }
        }

        @media (max-width: 480px) {
          .level-marker {
            width: 35px;
            height: 35px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </>
  );
}