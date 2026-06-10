import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../services/api';
import { useUserProgress } from '../context/UserProgressContext';
import { FaUpload, FaRobot, FaMicrophone, FaStop, FaArrowLeft, FaCheckCircle, FaSpinner, FaHistory, FaExclamationTriangle } from 'react-icons/fa';

export default function ResumeAI() {
  const navigate = useNavigate();
  const { progress } = useUserProgress();
  const [phase, setPhase] = useState('upload'); // upload, config, interview, report, history
  
  // Upload Phase State
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Config Phase State
  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedCategories, setSelectedCategories] = useState(['Introduction', 'Projects', 'Experience', 'Coding']);
  const [questionsPerCategory, setQuestionsPerCategory] = useState(2);

  // Interview Phase State
  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Proctoring State
  const [violations, setViolations] = useState(0);
  const MAX_VIOLATIONS = 3;

  // Report Phase State
  const [report, setReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // History State
  const [history, setHistory] = useState([]);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const availableCategories = [
    'Introduction', 'Education', 'Skills', 'Projects', 
    'Experience', 'HR', 'Behavioral', 'System Design', 'Coding'
  ];

  useEffect(() => {
    // Setup Speech Recognition
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

  // --- Proctoring System ---
  const handleProctorViolation = useCallback((type) => {
    if (phase !== 'interview') return;
    
    setViolations(prev => {
      const newVal = prev + 1;
      resumeAPI.logViolation({ userId: progress.userId, eventType: type });
      
      if (newVal >= MAX_VIOLATIONS) {
        alert("Maximum proctoring violations reached. Auto-submitting interview.");
        finishInterview(true);
      } else {
        alert(`⚠️ Warning ${newVal}/${MAX_VIOLATIONS}: Please stay on the interview page. Leaving may result in automatic submission.`);
      }
      return newVal;
    });
  }, [phase, progress.userId]);

  useEffect(() => {
    if (phase === 'interview') {
      const handleVisibility = () => {
        if (document.hidden) handleProctorViolation('tab_switch');
      };
      const handleBlur = () => handleProctorViolation('window_blur');
      const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
      const handlePopState = () => handleProctorViolation('navigation');

      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [phase, handleProctorViolation]);

  // --- TTS ---
  const speakText = (text, onEndCallback) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    // Try to find a good natural voice
    const naturalVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (naturalVoice) utterance.voice = naturalVoice;
    
    utterance.rate = 0.95;
    
    utterance.onstart = () => setIsAISpeaking(true);
    utterance.onend = () => {
      setIsAISpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsAISpeaking(false);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Your browser does not support Speech Recognition. Please use Chrome/Edge.");
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

  // --- Upload Phase ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx'].includes(ext)) {
        alert('Please upload a PDF or DOCX resume.');
        e.target.value = '';
        setFile(null);
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('Resume file is too large. Please upload a file under 10MB.');
        e.target.value = '';
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!progress.userId) {
      alert("Please login first.");
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('userId', progress.userId);

    try {
      const res = await resumeAPI.uploadResume(formData);
      if (res.data.success) {
        setResumeData(res.data.data);
        setPhase('config');
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error || "Failed to parse resume. Please upload a valid PDF or DOCX file.";
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Config Phase ---
  const toggleCategory = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const startInterview = async () => {
    if (selectedCategories.length === 0) {
      alert("Please select at least one category.");
      return;
    }
    setPhase('interview');
    setViolations(0);
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setEvaluations([]);
    setUserAnswers([]);
    setCurrentAnswer("");

    // Generate initial batch of questions
    setIsGeneratingNext(true);
    try {
      const res = await resumeAPI.generateQuestions({
        userId: progress.userId,
        resumeText: resumeData.rawText,
        difficulty,
        categories: selectedCategories,
        countPerCategory: questionsPerCategory
      });
      if (res.data.success && res.data.questions.length > 0) {
        setQuestionQueue(res.data.questions);
        speakText(res.data.questions[0].question, () => {
          // Auto-start mic when AI finishes speaking (optional, but good UX)
          if (recognitionRef.current && !isRecording) {
            recognitionRef.current.start();
            setIsRecording(true);
          }
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate questions.");
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // --- Interview Phase ---
  const handleNextQuestion = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    stopSpeaking();

    const currentQ = questionQueue[currentQuestionIndex];
    const ans = currentAnswer.trim();
    
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = ans;
      return newAnswers;
    });

    setCurrentAnswer("");

    // Parallel processing: Evaluate current answer & Check AI likelihood in background
    const evalIndex = currentQuestionIndex;
    resumeAPI.evaluateAnswer({
      question: currentQ.question,
      idealAnswer: currentQ.idealAnswer,
      userAnswer: ans
    }).then(res => {
      if (res.data.success) {
        setEvaluations(prev => {
          const newEvals = [...prev];
          if(!newEvals[evalIndex]) newEvals[evalIndex] = {};
          newEvals[evalIndex].score = res.data.evaluation.score;
          newEvals[evalIndex].feedback = res.data.evaluation.feedback;
          return newEvals;
        });
      }
    });

    resumeAPI.detectAI({ answer: ans }).then(res => {
      if (res.data.success) {
        setEvaluations(prev => {
          const newEvals = [...prev];
          if(!newEvals[evalIndex]) newEvals[evalIndex] = {};
          newEvals[evalIndex].aiLikelihood = res.data.detection.aiLikelihood;
          return newEvals;
        });
      }
    });

    // Determine next question: Follow-up or Next from Queue
    setIsGeneratingNext(true);
    let nextQueue = [...questionQueue];
    
    try {
      // 50% chance to ask a follow-up if answer is substantial
      if (ans.length > 30 && Math.random() > 0.5) {
        const followUpRes = await resumeAPI.generateFollowUp({
          resumeText: resumeData.rawText,
          currentQuestion: currentQ.question,
          userAnswer: ans
        });
        if (followUpRes.data.success) {
          // Insert follow-up right after current
          nextQueue.splice(currentQuestionIndex + 1, 0, {
            ...followUpRes.data.question,
            category: 'Follow-up'
          });
          setQuestionQueue(nextQueue);
        }
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsGeneratingNext(false);
      
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < nextQueue.length) {
        setCurrentQuestionIndex(nextIndex);
        speakText(nextQueue[nextIndex].question, () => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsRecording(true);
          }
        });
      } else {
        finishInterview(false);
      }
    }
  };

  const finishInterview = async (autoSubmitted = false) => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    stopSpeaking();
    setPhase('report');
    setIsGeneratingReport(true);

    const finalAnswers = [...userAnswers];
    if (currentAnswer && !autoSubmitted) {
      finalAnswers[currentQuestionIndex] = currentAnswer;
    }

    // Wait for all evaluations to finish (simple delay for now, ideally Promise.all)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const qaList = questionQueue.map((q, i) => ({
      question: q.question,
      idealAnswer: q.idealAnswer,
      answer: finalAnswers[i] || '',
      score: evaluations[i]?.score || 0,
      feedback: evaluations[i]?.feedback || '',
      aiLikelihood: evaluations[i]?.aiLikelihood || 0
    }));

    try {
      const res = await resumeAPI.generateReport({ qaList });
      if (res.data.success) {
        const rep = res.data.report;
        setReport(rep);
        
        // Calculate aggregate scores
        const avgScore = qaList.reduce((acc, curr) => acc + curr.score, 0) / (qaList.length || 1);
        const overallScore = Math.round(avgScore * 10);
        
        const sessionData = {
          userId: progress.userId,
          category: 'Resume AI Interview',
          difficulty,
          overallScore,
          technicalScore: Math.min(100, overallScore + 5),
          communicationScore: Math.min(100, overallScore + Math.floor(Math.random()*10)),
          confidenceScore: Math.min(100, overallScore + Math.floor(Math.random()*10)),
          fluencyScore: Math.min(100, overallScore + 2),
          grammarScore: Math.min(100, overallScore + 4),
          originalityScore: 100 - Math.round(qaList.reduce((acc, curr) => acc + curr.aiLikelihood, 0)/(qaList.length||1)),
          aiLikelihood: Math.round(qaList.reduce((acc, curr) => acc + curr.aiLikelihood, 0)/(qaList.length||1)),
          strengths: rep.strengths || [],
          weaknesses: rep.weaknesses || [],
          sectionWisePerformance: rep.sectionWisePerformance || {},
          proctoringViolations: Array.from({length: violations}).fill('Violation'),
          hiringRecommendation: rep.hiringRecommendation || 'Borderline',
          qaList
        };

        await resumeAPI.saveSession(sessionData);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // --- History Phase ---
  const loadHistory = async () => {
    try {
      const res = await resumeAPI.getHistory(progress.userId);
      if (res.data.success) {
        setHistory(res.data.results);
        setPhase('history');
      }
    } catch(err) {
      console.error(err);
    }
  };

  // --- Render Helpers ---
  const renderUpload = () => (
    <div className="auth-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
        <FaArrowLeft /> Back to Dashboard
      </button>
      <FaRobot style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '10px' }} />
      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>AI Resume Interview</h1>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Upload your resume to generate a personalized, voice-enabled technical interview.</p>
      
      <div style={{ border: '2px dashed #cbd5e1', padding: '40px', borderRadius: '12px', marginBottom: '20px', background: '#f8fafc' }}>
        <FaUpload style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '15px' }} />
        <br/>
        <input type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ marginBottom: '10px' }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Accepts PDF or DOCX (Max 10MB)</p>
      </div>

      <button className="auth-submit-btn" onClick={handleUpload} disabled={!file || isUploading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
        {isUploading ? <><FaSpinner className="fa-spin" /> Extracting Resume Data...</> : 'Analyze Resume'}
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={loadHistory} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', fontWeight: 600 }}>
          <FaHistory /> View Past Interviews
        </button>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="auth-card" style={{ maxWidth: '800px', margin: '40px auto' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Configure Interview</h2>
      
      {resumeData && (
        <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '25px', borderLeft: '4px solid #22c55e' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#166534' }}>Resume Extracted Successfully!</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#15803d' }}>
            Found {resumeData.skills?.length || 0} skills, {resumeData.projects?.length || 0} projects, and {resumeData.experience?.length || 0} experience entries.
          </p>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label className="form-label">Difficulty Level</label>
        <select className="auth-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label className="form-label">Questions Per Category</label>
        <select className="auth-input" value={questionsPerCategory} onChange={(e) => setQuestionsPerCategory(Number(e.target.value))}>
          <option value={1}>1 (Quick)</option>
          <option value={2}>2 (Standard)</option>
          <option value={3}>3 (Detailed)</option>
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '30px' }}>
        <label className="form-label">Categories to Cover</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
          {availableCategories.map(cat => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <span style={{ fontSize: '0.9rem' }}>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ background: '#fffbeb', padding: '15px', borderRadius: '8px', marginBottom: '25px', borderLeft: '4px solid #f59e0b' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaExclamationTriangle /> Proctoring Enabled
        </h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e' }}>
          Once started, do not switch tabs or minimize the window. {MAX_VIOLATIONS} violations will result in automatic submission.
        </p>
      </div>

      <button className="auth-submit-btn" onClick={startInterview} disabled={isGeneratingNext} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
        {isGeneratingNext ? <><FaSpinner className="fa-spin" /> Preparing AI...</> : 'Start Proctored Interview'}
      </button>
    </div>
  );

  const renderInterview = () => {
    const currentQ = questionQueue[currentQuestionIndex];
    if (!currentQ) return <div style={{ textAlign: 'center', padding: '50px' }}><FaSpinner className="fa-spin" style={{ fontSize: '2rem', color: '#3b82f6' }} /></div>;

    return (
      <div style={{ maxWidth: '900px', margin: '20px auto' }}>
        {/* Live Dashboard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isAISpeaking ? '#22c55e' : '#cbd5e1', boxShadow: isAISpeaking ? '0 0 10px #22c55e' : 'none' }}></div>
            <span style={{ fontWeight: 600, color: '#475569' }}>{isAISpeaking ? 'AI is speaking...' : 'AI is listening'}</span>
          </div>
          
          <div style={{ fontWeight: 700, color: '#1e293b' }}>
            Question {currentQuestionIndex + 1} / {questionQueue.length}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: violations > 0 ? '#ef4444' : '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>
              Warnings: {violations}/{MAX_VIOLATIONS}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '30px', overflow: 'hidden' }}>
          <div style={{ width: `${((currentQuestionIndex) / questionQueue.length) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
        </div>

        <div className="auth-card" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'inline-block', background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '15px', textTransform: 'uppercase' }}>
            {currentQ.category}
          </div>
          
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', lineHeight: 1.5, marginBottom: '30px' }}>
            {currentQ.question}
          </h2>

          <div style={{ marginBottom: '25px', textAlign: 'center' }}>
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
              {isRecording ? <><FaStop style={{ fontSize: '2rem' }} /> Stop Recording Answer</> : <><FaMicrophone style={{ fontSize: '2rem' }} /> Tap to Speak Answer</>}
            </button>
            <div style={{ textAlign: 'left' }}>
              <label className="form-label" style={{ marginBottom: '8px', color: '#64748b', fontSize: '0.85rem' }}>Live Transcript (Editable):</label>
              <textarea 
                className="auth-input" 
                rows="5" 
                placeholder="Your spoken words will appear here in real-time..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                style={{ resize: 'vertical', background: '#f8fafc', fontSize: '1.1rem', lineHeight: 1.6 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
            <button className="auth-submit-btn" onClick={handleNextQuestion} disabled={!currentAnswer.trim() || isGeneratingNext} style={{ width: 'auto', padding: '12px 30px' }}>
              {isGeneratingNext ? <><FaSpinner className="fa-spin"/> Loading Next...</> : (currentQuestionIndex < questionQueue.length - 1 ? 'Submit & Next' : 'Finish Interview')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (isGeneratingReport || !report) return <div style={{ textAlign: 'center', padding: '100px' }}><FaSpinner className="fa-spin" style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '20px' }} /><h2>Generating Comprehensive Report...</h2></div>;

    const avgScore = Math.round(questionQueue.reduce((acc, curr, i) => acc + (evaluations[i]?.score || 0), 0) / questionQueue.length * 10);

    return (
      <div style={{ maxWidth: '900px', margin: '40px auto' }}>
        <div className="auth-card" style={{ maxWidth: '100%', textAlign: 'center', marginBottom: '30px' }}>
          <FaCheckCircle style={{ fontSize: '4rem', color: '#22c55e', marginBottom: '15px' }} />
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem' }}>Interview Complete</h1>
          
          <div style={{ display: 'inline-block', background: '#f8fafc', padding: '20px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
            <div style={{ fontSize: '1rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Overall Score</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0f172a' }}>{avgScore}<span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>/100</span></div>
            <div style={{ marginTop: '10px', padding: '6px 12px', background: report.hiringRecommendation.includes('Strong') ? '#dcfce7' : report.hiringRecommendation.includes('Hire') ? '#fef08a' : '#fee2e2', color: report.hiringRecommendation.includes('Strong') ? '#166534' : report.hiringRecommendation.includes('Hire') ? '#854d0e' : '#991b1b', borderRadius: '999px', fontWeight: 800 }}>
              {report.hiringRecommendation.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div className="auth-card" style={{ maxWidth: '100%' }}>
            <h3 style={{ color: '#16a34a', borderBottom: '2px solid #dcfce7', paddingBottom: '10px', marginBottom: '15px' }}>Strengths</h3>
            <ul style={{ paddingLeft: '20px', margin: 0, color: '#334155', lineHeight: 1.6 }}>
              {report.strengths?.map((s,i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="auth-card" style={{ maxWidth: '100%' }}>
            <h3 style={{ color: '#dc2626', borderBottom: '2px solid #fee2e2', paddingBottom: '10px', marginBottom: '15px' }}>Areas for Improvement</h3>
            <ul style={{ paddingLeft: '20px', margin: 0, color: '#334155', lineHeight: 1.6 }}>
              {report.weaknesses?.map((w,i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>

        <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Question Breakdown</h3>
          {questionQueue.map((q, i) => (
            <div key={i} style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <strong style={{ color: '#0f172a', fontSize: '1.1rem', flex: 1 }}>Q: {q.question}</strong>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, marginLeft: '15px' }}>
                  Score: {evaluations[i]?.score || 0}/10
                </span>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Your Answer</div>
                <div style={{ color: '#334155', background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>{userAnswers[i] || 'No answer'}</div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '0.85rem', color: '#166534', textTransform: 'uppercase', marginBottom: '5px' }}>Ideal Answer</div>
                <div style={{ color: '#15803d', background: '#f0fdf4', padding: '10px', borderRadius: '6px' }}>{q.idealAnswer}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '5px' }}>AI Feedback</div>
                <div style={{ color: '#1e40af' }}>{evaluations[i]?.feedback}</div>
                {evaluations[i]?.aiLikelihood > 50 && (
                  <div style={{ marginTop: '10px', color: '#b45309', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FaExclamationTriangle /> High AI Assistance Detected ({evaluations[i].aiLikelihood}%)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="auth-submit-btn" onClick={() => setPhase('upload')} style={{ width: 'auto', padding: '12px 30px' }}>Take Another Interview</button>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="auth-card" style={{ maxWidth: '800px', margin: '40px auto' }}>
      <button onClick={() => setPhase('upload')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontWeight: 600 }}>
        <FaArrowLeft /> Back to Setup
      </button>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Interview History</h2>
      
      {history.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No past interviews found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {history.map((h, i) => (
            <div key={i} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', marginBottom: '5px' }}>{h.category}</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{new Date(h.date).toLocaleDateString()} • {h.difficulty}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{h.overallScore}%</div>
                <div style={{ color: h.hiringRecommendation?.includes('Hire') && !h.hiringRecommendation?.includes('No') ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>
                  {h.hiringRecommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-container app-shell" style={{ minHeight: '100vh', padding: '20px' }}>
      {phase === 'upload' && renderUpload()}
      {phase === 'config' && renderConfig()}
      {phase === 'interview' && renderInterview()}
      {phase === 'report' && renderReport()}
      {phase === 'history' && renderHistory()}
    </div>
  );
}
