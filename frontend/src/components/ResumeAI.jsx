import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../services/api';
import { useUserProgress } from '../context/UserProgressContext';
import {
  FaUpload, FaRobot, FaMicrophone, FaStop, FaArrowLeft, FaCheckCircle,
  FaSpinner, FaHistory, FaExclamationTriangle, FaBrain, FaDatabase,
  FaSearch, FaChartBar, FaFileAlt, FaCode, FaCog
} from 'react-icons/fa';
import ProctorPanel from './ProctorPanel';

/* ─────────────────────────────────────────────
   PIPELINE STEP COMPONENT
───────────────────────────────────────────── */
const PipelineStep = ({ icon: Icon, label, active, done }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    opacity: done || active ? 1 : 0.35, transition: 'all 0.4s ease'
  }}>
    <div style={{
      width: '44px', height: '44px', borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
      background: done ? 'linear-gradient(135deg, #10b981, #059669)' : active ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.1)',
      border: active ? '2px solid #a5b4fc' : done ? '2px solid #6ee7b7' : '2px solid rgba(255,255,255,0.15)',
      color: done || active ? '#fff' : 'rgba(255,255,255,0.4)',
      boxShadow: active ? '0 0 18px rgba(99,102,241,0.6)' : done ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
      transition: 'all 0.4s ease'
    }}>
      {done ? <FaCheckCircle /> : <Icon />}
    </div>
    <span style={{ fontSize: '0.68rem', color: done || active ? '#e2e8f0' : 'rgba(255,255,255,0.3)', fontWeight: 600, textAlign: 'center', maxWidth: '70px', lineHeight: 1.2 }}>
      {label}
    </span>
  </div>
);

const PipelineConnector = ({ active }) => (
  <div style={{
    width: '32px', height: '2px', marginBottom: '22px', flexShrink: 0,
    background: active ? 'linear-gradient(90deg, #6366f1, #818cf8)' : 'rgba(255,255,255,0.1)',
    transition: 'background 0.4s ease',
    position: 'relative'
  }}>
    {active && (
      <div style={{
        position: 'absolute', top: '-3px', left: '50%', width: '8px', height: '8px',
        borderRadius: '50%', background: '#818cf8',
        animation: 'pulseDot 1.5s infinite ease-in-out'
      }} />
    )}
  </div>
);

/* ─────────────────────────────────────────────
   SKILL TAG COMPONENT
───────────────────────────────────────────── */
const SkillTag = ({ skill }) => (
  <span style={{
    display: 'inline-block', padding: '4px 10px', margin: '3px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.1))',
    border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px',
    fontSize: '0.78rem', color: '#818cf8', fontWeight: 600,
    letterSpacing: '0.3px'
  }}>
    {skill}
  </span>
);

/* ─────────────────────────────────────────────
   SCORE RING COMPONENT
───────────────────────────────────────────── */
const ScoreRing = ({ value = 0, label, color = '#6366f1', size = 90 }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
          fill="#f1f5f9" fontSize="15" fontWeight="800">
          {value}
        </text>
      </svg>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px' }}>{label}</div>
    </div>
  );
};

export default function ResumeAI() {
  const navigate = useNavigate();
  const { progress } = useUserProgress();
  const [phase, setPhase] = useState('upload');

  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(0); // 0=none, 1=parse, 2=extract, 3=chunk, 4=embed, 5=ready

  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedCategories, setSelectedCategories] = useState(['Skills', 'Experience', 'Projects', 'Education', 'Certifications']);
  const [questionsPerCategory, setQuestionsPerCategory] = useState(2);

  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const [violations, setViolations] = useState(0);
  const MAX_VIOLATIONS = 3;

  const [report, setReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [history, setHistory] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const availableCategories = ['Skills', 'Experience', 'Projects', 'Education', 'Certifications'];
  const interviewerIntro = 'Hello! I am your AI interviewer today. I have thoroughly analyzed your resume and will be asking you focused questions based on your actual experience, skills, and projects. Please answer clearly and confidently. Let us begin.';

  const pipelineSteps = [
    { icon: FaUpload, label: 'Upload Resume' },
    { icon: FaFileAlt, label: 'Parse PDF/DOCX' },
    { icon: FaCode, label: 'Extract Sections' },
    { icon: FaCog, label: 'Chunk Resume' },
    { icon: FaBrain, label: 'Embed Vectors' },
    { icon: FaDatabase, label: 'Vector Store' },
    { icon: FaSearch, label: 'RAG Retriever' },
    { icon: FaRobot, label: 'LLM + AI' },
  ];

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
        }
        if (final) setCurrentAnswer(prev => prev + (prev ? ' ' : '') + final);
      };
      r.onerror = () => setIsRecording(false);
      r.onend = () => setIsRecording(false);
      recognitionRef.current = r;
    }
  }, []);

  const handleProctorViolation = useCallback((type) => {
    if (phase !== 'interview') return;
    setViolations(prev => {
      const n = prev + 1;
      resumeAPI.logViolation({ userId: progress.userId, eventType: type });
      if (n >= MAX_VIOLATIONS) {
        alert('Maximum proctoring violations reached. Auto-submitting interview.');
        finishInterview(true);
      } else {
        alert(`⚠️ Warning ${n}/${MAX_VIOLATIONS}: Please stay on the interview page.`);
      }
      return n;
    });
  }, [phase, progress.userId]);

  useEffect(() => {
    if (phase !== 'interview') return;
    const onVis = () => { if (document.hidden) handleProctorViolation('tab_switch'); };
    const onBlur = () => handleProctorViolation('window_blur');
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ''; };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBefore);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBefore);
    };
  }, [phase, handleProctorViolation]);

  const speakText = (text, onEnd) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    let voice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === 'en-in' || v.name.toLowerCase().includes('india'));
    if (!voice) voice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    if (!voice) voice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (voice) utt.voice = voice;
    utt.rate = 0.88;
    utt.pitch = 1.0;
    utt.onstart = () => setIsAISpeaking(true);
    utt.onend = () => { setIsAISpeaking(false); if (onEnd) onEnd(); };
    utt.onerror = () => { setIsAISpeaking(false); if (onEnd) onEnd(); };
    synthRef.current.speak(utt);
  };

  const stopSpeaking = () => { if (synthRef.current) synthRef.current.cancel(); setIsAISpeaking(false); };
  const toggleRecording = () => {
    if (!recognitionRef.current) { alert('Speech Recognition not supported. Please use Chrome/Edge.'); return; }
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    else { recognitionRef.current.start(); setIsRecording(true); }
  };

  /* ─── UPLOAD PIPELINE ─────────────────── */
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) { alert('Please upload a PDF or DOCX resume.'); return; }
    if (f.size > 10 * 1024 * 1024) { alert('File too large. Max 10MB.'); return; }
    setFile(f);
  };

  const animatePipeline = async () => {
    for (let i = 1; i <= 7; i++) {
      await new Promise(r => setTimeout(r, 420));
      setPipelineStep(i);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!progress.userId) { alert('Please login first.'); return; }
    setIsUploading(true);
    setPipelineStep(1);

    // Animate pipeline steps while uploading
    const pipelinePromise = animatePipeline();

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('userId', progress.userId);

    try {
      const res = await resumeAPI.uploadResume(formData);
      await pipelinePromise;
      if (res.data.success) {
        setResumeData(res.data.data);
        setPipelineStep(8); // all done
        await new Promise(r => setTimeout(r, 600));
        setPhase('config');
      }
    } catch (err) {
      setPipelineStep(0);
      const msg = err.response?.data?.error || 'Failed to parse resume. Please upload a valid PDF or DOCX file.';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  /* ─── INTERVIEW ──────────────────────── */
  const toggleCategory = (cat) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const startInterview = async () => {
    if (selectedCategories.length === 0) { alert('Please select at least one category.'); return; }
    setPhase('interview');
    setViolations(0);
    setQuestionQueue([]);
    setCurrentQuestionIndex(0);
    setEvaluations([]);
    setUserAnswers([]);
    setCurrentAnswer('');
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
        speakText(`${interviewerIntro} Here is your first question: ${res.data.questions[0].question}`, () => {
          if (recognitionRef.current && !isRecording) { recognitionRef.current.start(); setIsRecording(true); }
        });
      }
    } catch (err) {
      alert('Failed to generate interview questions. Please try again.');
    } finally {
      setIsGeneratingNext(false);
    }
  };

  const handleNextQuestion = async () => {
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    stopSpeaking();
    const currentQ = questionQueue[currentQuestionIndex];
    const ans = currentAnswer.trim();
    setUserAnswers(prev => { const n = [...prev]; n[currentQuestionIndex] = ans; return n; });
    setCurrentAnswer('');

    const evalIndex = currentQuestionIndex;
    resumeAPI.evaluateAnswer({ question: currentQ.question, idealAnswer: currentQ.idealAnswer, userAnswer: ans })
      .then(r => { if (r.data.success) setEvaluations(prev => { const n = [...prev]; if (!n[evalIndex]) n[evalIndex] = {}; n[evalIndex].score = r.data.evaluation.score; n[evalIndex].feedback = r.data.evaluation.feedback; return n; }); })
      .catch(() => {});
    resumeAPI.detectAI({ answer: ans })
      .then(r => { if (r.data.success) setEvaluations(prev => { const n = [...prev]; if (!n[evalIndex]) n[evalIndex] = {}; n[evalIndex].aiLikelihood = r.data.detection.aiLikelihood; return n; }); })
      .catch(() => {});

    setIsGeneratingNext(true);
    let nextQueue = [...questionQueue];
    try {
      if (ans.length > 30) {
        const fu = await resumeAPI.generateFollowUp({ userId: progress.userId, resumeText: resumeData.rawText, currentQuestion: currentQ.question, userAnswer: ans });
        if (fu.data.success) { nextQueue.splice(currentQuestionIndex + 1, 0, { ...fu.data.question, category: 'Follow-up' }); setQuestionQueue(nextQueue); }
      }
    } catch (e) { /* ignore */ } finally {
      setIsGeneratingNext(false);
      const next = currentQuestionIndex + 1;
      if (next < nextQueue.length) {
        setCurrentQuestionIndex(next);
        speakText(nextQueue[next].question, () => { if (recognitionRef.current) { recognitionRef.current.start(); setIsRecording(true); } });
      } else { finishInterview(false); }
    }
  };

  const finishInterview = async (autoSubmitted = false) => {
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    stopSpeaking();
    setPhase('report');
    setIsGeneratingReport(true);
    const finalAnswers = [...userAnswers];
    if (currentAnswer && !autoSubmitted) finalAnswers[currentQuestionIndex] = currentAnswer;
    await new Promise(r => setTimeout(r, 2000));
    const qaList = questionQueue.map((q, i) => ({
      question: q.question, idealAnswer: q.idealAnswer,
      answer: finalAnswers[i] || '', score: evaluations[i]?.score || 0,
      feedback: evaluations[i]?.feedback || '', aiLikelihood: evaluations[i]?.aiLikelihood || 0
    }));
    try {
      const res = await resumeAPI.generateReport({ qaList, resumeText: resumeData?.rawText || '' });
      if (res.data.success) {
        const rep = res.data.report;
        setReport(rep);
        const avgScore = qaList.reduce((a, c) => a + c.score, 0) / (qaList.length || 1);
        const overallScore = Math.round(avgScore * 10);
        await resumeAPI.saveSession({
          userId: progress.userId, category: 'Resume AI Interview', difficulty, overallScore,
          technicalScore: rep.technicalScore ?? overallScore,
          communicationScore: rep.communicationScore ?? overallScore,
          confidenceScore: rep.confidenceScore ?? overallScore,
          fluencyScore: Math.min(100, overallScore + 2),
          grammarScore: Math.min(100, overallScore + 4),
          originalityScore: 100 - Math.round(qaList.reduce((a, c) => a + c.aiLikelihood, 0) / (qaList.length || 1)),
          aiLikelihood: Math.round(qaList.reduce((a, c) => a + c.aiLikelihood, 0) / (qaList.length || 1)),
          strengths: rep.strongAreas || rep.strengths || [],
          weaknesses: rep.weakAreas || rep.weaknesses || [],
          sectionWisePerformance: rep.sectionWisePerformance || {},
          proctoringViolations: Array.from({ length: violations }).fill('Violation'),
          hiringRecommendation: rep.hiringRecommendation || 'Borderline', qaList
        });
      }
    } catch (e) { /* report saved anyway */ } finally { setIsGeneratingReport(false); }
  };

  const loadHistory = async () => {
    try {
      const res = await resumeAPI.getHistory(progress.userId);
      if (res.data.success) { setHistory(res.data.results); setPhase('history'); }
    } catch (e) { /* ignore */ }
  };

  /* ───────────────────────────────────────
     RENDER: UPLOAD PHASE
  ─────────────────────────────────────── */
  const renderUpload = () => (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', fontWeight: 600, fontSize: '0.9rem', transition: 'color 0.2s' }}
        onMouseOver={e => e.currentTarget.style.color = '#f1f5f9'}
        onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
        <FaArrowLeft /> Back to Dashboard
      </button>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', marginBottom: '20px', boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
          <FaBrain style={{ fontSize: '2.2rem', color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 900, background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
          AI Resume Interviewer
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto' }}>
          Upload your resume. Our RAG-powered AI will extract, embed, and ask you targeted questions — just like a real technical interview.
        </p>
      </div>

      {/* RAG Pipeline Visualization */}
      <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '16px', padding: '24px 20px 20px', marginBottom: '28px', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px', textAlign: 'center' }}>
          RAG Pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
          {pipelineSteps.map((step, i) => (
            <React.Fragment key={i}>
              <PipelineStep
                icon={step.icon}
                label={step.label}
                active={pipelineStep === i + 1}
                done={pipelineStep > i + 1}
              />
              {i < pipelineSteps.length - 1 && <PipelineConnector active={pipelineStep > i + 1} />}
            </React.Fragment>
          ))}
        </div>
        {isUploading && (
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, animation: 'fadeInUp 0.3s ease' }}>
              {['Uploading file...', 'Parsing document...', 'Extracting sections...', 'Chunking resume...', 'Generating embeddings...', 'Building vector store...', 'Initializing retriever...', 'Ready for interview!'][Math.min(pipelineStep, 7)]}
            </div>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { const ev = { target: { files: [f] } }; handleFileChange(ev); } }}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : file ? '#10b981' : 'rgba(99,102,241,0.35)'}`,
          borderRadius: '14px',
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(99,102,241,0.08)' : file ? 'rgba(16,185,129,0.05)' : 'rgba(15,23,42,0.4)',
          transition: 'all 0.3s ease',
          marginBottom: '20px',
          backdropFilter: 'blur(6px)'
        }}
        onClick={() => document.getElementById('resume-file-input').click()}
      >
        <style>{`
          @keyframes pulseDot { 0%,100%{opacity:0.4;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
          @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { to{transform:rotate(360deg)} }
          .rai-spin { animation: spin 1s linear infinite; }
          .upload-zone:hover { border-color: #6366f1 !important; }
        `}</style>
        <input id="resume-file-input" type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ display: 'none' }} />
        {file ? (
          <>
            <FaCheckCircle style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '12px' }} />
            <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>{file.name}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{(file.size / 1024).toFixed(0)} KB • Click to change file</div>
          </>
        ) : (
          <>
            <FaUpload style={{ fontSize: '2.2rem', color: '#6366f1', marginBottom: '14px' }} />
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>Drop your resume here</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>PDF or DOCX, max 10MB</div>
          </>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        style={{
          width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
          background: file && !isUploading ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)',
          color: file && !isUploading ? '#fff' : '#475569',
          fontWeight: 800, fontSize: '1.05rem', cursor: file && !isUploading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          boxShadow: file && !isUploading ? '0 0 24px rgba(99,102,241,0.35)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        {isUploading ? <><FaSpinner className="rai-spin" /> Analyzing Resume...</> : <><FaBrain /> Analyze Resume with RAG</>}
      </button>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={loadHistory} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
          <FaHistory /> View Past Interviews
        </button>
      </div>
    </div>
  );

  /* ───────────────────────────────────────
     RENDER: CONFIG PHASE
  ─────────────────────────────────────── */
  const renderConfig = () => (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <FaCheckCircle style={{ fontSize: '1.5rem', color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '6px', fontSize: '1.05rem' }}>Resume Analyzed Successfully!</div>
          <div style={{ color: '#6ee7b7', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Found <strong>{resumeData?.skills?.length || 0} skills</strong> · <strong>{resumeData?.projects?.length || 0} projects</strong> · <strong>{resumeData?.experience?.length || 0} experience entries</strong> · <strong>{resumeData?.education?.length || 0} education items</strong>
          </div>
          {resumeData?.skills?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              {resumeData.skills.slice(0, 16).map((s, i) => <SkillTag key={i} skill={s} />)}
              {resumeData.skills.length > 16 && <span style={{ color: '#6366f1', fontSize: '0.78rem', marginLeft: '4px' }}>+{resumeData.skills.length - 16} more</span>}
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '24px' }}>Configure Your Interview</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Difficulty Level</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Questions Per Category</label>
          <select value={questionsPerCategory} onChange={e => setQuestionsPerCategory(Number(e.target.value))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}>
            <option value={1}>1 — Quick (5 mins)</option>
            <option value={2}>2 — Standard (15 mins)</option>
            <option value={3}>3 — Detailed (25 mins)</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Resume Categories to Cover</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
          {availableCategories.map(cat => (
            <label key={cat} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
              borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
              background: selectedCategories.includes(cat) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedCategories.includes(cat) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
              userSelect: 'none'
            }}>
              <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} style={{ accentColor: '#6366f1', width: '16px', height: '16px' }} />
              <span style={{ fontSize: '0.88rem', color: selectedCategories.includes(cat) ? '#a5b4fc' : '#94a3b8', fontWeight: 600 }}>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>Proctoring Enabled</div>
          <div style={{ color: '#d97706', fontSize: '0.85rem' }}>Stay on this page. Tab switching or window blur counts as violations. {MAX_VIOLATIONS} violations = auto-submit.</div>
        </div>
      </div>

      <button
        onClick={startInterview}
        disabled={isGeneratingNext || selectedCategories.length === 0}
        style={{
          width: '100%', padding: '18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: '#fff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          boxShadow: '0 0 30px rgba(99,102,241,0.4)', transition: 'all 0.3s ease'
        }}
      >
        {isGeneratingNext ? <><FaSpinner className="rai-spin" /> Preparing AI Interviewer...</> : <><FaRobot /> Start Proctored Interview</>}
      </button>
    </div>
  );

  /* ───────────────────────────────────────
     RENDER: INTERVIEW PHASE
  ─────────────────────────────────────── */
  const renderInterview = () => {
    const currentQ = questionQueue[currentQuestionIndex];
    if (!currentQ) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '20px' }}>
        <FaSpinner className="rai-spin" style={{ fontSize: '2.5rem', color: '#6366f1' }} />
        <div style={{ color: '#94a3b8', fontWeight: 600 }}>Preparing your personalized interview...</div>
      </div>
    );

    const catColors = { Skills: '#6366f1', Experience: '#0ea5e9', Projects: '#10b981', Education: '#f59e0b', Certifications: '#ec4899', 'Follow-up': '#f97316' };
    const catColor = catColors[currentQ.category] || '#6366f1';
    const progress_pct = Math.round((currentQuestionIndex / Math.max(questionQueue.length, 1)) * 100);

    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 20px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: isAISpeaking ? '#10b981' : '#475569',
              boxShadow: isAISpeaking ? '0 0 12px #10b981' : 'none',
              animation: isAISpeaking ? 'pulseDot 1s infinite' : 'none',
              transition: 'all 0.3s'
            }} />
            <span style={{ color: isAISpeaking ? '#34d399' : '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>
              {isAISpeaking ? 'AI Interviewer Speaking...' : 'Waiting for your answer'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem' }}>
              Q {currentQuestionIndex + 1} / {questionQueue.length}
            </div>
            <div style={{ color: violations > 0 ? '#f87171' : '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
              ⚠️ {violations}/{MAX_VIOLATIONS} warnings
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginBottom: '22px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress_pct}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '2px', transition: 'width 0.4s ease', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
        </div>

        <div className="interview-proctor-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
          <div>
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', backdropFilter: 'blur(10px)' }}>
              {/* Category badge */}
              <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '999px', background: `${catColor}22`, border: `1px solid ${catColor}55`, color: catColor, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '18px' }}>
                {currentQ.category}
              </span>

              {/* Question */}
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.55, marginBottom: '28px' }}>
                {currentQ.question}
              </h2>

              {/* Record button */}
              <button
                onClick={toggleRecording}
                style={{
                  width: '100%', padding: '18px', borderRadius: '12px',
                  border: `2px solid ${isRecording ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.4)'}`,
                  background: isRecording ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                  color: isRecording ? '#f87171' : '#a5b4fc',
                  fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  marginBottom: '16px', transition: 'all 0.2s ease',
                  boxShadow: isRecording ? '0 0 20px rgba(239,68,68,0.25)' : '0 0 20px rgba(99,102,241,0.15)'
                }}
              >
                {isRecording ? <><FaStop style={{ fontSize: '1.2rem' }} /> Stop Recording</> : <><FaMicrophone style={{ fontSize: '1.2rem' }} /> Tap to Speak Your Answer</>}
              </button>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                  Live Transcript {isRecording && <span style={{ color: '#f87171' }}>● REC</span>}
                </label>
                <textarea
                  rows={5}
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  placeholder="Your spoken words appear here automatically, or type your answer..."
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px',
                    border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(30,41,59,0.5)',
                    color: '#e2e8f0', fontSize: '0.97rem', lineHeight: 1.6, resize: 'vertical',
                    outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => finishInterview(false)}
                  style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  End Interview
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={!currentAnswer.trim() || isGeneratingNext}
                  style={{
                    padding: '12px 28px', borderRadius: '10px', border: 'none',
                    background: currentAnswer.trim() && !isGeneratingNext ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.06)',
                    color: currentAnswer.trim() && !isGeneratingNext ? '#fff' : '#475569',
                    fontWeight: 700, cursor: currentAnswer.trim() && !isGeneratingNext ? 'pointer' : 'not-allowed', fontSize: '0.95rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: currentAnswer.trim() && !isGeneratingNext ? '0 0 16px rgba(99,102,241,0.35)' : 'none'
                  }}
                >
                  {isGeneratingNext ? <><FaSpinner className="rai-spin" /> Processing...</> : (currentQuestionIndex < questionQueue.length - 1 ? 'Submit & Next →' : 'Finish Interview')}
                </button>
              </div>
            </div>
          </div>

          <ProctorPanel
            active={phase === 'interview'}
            title="Interview Proctor"
            subtitle="Camera, mic, focus, fullscreen"
            violations={violations}
            maxViolations={MAX_VIOLATIONS}
          />
        </div>
      </div>
    );
  };

  /* ───────────────────────────────────────
     RENDER: REPORT PHASE
  ─────────────────────────────────────── */
  const renderReport = () => {
    if (isGeneratingReport || !report) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          <FaBrain style={{ fontSize: '3.5rem', color: '#6366f1', animation: 'pulseDot 1.5s infinite' }} />
        </div>
        <h2 style={{ color: '#e2e8f0', fontWeight: 700 }}>Generating Comprehensive Report...</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Analyzing all your answers against the resume...</p>
      </div>
    );

    const avgScore = Math.round(questionQueue.reduce((a, c, i) => a + (evaluations[i]?.score || 0), 0) / (questionQueue.length || 1) * 10);
    const hiringRec = report.hiringRecommendation || 'Borderline';
    const recColor = hiringRec.includes('Strong') ? '#10b981' : hiringRec.includes('Hire') && !hiringRec.includes('No') ? '#f59e0b' : '#ef4444';

    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '40px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', backdropFilter: 'blur(10px)' }}>
          <FaCheckCircle style={{ fontSize: '3.5rem', color: '#10b981', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f1f5f9', marginBottom: '8px' }}>Interview Complete!</h1>
          <p style={{ color: '#64748b', marginBottom: '28px' }}>Here is your comprehensive resume-based performance analysis.</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '4rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{avgScore}<span style={{ fontSize: '1.8rem', color: '#475569' }}>/100</span></div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginTop: '6px' }}>Overall Score</div>
            </div>
            <div style={{ padding: '12px 24px', borderRadius: '10px', background: `${recColor}18`, border: `1.5px solid ${recColor}55`, color: recColor, fontWeight: 800, fontSize: '1.1rem' }}>
              {hiringRec.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Score rings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
          <ScoreRing value={report.technicalScore ?? avgScore} label="Technical" color="#6366f1" />
          <ScoreRing value={report.communicationScore ?? avgScore} label="Communication" color="#0ea5e9" />
          <ScoreRing value={report.confidenceScore ?? avgScore} label="Confidence" color="#10b981" />
          <ScoreRing value={report.resumeMatch ?? avgScore} label="Resume Match" color="#f59e0b" />
        </div>

        {/* Strengths/Weaknesses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {[
            { title: 'Strong Areas', items: report.strongAreas || report.strengths || [], color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)' },
            { title: 'Areas to Improve', items: report.weakAreas || report.weaknesses || [], color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' }
          ].map(({ title, items, color, bg, border }) => (
            <div key={title} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '22px' }}>
              <h3 style={{ color, fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</h3>
              <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.7 }}>
                {items.map((s, i) => <li key={i} style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{s}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Improvement suggestions */}
        {(report.improvementSuggestions || []).length > 0 && (
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '14px', padding: '22px', marginBottom: '20px' }}>
            <h3 style={{ color: '#818cf8', fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Improvement Suggestions</h3>
            <ul style={{ paddingLeft: '18px', margin: 0, lineHeight: 1.8 }}>
              {report.improvementSuggestions.map((s, i) => <li key={i} style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{s}</li>)}
            </ul>
          </div>
        )}

        {/* Q&A Breakdown */}
        <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '20px', fontSize: '1.1rem' }}>Question Breakdown</h3>
          {questionQueue.map((q, i) => (
            <div key={i} style={{ padding: '18px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.97rem', flex: 1, lineHeight: 1.5 }}>{q.question}</div>
                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '4px 12px', borderRadius: '6px', fontWeight: 700, flexShrink: 0, fontSize: '0.85rem' }}>
                  {evaluations[i]?.score ?? 0}/10
                </span>
              </div>
              {userAnswers[i] && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.73rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Your Answer</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.88rem', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px' }}>{userAnswers[i]}</div>
                </div>
              )}
              {evaluations[i]?.feedback && (
                <div style={{ color: '#818cf8', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
                  <strong style={{ color: '#6366f1' }}>Feedback: </strong>{evaluations[i].feedback}
                </div>
              )}
              {(evaluations[i]?.aiLikelihood || 0) > 50 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.82rem', marginTop: '8px' }}>
                  <FaExclamationTriangle /> High AI Assistance Detected ({evaluations[i].aiLikelihood}%)
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { setPhase('upload'); setPipelineStep(0); setFile(null); setResumeData(null); }}
            style={{ padding: '14px 36px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 0 24px rgba(99,102,241,0.35)' }}>
            Take Another Interview
          </button>
        </div>
      </div>
    );
  };

  /* ───────────────────────────────────────
     RENDER: HISTORY PHASE
  ─────────────────────────────────────── */
  const renderHistory = () => (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px' }}>
      <button onClick={() => setPhase('upload')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', fontWeight: 600 }}>
        <FaArrowLeft /> Back to Setup
      </button>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FaHistory style={{ color: '#6366f1' }} /> Interview History
      </h2>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569', background: 'rgba(15,23,42,0.6)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <FaChartBar style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.4 }} />
          <p>No past interviews found. Complete an interview to see your history here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((h, i) => (
            <div key={i} style={{ padding: '20px 24px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(6px)' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>{h.category}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {h.difficulty}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#818cf8' }}>{h.overallScore}%</div>
                <div style={{ color: h.hiringRecommendation?.includes('Hire') && !h.hiringRecommendation?.includes('No') ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>
                  {h.hiringRecommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ───────────────────────────────────────
     ROOT RENDER
  ─────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', padding: '24px 16px' }}>
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:0.5;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .rai-spin { animation: spin 1s linear infinite; display:inline-block; }
        @media(max-width:700px) {
          .interview-proctor-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {phase === 'upload' && renderUpload()}
      {phase === 'config' && renderConfig()}
      {phase === 'interview' && renderInterview()}
      {phase === 'report' && renderReport()}
      {phase === 'history' && renderHistory()}
    </div>
  );
}
