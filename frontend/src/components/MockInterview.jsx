import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { interviewAPI, leaderboardAPI } from '../services/api';
import { useUserProgress } from '../context/UserProgressContext';
import { FaRobot, FaArrowLeft, FaCheckCircle, FaSpinner, FaMicrophone, FaStop } from 'react-icons/fa';

export default function MockInterview() {
  const navigate = useNavigate();
  const [step, setStep] = useState('setup'); // setup, session, summary
  const [topic, setTopic] = useState('React');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const { progress } = useUserProgress();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [interviewMode, setInterviewMode] = useState('written'); // 'written' or 'speaking'
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setCurrentAnswer(prev => prev + (prev ? " " : "") + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Your browser does not support Speech Recognition. Please use Google Chrome or Edge.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const formatText = (text) => {
    if (!text) return null;
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.08); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>')
      .replace(/(\d+\.\s)/g, '<br/><br/>$1'); // Add spacing before list items
    
    // Cleanup leading breaks if the text starts with a list item
    if (formatted.startsWith('<br/><br/>')) {
      formatted = formatted.substring(10);
    }
    
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const topics = [
    "HTML", "CSS", "JavaScript", "React", "Node.js", 
    "Express", "MongoDB", "Java", "C++", "Python", "Full Stack"
  ];

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const response = await interviewAPI.generateInterview({ topic, numQuestions });
      if (response.data.success && response.data.questions.length > 0) {
        setQuestions(response.data.questions);
        setUserAnswers(new Array(response.data.questions.length).fill(""));
        setStep('session');
      } else {
        alert("Failed to generate questions. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating interview questions. Make sure your API key is set.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = currentAnswer;
    setUserAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsLoading(true);
      try {
        const response = await interviewAPI.evaluateInterview({ questions, userAnswers: newAnswers });
        if (response.data.success) {
          setEvaluations(response.data.evaluation);
          const totalScore = response.data.evaluation.reduce((acc, curr) => acc + (curr.score || 0), 0);
          
          if (progress?.username) {
            try {
              await leaderboardAPI.addToLeaderboard({
                name: progress.username,
                score: totalScore,
                maxScore: questions.length * 10,
                type: 'interview',
                topic: topic
              });
            } catch (err) {
              console.error("Failed to save interview score to leaderboard", err);
            }

            // Save detailed interview history to user dashboard
            if (progress.userId) {
              const avgScoreOutof10 = totalScore / questions.length;
              const overallScore = Math.round(avgScoreOutof10 * 10);
              
              const technicalScore = Math.min(100, Math.max(10, overallScore + (topic.length % 5) - 2));
              const communicationScore = Math.min(100, Math.max(10, overallScore + (interviewMode === 'speaking' ? 4 : -2)));
              const confidenceScore = Math.min(100, Math.max(10, overallScore + (topic.length % 3) - 1));

              const strengths = [];
              const areasForImprovement = [];
              
              if (overallScore >= 80) {
                strengths.push("Clear and structured explanations", "Strong theoretical foundation in " + topic, "Uses technical terminology accurately");
                areasForImprovement.push("Elaborate on complex edge cases", "Keep answers slightly more concise");
              } else if (overallScore >= 60) {
                strengths.push("Good core understanding of " + topic, "Answers are mostly correct and relevant");
                areasForImprovement.push("Reinforce definitions with real-world examples", "Improve technical precision in explanations");
              } else {
                strengths.push("Shows honest attempt at all questions", "Understand base concepts of " + topic);
                areasForImprovement.push("Review fundamentals of " + topic, "Practice structuring answers sequentially", "Add code examples to back explanations");
              }

              const feedbackSummary = `You demonstrated a ${overallScore >= 80 ? "strong" : overallScore >= 60 ? "solid" : "basic"} grasp of ${topic} concepts, scoring ${overallScore}/100. ${overallScore >= 80 ? "Your communication was clear and explanations were well-rounded." : "Consider reinforcing key definitions and providing more structured explanations."}`;

              try {
                await interviewAPI.saveInterview({
                  userId: progress.userId,
                  topic,
                  overallScore,
                  communicationScore,
                  technicalScore,
                  confidenceScore,
                  feedbackSummary,
                  strengths,
                  areasForImprovement,
                  questionCount: questions.length
                });
              } catch (err) {
                console.error("Failed to save interview result", err);
              }
            }
          }
        }
      } catch (error) {
        console.error(error);
        alert("Evaluation failed. Proceeding without scores.");
      } finally {
        setIsLoading(false);
        setStep('summary');
      }
    }
  };

  const resetInterview = () => {
    setStep('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers([]);
    setCurrentAnswer("");
    setEvaluations([]);
  };

  return (
    <div className="dashboard-container app-shell" style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        {/* SETUP STEP */}
        {step === 'setup' && (
          <div className="auth-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
              <FaArrowLeft /> Back to Dashboard
            </button>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <FaRobot style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '10px' }} />
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Technical Mock Interview</h1>
              <p style={{ color: '#64748b', marginTop: '10px' }}>Practice answering technical questions with our AI.</p>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Select Topic</label>
              <select className="auth-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label className="form-label">Interview Length</label>
              <select className="auth-input" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}>
                <option value={5}>Quick Screen (5 Questions)</option>
                <option value={10}>Standard Interview (10 Questions)</option>
                <option value={20}>Deep Dive (20 Questions)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Interview Mode</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setInterviewMode('written')}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: interviewMode === 'written' ? '2px solid #2563eb' : '1px solid #cbd5e1', background: interviewMode === 'written' ? '#eff6ff' : '#fff', fontWeight: 600, color: interviewMode === 'written' ? '#1d4ed8' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  ✍️ Written
                </button>
                <button 
                  type="button" 
                  onClick={() => setInterviewMode('speaking')}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: interviewMode === 'speaking' ? '2px solid #2563eb' : '1px solid #cbd5e1', background: interviewMode === 'speaking' ? '#eff6ff' : '#fff', fontWeight: 600, color: interviewMode === 'speaking' ? '#1d4ed8' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  🎤 Speaking
                </button>
              </div>
            </div>

            <button className="auth-submit-btn" onClick={handleStart} disabled={isLoading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              {isLoading ? <><FaSpinner className="fa-spin" /> Generating Questions...</> : 'Start Interview'}
            </button>
          </div>
        )}

        {/* SESSION STEP */}
        {step === 'session' && (
          <div className="auth-card" style={{ maxWidth: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>{topic} Interview</h2>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '6px 12px', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', lineHeight: 1.5, margin: '0 0 15px 0' }}>
                <span style={{ color: '#3b82f6', marginRight: '10px' }}>Q:</span>
                {questions[currentIndex].question}
              </h3>
            </div>

            {interviewMode === 'speaking' ? (
              <div className="form-group" style={{ marginBottom: '25px', textAlign: 'center' }}>
                <button 
                  type="button"
                  onClick={toggleRecording}
                  style={{
                    background: isRecording ? '#fee2e2' : '#eff6ff',
                    color: isRecording ? '#dc2626' : '#2563eb',
                    border: isRecording ? '2px solid #fca5a5' : '2px solid #bfdbfe',
                    padding: '20px 40px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    transition: 'all 0.2s',
                    width: '100%',
                    marginBottom: '15px'
                  }}
                >
                  {isRecording ? <><FaStop style={{ fontSize: '2rem' }} /> Stop Recording</> : <><FaMicrophone style={{ fontSize: '2rem' }} /> Tap to Speak Answer</>}
                </button>
                <div style={{ textAlign: 'left' }}>
                  <label className="form-label" style={{ marginBottom: '8px', color: '#64748b', fontSize: '0.85rem' }}>Live Transcript (You can edit this if needed):</label>
                  <textarea 
                    className="auth-input" 
                    rows="4" 
                    placeholder="Your spoken words will appear here..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    style={{ resize: 'vertical', background: '#f8fafc' }}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label" style={{ marginBottom: '10px' }}>Your Answer:</label>
                <textarea 
                  className="auth-input" 
                  rows="6" 
                  placeholder="Type your detailed answer here..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="auth-submit-btn" onClick={handleNext} disabled={!currentAnswer.trim() || isLoading} style={{ width: 'auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isLoading ? <><FaSpinner className="fa-spin" /> Evaluating...</> : (currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview')}
              </button>
            </div>
          </div>
        )}

        {/* SUMMARY STEP */}
        {step === 'summary' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '20px', textAlign: 'center', padding: '40px 20px' }}>
              <FaCheckCircle style={{ fontSize: '4rem', color: '#22c55e', marginBottom: '15px' }} />
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>Interview Complete!</h1>
              {evaluations.length > 0 && (
                <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', display: 'inline-block', border: '1px solid #e2e8f0' }}>
                  <h2 style={{ margin: 0, color: '#2563eb', fontSize: '1.5rem' }}>
                    Overall Score: {evaluations.reduce((acc, curr) => acc + (curr.score || 0), 0)} / {questions.length * 10}
                  </h2>
                </div>
              )}
              <p style={{ color: '#64748b', marginTop: '10px' }}>Review your answers compared to the ideal responses below.</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' }}>
                <button className="auth-submit-btn" onClick={resetInterview} style={{ width: 'auto', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                  Take Another Interview
                </button>
                <button className="auth-submit-btn" onClick={() => navigate('/')} style={{ width: 'auto' }}>
                  Return to Dashboard
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions.map((q, index) => {
                const evalData = evaluations[index];
                return (
                <div key={index} className="auth-card" style={{ maxWidth: '100%', padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', lineHeight: 1.5, flex: 1 }}>
                      <span style={{ color: '#3b82f6', marginRight: '8px' }}>Q{index + 1}:</span>
                      {q.question}
                    </h3>
                    {evalData && (
                      <div style={{ background: evalData.score >= 7 ? '#dcfce7' : evalData.score >= 4 ? '#fef08a' : '#fee2e2', color: evalData.score >= 7 ? '#166534' : evalData.score >= 4 ? '#854d0e' : '#991b1b', padding: '6px 12px', borderRadius: '999px', fontWeight: 800, fontSize: '0.9rem', marginLeft: '15px', whiteSpace: 'nowrap' }}>
                        Score: {evalData.score}/10
                      </div>
                    )}
                  </div>
                  
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #94a3b8', marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Your Answer</h4>
                    <p style={{ margin: 0, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {userAnswers[index] ? formatText(userAnswers[index]) : "No answer provided."}
                    </p>
                  </div>

                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #22c55e', marginBottom: evalData?.feedback ? '15px' : 0 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>Ideal Answer</h4>
                    <p style={{ margin: 0, color: '#15803d', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {formatText(q.idealAnswer)}
                    </p>
                  </div>

                  {evalData?.feedback && (
                    <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#1e40af', letterSpacing: '0.5px' }}>AI Feedback</h4>
                      <p style={{ margin: 0, color: '#1d4ed8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {formatText(evalData.feedback)}
                      </p>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
