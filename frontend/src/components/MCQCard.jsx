import React, { useState, useEffect } from 'react';
import { useUserProgress } from '../context/UserProgressContext';

export default function MCQCard({ levelObj, category, onCorrectNextLevel, totalLevels }) {
  const [selected, setSelected] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const { markPassed, isLevelCompleted } = useUserProgress();

  const isAlreadyCompleted = levelObj ? isLevelCompleted(category, levelObj.level) : false;

  useEffect(() => {
    setSelected(null);
    setShowHint(false);
    setResult(null);
    setTimeLeft(20);
  }, [levelObj]);

  useEffect(() => {
    if (result) return;

    if (timeLeft === 0) {
      handleTimeout();
      return;
    }

    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, result]);

  function handleTimeout() {
    setResult('timeout');
  }

  function handleWrongAnswer() {
    setResult('incorrect');
  }

  function handleCorrectAnswer() {
    if (isAlreadyCompleted) {
      setResult('alreadyCompleted');
    } else {
      setResult('correct');
      markPassed(category, levelObj.level);
    }

    const isLastLevel = levelObj.level >= totalLevels;

    setTimeout(() => {
      if (isLastLevel) {
        setResult('completed');
      } else {
        onCorrectNextLevel(levelObj.level + 1);
      }
    }, 1500);
  }

  function submit() {
    if (selected == null) {
      alert('Please select an answer.');
      return;
    }

    if (levelObj.answer === selected) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  }

  if (!levelObj) {
    return (
      <div className="mcq-empty">
        <h3>No level data available</h3>
      </div>
    );
  }

  return (
    <div className="mcq-card-inner">
      <div className="mcq-timer">
        <p>
          Time Left: <span className={timeLeft <= 5 ? 'time-danger' : 'time-safe'}>{timeLeft}s</span>
        </p>
      </div>

      {levelObj.image && (
        <img src={levelObj.image} alt="Question visual" className="mcq-image" />
      )}

      <h3 className="mcq-question">
        Level {levelObj.level}: {levelObj.question}
      </h3>

      <div className="mcq-options">
        {levelObj.options.map((opt, index) => (
          <label
            key={index}
            className={`mcq-option ${selected === opt ? 'selected' : ''} ${result !== null ? 'disabled' : ''}`}
          >
            <input
              type="radio"
              name="answer"
              value={opt}
              checked={selected === opt}
              onChange={() => setSelected(opt)}
              disabled={result !== null}
              className="mcq-radio"
            />
            {opt}
          </label>
        ))}
      </div>

      <div className="mcq-actions">
        {result === null && (
          <>
            <button onClick={submit} className="mcq-btn mcq-submit">
              Submit Answer
            </button>
            <button onClick={() => setShowHint(s => !s)} className="mcq-btn mcq-hint-toggle">
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
          </>
        )}
      </div>

      {showHint && (
        <div className="mcq-hint-box">
          <strong>Hint:</strong> {levelObj.hint}
        </div>
      )}

      {result === 'correct' && (
        <div className="mcq-result success">
          Correct. +20 points. {levelObj.level < totalLevels ? 'Moving to next level...' : 'Category completed.'}
        </div>
      )}

      {result === 'alreadyCompleted' && (
        <div className="mcq-result neutral">
          Correct. Already completed - no additional points.
          {levelObj.level < totalLevels && ' Moving to next level...'}
        </div>
      )}

      {result === 'completed' && (
        <div className="mcq-result grand-success">
          <h3>Category Complete!</h3>
          <p>Congratulations! You've completed all {totalLevels} levels in {category}.</p>
        </div>
      )}

      {result === 'incorrect' && (
        <div className="mcq-result error">
          Wrong answer. Complete this level to proceed.
        </div>
      )}

      {result === 'timeout' && (
        <div className="mcq-result warning">
          Time is up. Complete this level to proceed.
        </div>
      )}
    </div>
  );
}
