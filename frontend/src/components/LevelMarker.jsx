import React from 'react';

export default function LevelMarker({ level, locked, completed, current, onClick, style, category }) {
  const getMarkerClass = () => {
    let className = 'level-marker';
    if (locked) className += ' locked';
    if (completed) className += ' completed';
    if (current) className += ' current';
    return className;
  };

  const getMarkerContent = () => {
    if (locked) return 'L';
    if (completed) return 'OK';
    return level;
  };

  const getTooltipText = () => {
    if (locked) return 'Complete previous level to unlock';
    if (completed) return `Level ${level} completed`;
    if (current) return `Level ${level} current`;
    return `Level ${level}`;
  };

  return (
    <>
      <button
        type="button"
        className={getMarkerClass()}
        title={getTooltipText()}
        onClick={!locked ? onClick : undefined}
        style={{ ...style }}
        data-category={category}
        disabled={locked}
      >
        {getMarkerContent()}
      </button>

      <style>{`
        .level-marker {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
          z-index: 10;
          font-size: 0.95rem;
          border: 2px solid #ffffff;
          background: #2563eb;
          color: white;
        }

        .level-marker:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .level-marker:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.3);
          outline-offset: 3px;
        }

        .level-marker.locked {
          background: #94a3b8;
          cursor: not-allowed;
          color: #f8fafc;
        }

        .level-marker.completed {
          background: #16a34a;
        }

        .level-marker.current {
          background: #0f172a;
          border-color: #93c5fd;
        }

        .level-marker[data-category="science"]:not(.locked):not(.completed):not(.current) {
          background: #0f766e;
        }

        .level-marker[data-category="jungle"]:not(.locked):not(.completed):not(.current) {
          background: #15803d;
        }

        .level-marker[data-category="math"]:not(.locked):not(.completed):not(.current) {
          background: #2563eb;
        }

        .level-marker[data-category="history"]:not(.locked):not(.completed):not(.current) {
          background: #7c3aed;
        }

        @media (max-width: 768px) {
          .level-marker {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            font-size: 0.82rem;
          }
        }

        @media (max-width: 480px) {
          .level-marker {
            width: 34px;
            height: 34px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </>
  );
}
