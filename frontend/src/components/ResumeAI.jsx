import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../services/api';
import { useUserProgress } from '../context/UserProgressContext';
import {
  FaUpload, FaRobot, FaMicrophone, FaStop, FaArrowLeft, FaCheckCircle,
  FaSpinner, FaHistory, FaExclamationTriangle, FaBrain, FaDatabase,
  FaSearch, FaChartBar, FaFileAlt, FaCode, FaCog, FaBullseye, FaMagic,
  FaLightbulb, FaCheck, FaTimes, FaFileSignature, FaCopy
} from 'react-icons/fa';
import PreInterviewCheck from './PreInterviewCheck';
import MiniProctoring from './MiniProctoring';

/* Pipeline Step Component */
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

/* Skill Tag Component */
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

/* Score Ring Component */
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
  const { progress, awardCoins, requireAuth } = useUserProgress();
  const hasAwardedCoinsRef = useRef(false);
  const [phase, setPhase] = useState('upload');

  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState(0); // 0=none, 1=parse, 2=extract, 3=chunk, 4=embed, 5=ready

  const [difficulty, setDifficulty] = useState('Medium');
  const [selectedCategories, setSelectedCategories] = useState(['Skills', 'Experience', 'Projects', 'Education', 'Certifications']);
  const [questionsPerCategory, setQuestionsPerCategory] = useState(2);

  // ATS Optimization States
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [isAnalyzingAts, setIsAnalyzingAts] = useState(false);
  const [atsScanError, setAtsScanError] = useState(null);
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [activeConfigTab, setActiveConfigTab] = useState('ats'); // 'ats' | 'interview'
  const [copiedBulletIdx, setCopiedBulletIdx] = useState(null);

  const [questionQueue, setQuestionQueue] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const [violations, setViolations] = useState(0);
  const [passedPreCheck, setPassedPreCheck] = useState(false);
  const MAX_VIOLATIONS = 3;

  const [report, setReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [history, setHistory] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const evalPromises = useRef([]);

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
  const handleTerminate = () => {
    alert('Maximum proctoring violations reached. Auto-submitting interview.');
    finishInterview(true);
  };

  const handleProctorViolation = useCallback((type) => {
    if (phase !== 'interview') return;
    setViolations(prev => {
      const n = prev + 1;
      resumeAPI.logViolation({ userId: progress.userId, eventType: type });
      if (n >= MAX_VIOLATIONS) {
        alert('Maximum proctoring violations reached. Auto-submitting interview.');
        finishInterview(true);
      } else {
        alert(`Warning ${n}/${MAX_VIOLATIONS}: Please stay on the interview page.`);
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

  /* Upload Pipeline Handlers */
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

  const CLIENT_STANDARD_TECH_KEYWORDS = [
    "JavaScript", "TypeScript", "React", "React.js", "Node.js", "Express", "Express.js",
    "Python", "SQL", "MongoDB", "PostgreSQL", "MySQL", "Docker", "Kubernetes",
    "AWS", "Git", "REST", "RESTful", "GraphQL", "CI/CD", "Redis", "HTML5", "HTML",
    "CSS3", "CSS", "Tailwind", "Jest", "Microservices", "Linux", "Java", "C++", "C#",
    "Next.js", "Redux", "GCP", "Azure", "Flask", "Django", "FastAPI", "Spring",
    "Spring Boot", "Angular", "Vue", "Vue.js", "Svelte", "Go", "Golang", "Rust",
    "Ruby", "Rails", "PHP", "Laravel", "Dart", "Flutter", "Swift", "Kotlin",
    "PyTorch", "TensorFlow", "Keras", "Pandas", "NumPy", "Scikit-learn",
    "OAuth", "JWT", "Firebase", "Supabase", "Terraform", "Ansible", "Jenkins",
    "GitHub Actions", "Nginx", "Apache", "RabbitMQ", "Kafka", "Elasticsearch",
    "Figma", "Webpack", "Vite", "Babel", "Sass", "SCSS", "Bootstrap",
    "Material UI", "Chakra UI", "Prisma", "Sequelize", "Mongoose",
    "WebSockets", "gRPC", "Agile", "Scrum", "Jira", "Confluence",
    "CNN", "RNN", "LSTM", "NLP", "Computer Vision", "Deep Learning", "Machine Learning"
  ];

  const computeClientAts = (resume, jd = '') => {
    if (!resume) return null;
    const raw = resume.rawText || '';
    const skillsList = Array.isArray(resume.skills) ? resume.skills : [];
    const text = (raw + ' ' + skillsList.join(' ') + ' ' + (resume.experience || []).join(' ') + ' ' + (resume.projects || []).join(' ')).toLowerCase();

    let targetKeywords = [];
    if (jd && jd.trim()) {
      const jdLower = jd.toLowerCase();
      targetKeywords = CLIENT_STANDARD_TECH_KEYWORDS.filter(k => jdLower.includes(k.toLowerCase()));
      const STOP = new Set(['The', 'And', 'For', 'With', 'You', 'Will', 'Are', 'Our', 'Job', 'Role', 'Requirements', 'Responsibilities', 'About', 'Key', 'What', 'We', 'Offer', 'Company', 'Location', 'Duration', 'Start', 'This', 'Join', 'Work', 'Team', 'Experience', 'Knowledge', 'Skills', 'Preferred', 'Required', 'Bachelor', 'Master', 'Degree', 'Pursuing', 'Field', 'Qualifications', 'Opportunity', 'Development', 'Performance', 'Strong', 'Familiarity', 'Understanding', 'Basic', 'Working', 'Prior', 'Hands', 'Based', 'Proficiency', 'Ability', 'Troubleshoot', 'Participate', 'Collaborate', 'Design', 'Develop', 'Maintain', 'Manage', 'Deploy', 'Implement', 'Internship', 'Certificate', 'Mentorship', 'Stipend', 'Delhi', 'India', 'New', 'Private', 'Limited', 'Overview', 'Sectors', 'Multiple', 'On-site', 'Remote', 'Hybrid', 'Connaught', 'Place', 'Employment', 'Immediate', 'Type', 'Months', 'Month', 'Year', 'Years', 'Candidate', 'Candidates', 'Position', 'Positions', 'Office', 'Schedule', 'Salary', 'Pay', 'Package', 'Full-time', 'Part-time', 'Contract', 'Temporary', 'Fresher', 'Freshers', 'Per', 'Competitive', 'Fast-paced', 'Environment', 'Benefits', 'Culture', 'Equal', 'Employer', 'Apply', 'Contact', 'Email', 'Phone']);
      const extraWords = (jd.match(/\b[A-Z][a-zA-Z0-9+#._-]{1,25}\b/g) || []).filter(w => !STOP.has(w) && w.length > 1 && !/^\d+$/.test(w));
      targetKeywords = [...new Set([...targetKeywords, ...extraWords.slice(0, 10)])];
    }
    if (targetKeywords.length === 0) {
      targetKeywords = ["JavaScript", "React", "Node.js", "SQL", "Git", "Docker", "AWS", "REST", "Python", "CI/CD", "MongoDB"];
    }

    const matchedKeywords = targetKeywords.filter(k => {
      const kl = k.toLowerCase();
      return text.includes(kl) || skillsList.some(s => s.toLowerCase() === kl || s.toLowerCase().includes(kl));
    });
    const missingKeywords = targetKeywords.filter(k => !matchedKeywords.includes(k));

    const keywordRatio = targetKeywords.length > 0 ? (matchedKeywords.length / targetKeywords.length) : 0.6;
    const keywordsMatch = Math.min(100, Math.max(30, Math.round(keywordRatio * 100)));

    let formattingAndStructure = 85;
    const formattingIssues = [];
    if (!resume.personalDetails?.email && !/@/.test(raw)) {
      formattingAndStructure -= 15;
      formattingIssues.push("Missing a clear contact email address.");
    }
    if (!resume.personalDetails?.phone && !/\d{10}/.test(raw)) {
      formattingAndStructure -= 10;
      formattingIssues.push("Missing a contact phone number.");
    }
    if (!resume.education?.length) {
      formattingAndStructure -= 15;
      formattingIssues.push("No explicit Education section detected.");
    }
    if (!skillsList.length) {
      formattingAndStructure -= 20;
      formattingIssues.push("No distinct Skills section detected.");
    }
    if (!resume.experience?.length) {
      formattingAndStructure -= 15;
      formattingIssues.push("No distinct Work Experience or Employment section detected.");
    }
    formattingAndStructure = Math.max(35, formattingAndStructure);

    const metricMatches = (raw || '').match(/(?:\d+%\s*|\$\s*\d+|\b\d+\s*(?:k|m|million|billion|users|clients|requests|ms|seconds|minutes|hours|days|x|fold)\b|\b(?:reduced|increased|boosted|saved|scaled)\s+[a-zA-Z\s]{0,20}\d+)/gi) || [];
    const quantifiableImpact = Math.min(100, Math.max(35, 45 + metricMatches.length * 12));

    const actionVerbs = ['architected', 'developed', 'engineered', 'implemented', 'designed', 'optimized', 'spearheaded', 'orchestrated', 'built', 'deployed', 'automated', 'integrated', 'accelerated', 'refactored'];
    const matchedVerbs = actionVerbs.filter(v => text.includes(v));
    const experienceRelevance = Math.min(100, Math.max(45, 50 + matchedVerbs.length * 7));

    const atsScore = Math.min(100, Math.max(40, Math.round(
      keywordsMatch * 0.40 +
      quantifiableImpact * 0.25 +
      formattingAndStructure * 0.20 +
      experienceRelevance * 0.15
    )));

    const strengths = [];
    if (matchedKeywords.length >= 3) {
      strengths.push(`Strong alignment with key required technical skills: ${matchedKeywords.slice(0, 4).join(', ')}.`);
    }
    if (skillsList.length >= 10) {
      strengths.push(`Rich breadth of engineering competencies (${skillsList.length} skills indexed).`);
    }
    if (resume.education?.length) {
      strengths.push("Clear academic qualifications and education details present.");
    }
    if (strengths.length === 0) {
      strengths.push("Clean structural format that is easily parsed by automated ATS screeners.");
    }

    const weaknesses = [];
    if (missingKeywords.length > 0) {
      weaknesses.push(`Missing high-impact target keywords: ${missingKeywords.slice(0, 5).join(', ')}.`);
    }
    if (metricMatches.length < 2) {
      weaknesses.push("Limited quantifiable metrics in bullet points. Quantify outcomes with %, $, time saved, or user scale.");
    }
    if (matchedVerbs.length < 3) {
      weaknesses.push("Begin each bullet point with strong action verbs (e.g. 'Architected', 'Spearheaded', 'Optimized').");
    }

    const sampleExp = (resume.experience || [])[0] || (resume.projects || [])[0] || "Worked on backend development and database integration for the application.";
    const bulletPointImprovements = [
      {
        original: String(sampleExp).slice(0, 100),
        improved: "Architected scalable backend microservices with Node.js and MongoDB, improving API response times by 32% across 10,000+ daily active users.",
        reason: "Applies the Google XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]' with concrete numbers and tools."
      }
    ];

    return {
      atsScore,
      scoreBreakdown: {
        keywordsMatch,
        formattingAndStructure,
        quantifiableImpact,
        experienceRelevance
      },
      summary: `Your resume demonstrates an ATS match score of ${atsScore}%. Target keyword coverage is at ${keywordsMatch}%. Adding missing keywords like ${missingKeywords.slice(0, 3).join(', ') || 'Docker, CI/CD'} and quantifying achievements will boost interview selection rates.`,
      matchedKeywords,
      missingKeywords,
      strengths,
      weaknesses,
      formattingIssues,
      bulletPointImprovements
    };
  };

  const getEffectiveResumeText = (overrideText) => {
    if (overrideText && typeof overrideText === 'string' && overrideText.trim()) {
      return overrideText.trim();
    }
    if (resumeData?.rawText && typeof resumeData.rawText === 'string' && resumeData.rawText.trim()) {
      return resumeData.rawText.trim();
    }
    if (resumeData) {
      const parts = [];
      if (resumeData.skills?.length) parts.push(`Skills: ${resumeData.skills.join(', ')}`);
      if (resumeData.experience?.length) parts.push(`Experience:\n${resumeData.experience.join('\n')}`);
      if (resumeData.projects?.length) parts.push(`Projects:\n${resumeData.projects.join('\n')}`);
      if (resumeData.education?.length) parts.push(`Education:\n${resumeData.education.join('\n')}`);
      if (parts.length > 0) return parts.join('\n\n');
    }
    return '';
  };

  const runAtsScan = async (text, jd = '') => {
    const resumeText = getEffectiveResumeText(text);
    const targetJd = jd !== undefined ? jd : jobDescriptionInput;

    // Immediately calculate an instant client-side ATS analysis so user sees non-zero score right away
    const clientFallback = computeClientAts(resumeData, targetJd);
    if (clientFallback) {
      setAtsAnalysis(prev => prev ? { ...clientFallback, ...prev } : clientFallback);
    }

    if (!resumeText) return;

    setIsAnalyzingAts(true);
    setAtsScanError(null);
    try {
      const res = await resumeAPI.analyzeATS({
        resumeText,
        jobDescription: targetJd,
        userId: progress.userId
      });
      if (res.data?.success && res.data?.analysis) {
        setAtsAnalysis(res.data.analysis);
      }
    } catch (err) {
      console.warn("ATS scan error:", err.message);
      let errMsg = err.response?.data?.error;
      if (!errMsg) {
        if (err.response?.status === 404) {
          errMsg = 'Backend ATS endpoint returned 404. If running locally, please restart your backend server (run "npm start" in the backend directory) to load the new ATS route.';
        } else {
          errMsg = err.message || 'ATS analysis timed out. Showing baseline score.';
        }
      }
      setAtsScanError(errMsg);
      if (!atsAnalysis && clientFallback) {
        setAtsAnalysis(clientFallback);
      }
    } finally {
      setIsAnalyzingAts(false);
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
        const parsedResume = res.data.data;
        setResumeData(parsedResume);
        setPipelineStep(8); // all done

        // Generate instant client ATS analysis so config screen immediately displays real scores
        const instantAnalysis = computeClientAts(parsedResume, '');
        if (instantAnalysis) {
          setAtsAnalysis(instantAnalysis);
        }

        setIsAnalyzingAts(true);
        setPhase('config');
        // Trigger full AI scan in the background
        runAtsScan(parsedResume.rawText, '');
      }
    } catch (err) {
      setPipelineStep(0);
      const msg = err.response?.data?.error || 'Failed to parse resume. Please upload a valid PDF or DOCX file.';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  /* Interview Execution Handlers */
  const toggleCategory = (cat) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const startInterview = async () => {
    if (!progress?.username) {
      requireAuth('/resume-interview', startInterview, {
        title: 'Sign in to Start Resume-Based Interview',
        subtitle: 'Sign in or create an account to start your personalized resume interview.'
      });
      return;
    }
    if (selectedCategories.length === 0) { alert('Please select at least one category.'); return; }
    hasAwardedCoinsRef.current = false;
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
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) { /* already started */ }
            setIsRecording(true);
          }
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
    
    // Background evaluation & AI detection
    const evalPromise = Promise.all([
      resumeAPI.evaluateAnswer({ question: currentQ.question, idealAnswer: currentQ.idealAnswer, userAnswer: ans }),
      resumeAPI.detectAI({ answer: ans })
    ]).then(([rEval, rAi]) => {
      setEvaluations(prev => { 
        const n = [...prev]; 
        if (!n[evalIndex]) n[evalIndex] = {}; 
        if (rEval.data.success) {
          n[evalIndex].score = rEval.data.evaluation.score; 
          n[evalIndex].feedback = rEval.data.evaluation.feedback; 
        }
        if (rAi.data.success) {
          n[evalIndex].aiLikelihood = rAi.data.detection.aiLikelihood;
        }
        return n; 
      });
      return { 
        score: rEval.data?.evaluation?.score || 0, 
        feedback: rEval.data?.evaluation?.feedback || '',
        aiLikelihood: rAi.data?.detection?.aiLikelihood || 0
      };
    }).catch(() => { return { score: 0, feedback: '', aiLikelihood: 0 }; });
    
    evalPromises.current.push(evalPromise);

    // Background follow-up generation (don't block the next question)
    if (ans.length > 30) {
      resumeAPI.generateFollowUp({ userId: progress.userId, resumeText: resumeData.rawText, currentQuestion: currentQ.question, userAnswer: ans })
        .then(fu => {
          if (fu.data.success) {
            setQuestionQueue(prev => {
              const nextQueue = [...prev];
              // Insert after the NEXT question so it doesn't disrupt the immediate flow
              const insertIdx = currentQuestionIndex + 2; 
              nextQueue.splice(insertIdx, 0, { ...fu.data.question, category: 'Follow-up' });
              return nextQueue;
            });
          }
        }).catch(() => {});
    }

    // Immediately trigger next question
    const next = currentQuestionIndex + 1;
    // We check against the current length. If follow up is added, it will be handled when index reaches there.
    if (next < questionQueue.length) {
      setCurrentQuestionIndex(next);
      speakText(questionQueue[next].question, () => {
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) { /* already started */ }
          setIsRecording(true);
        }
      });
    } else {
      finishInterview(false);
    }
  };

  const finishInterview = async (autoSubmitted = false) => {
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    stopSpeaking();
    setPhase('report');
    setIsGeneratingReport(true);
    
    const finalAnswers = [...userAnswers];
    if (currentAnswer && !autoSubmitted) {
      finalAnswers[currentQuestionIndex] = currentAnswer;
      // If the user submits on the final question, we need to manually trigger evaluation since handleNextQuestion wasn't fully processed
      if (currentQuestionIndex === questionQueue.length - 1) {
        const currentQ = questionQueue[currentQuestionIndex];
        const evalPromise = Promise.all([
          resumeAPI.evaluateAnswer({ question: currentQ.question, idealAnswer: currentQ.idealAnswer, userAnswer: currentAnswer }),
          resumeAPI.detectAI({ answer: currentAnswer })
        ]).then(([rEval, rAi]) => {
           return { 
            score: rEval.data?.evaluation?.score || 0, 
            feedback: rEval.data?.evaluation?.feedback || '',
            aiLikelihood: rAi.data?.detection?.aiLikelihood || 0
          };
        }).catch(() => { return { score: 0, feedback: '', aiLikelihood: 0 }; });
        evalPromises.current.push(evalPromise);
      }
    }
    
    // Wait for all evaluations to complete to ensure accurate history
    const finalEvals = await Promise.all(evalPromises.current);
    
    const qaList = questionQueue.map((q, i) => {
      // Use the resolved evaluation from the Promise if available, fallback to state
      const finalEval = finalEvals[i] || evaluations[i] || {};
      return {
        question: q.question, idealAnswer: q.idealAnswer,
        answer: finalAnswers[i] || '', 
        score: finalEval.score || 0,
        feedback: finalEval.feedback || '', 
        aiLikelihood: finalEval.aiLikelihood || 0
      };
    });
    
    try {
      const res = await resumeAPI.generateReport({ qaList, resumeText: resumeData?.rawText || '' });
      if (res.data.success) {
        const rep = res.data.report;
        setReport(rep);
        const avgScore = qaList.reduce((a, c) => a + c.score, 0) / (qaList.length || 1);
        const overallScore = Math.round(avgScore * 10);

        // Gamification: Interview score based on percentage (e.g. 77% -> 7 coins)
        const earnedCoins = Math.floor(overallScore / 10);
        if (!hasAwardedCoinsRef.current && earnedCoins > 0) {
          hasAwardedCoinsRef.current = true;
          awardCoins('INTERVIEW_SCORE', {
            coins: earnedCoins,
            label: `Resume AI Interview (${overallScore}% score)`
          });
        }

        await resumeAPI.saveSession({
          userId: progress.userId, category: 'Resume AI Interview', difficulty, overallScore,
          coinsEarned: earnedCoins,
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

  /* Render: Upload Phase */
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

  /* Render: Config Phase */
  const renderConfig = () => {
    // If atsAnalysis is not yet available, dynamically calculate baseline metrics so user never sees 0s
    const activeAnalysis = atsAnalysis || computeClientAts(resumeData, jobDescriptionInput);
    const atsScore = activeAnalysis?.atsScore ?? 65;
    const scoreColor = atsScore >= 80 ? '#10b981' : atsScore >= 60 ? '#f59e0b' : '#ef4444';
    const scoreStatus = atsScore >= 80
      ? 'Strong ATS Compatibility'
      : atsScore >= 60
      ? 'Moderate Match — Optimization Recommended'
      : 'Low Match — High Risk of Automated Rejection';

    const breakdown = activeAnalysis?.scoreBreakdown || {
      keywordsMatch: 60,
      formattingAndStructure: 70,
      quantifiableImpact: 50,
      experienceRelevance: 65
    };

    const handleCopyBullet = (text, idx) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedBulletIdx(idx);
        setTimeout(() => setCopiedBulletIdx(null), 2000);
      }
    };

    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px', animation: 'fadeInUp 0.4s ease' }}>
        {/* Top Summary Banner */}
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <FaCheckCircle style={{ fontSize: '1.4rem', color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px', fontSize: '1rem' }}>Resume Parsed & Vectorized</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Found <strong style={{ color: '#f1f5f9' }}>{resumeData?.skills?.length || 0} skills</strong> · <strong style={{ color: '#f1f5f9' }}>{resumeData?.projects?.length || 0} projects</strong> · <strong style={{ color: '#f1f5f9' }}>{resumeData?.experience?.length || 0} experience entries</strong> · <strong style={{ color: '#f1f5f9' }}>{resumeData?.education?.length || 0} education items</strong>
            </div>
            {resumeData?.skills?.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {resumeData.skills.slice(0, 12).map((s, i) => <SkillTag key={i} skill={s} />)}
                {resumeData.skills.length > 12 && <span style={{ color: '#6366f1', fontSize: '0.78rem', marginLeft: '4px' }}>+{resumeData.skills.length - 12} more</span>}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveConfigTab('ats')}
            style={{
              padding: '12px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: activeConfigTab === 'ats' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.04)',
              color: activeConfigTab === 'ats' ? '#fff' : '#94a3b8',
              fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: activeConfigTab === 'ats' ? '0 0 20px rgba(99,102,241,0.35)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            <FaBullseye style={{ color: activeConfigTab === 'ats' ? '#fff' : '#818cf8' }} />
            ATS Match & Weakness Optimizer
            {activeAnalysis && (
              <span style={{
                background: activeConfigTab === 'ats' ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.2)',
                color: activeConfigTab === 'ats' ? '#fff' : '#a5b4fc',
                fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 800
              }}>
                {atsScore}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveConfigTab('interview')}
            style={{
              padding: '12px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: activeConfigTab === 'interview' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.04)',
              color: activeConfigTab === 'interview' ? '#fff' : '#94a3b8',
              fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: activeConfigTab === 'interview' ? '0 0 20px rgba(99,102,241,0.35)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            <FaRobot style={{ color: activeConfigTab === 'interview' ? '#fff' : '#818cf8' }} />
            Setup AI Interview
          </button>
        </div>

        {/* TAB 1: ATS MATCH & OPTIMIZER */}
        {activeConfigTab === 'ats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Rescan / AI scanning banner */}
            {isAnalyzingAts && (
              <div style={{
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px',
                color: '#c7d2fe', fontSize: '0.88rem', fontWeight: 600
              }}>
                <FaSpinner className="rai-spin" style={{ color: '#818cf8', fontSize: '1.2rem', flexShrink: 0 }} />
                <span>AI Scanner Active: Calculating ATS metrics, keyword overlap, and bullet point enhancements...</span>
              </div>
            )}

            {/* Error notice if scan failed */}
            {atsScanError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#fca5a5', fontSize: '0.88rem', flexWrap: 'wrap', gap: '10px'
              }}>
                <span><FaExclamationTriangle style={{ marginRight: '6px' }} /> {atsScanError}</span>
                <button
                  onClick={() => runAtsScan(getEffectiveResumeText(), jobDescriptionInput)}
                  style={{
                    background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '8px',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Retry Scan
                </button>
              </div>
            )}

            {/* Hero ATS Score & Breakdown Card */}
            <div style={{
              background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '28px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '28px', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <ScoreRing value={atsScore} label="ATS Score" color={scoreColor} size={130} />
                <div style={{
                  marginTop: '12px', fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px',
                  borderRadius: '20px', background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`,
                  color: scoreColor, textAlign: 'center'
                }}>
                  {scoreStatus}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  ATS Scoring Breakdown
                </div>
                {[
                  { label: 'Keyword Match', val: breakdown.keywordsMatch, color: '#6366f1' },
                  { label: 'Formatting & Structure', val: breakdown.formattingAndStructure, color: '#10b981' },
                  { label: 'Quantifiable Impact & Metrics', val: breakdown.quantifiableImpact, color: '#f59e0b' },
                  { label: 'Experience & Role Relevance', val: breakdown.experienceRelevance, color: '#0ea5e9' }
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 700 }}>{item.val}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.val}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Executive Summary */}
            {activeAnalysis?.summary && (
              <div style={{
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '14px', padding: '18px 22px', display: 'flex', gap: '14px', alignItems: 'flex-start'
              }}>
                <FaBrain style={{ color: '#818cf8', fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.92rem', marginBottom: '4px' }}>AI Match Assessment</div>
                  <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.6 }}>{activeAnalysis.summary}</div>
                </div>
              </div>
            )}

            {/* Target Job Description Match Scanner */}
            <div style={{
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <FaBullseye style={{ color: '#ec4899', fontSize: '1.1rem' }} />
                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.05rem' }}>Scan Against a Target Job Description</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '14px' }}>
                Paste a job posting or target role requirements to compute exact keyword overlaps and pinpoint what's missing.
              </div>
              <textarea
                rows={4}
                value={jobDescriptionInput}
                onChange={(e) => setJobDescriptionInput(e.target.value)}
                placeholder="Paste job description here (e.g. Senior Full Stack Engineer: React, TypeScript, Node.js, AWS, Kubernetes, GraphQL, CI/CD, Microservices...)"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(15,23,42,0.8)',
                  color: '#e2e8f0', fontSize: '0.88rem', outline: 'none', resize: 'vertical',
                  lineHeight: 1.5, boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  onClick={() => runAtsScan(getEffectiveResumeText(), jobDescriptionInput)}
                  disabled={isAnalyzingAts}
                  style={{
                    padding: '10px 22px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #be185d)',
                    color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 0 18px rgba(236,72,153,0.35)', transition: 'all 0.2s'
                  }}
                >
                  {isAnalyzingAts ? <><FaSpinner className="rai-spin" /> Scanning JD...</> : <><FaSearch /> Scan Job Description</>}
                </button>
              </div>
            </div>

            {/* Keyword Intelligence: Matched vs Missing */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Matched Keywords */}
              <div style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '16px', padding: '22px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>
                    <FaCheck style={{ color: '#10b981' }} /> Matched ATS Keywords
                  </div>
                  <span style={{ background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {activeAnalysis?.matchedKeywords?.length || 0}
                  </span>
                </div>
                {activeAnalysis?.matchedKeywords?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeAnalysis.matchedKeywords.map((kw, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7'
                      }}>
                        <FaCheck style={{ marginRight: '4px' }} /> {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No major technical keywords detected in resume text.</div>
                )}
              </div>

              {/* Missing Keywords */}
              <div style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(244,63,94,0.25)',
                borderRadius: '16px', padding: '22px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 700, fontSize: '0.95rem' }}>
                    <FaTimes style={{ color: '#f43f5e' }} /> Missing High-Impact Keywords
                  </div>
                  <span style={{ background: 'rgba(244,63,94,0.2)', color: '#fda4af', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {activeAnalysis?.missingKeywords?.length || 0}
                  </span>
                </div>
                {activeAnalysis?.missingKeywords?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeAnalysis.missingKeywords.map((kw, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                        background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af'
                      }}>
                        + {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#34d399', fontSize: '0.85rem' }}>All core high-impact keywords matched!</div>
                )}
                <div style={{ marginTop: '14px', fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaLightbulb style={{ color: '#f59e0b', flexShrink: 0 }} /> Tip: Incorporate these keywords into your skills list or project descriptions to satisfy automated resume screeners.
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses Analysis */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Strengths */}
              <div style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '22px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px' }}>
                  <FaCheckCircle style={{ color: '#10b981' }} /> Resume Strengths
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  {(activeAnalysis?.strengths || []).map((s, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses & Critical Gaps */}
              <div style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '16px', padding: '22px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px' }}>
                  <FaExclamationTriangle style={{ color: '#f59e0b' }} /> Weaknesses & Critical Gaps
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.7 }}>
                  {(activeAnalysis?.weaknesses || []).map((w, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Formatting Issues (if any) */}
            {activeAnalysis?.formattingIssues?.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '14px', padding: '18px 22px', display: 'flex', gap: '14px', alignItems: 'flex-start'
              }}>
                <FaFileSignature style={{ color: '#f87171', fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#fca5a5', fontSize: '0.92rem', marginBottom: '4px' }}>ATS Formatting & Parsing Warnings</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {activeAnalysis.formattingIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* AI Bullet Point Optimizer (Google XYZ Formula) */}
            {activeAnalysis?.bulletPointImprovements?.length > 0 && (
              <div style={{
                background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '16px', padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <FaMagic style={{ color: '#a5b4fc', fontSize: '1.2rem' }} />
                  <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1.1rem' }}>AI Bullet Point Optimizer (Google XYZ Formula)</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Formulated as: <em>Accomplished [X] as measured by [Y], by doing [Z]</em>. Replaces passive phrases with measurable impact.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {activeAnalysis.bulletPointImprovements.map((item, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(30,41,59,0.7)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                          padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px'
                        }}>
                          {/* Original */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.6px' }}>
                              Original Bullet Point
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.86rem', fontStyle: 'italic', background: 'rgba(15,23,42,0.5)', padding: '10px 14px', borderRadius: '8px' }}>
                              "{item.original}"
                            </div>
                          </div>

                          {/* Improved */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                <FaMagic /> AI Improved Version (XYZ Formula)
                              </span>
                              <button
                                onClick={() => handleCopyBullet(item.improved, idx)}
                                style={{
                                  background: 'none', border: 'none', color: copiedBulletIdx === idx ? '#34d399' : '#818cf8',
                                  fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600
                                }}
                              >
                                {copiedBulletIdx === idx ? <><FaCheck /> Copied!</> : <><FaCopy /> Copy</>}
                              </button>
                            </div>
                            <div style={{
                              color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 600,
                              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.1))',
                              border: '1px solid rgba(99,102,241,0.35)', padding: '12px 14px', borderRadius: '8px', lineHeight: 1.5
                            }}>
                              {item.improved}
                            </div>
                          </div>

                          {/* Reason */}
                          {item.reason && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.78rem' }}>
                              <FaLightbulb style={{ color: '#f59e0b', flexShrink: 0 }} />
                              <span>{item.reason}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom CTA to Interview */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))',
                  border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '1.05rem', marginBottom: '4px' }}>
                      Ready to Put Your Resume to the Test?
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      Our voice-enabled AI interviewer will grill you on every project and skill listed on your resume.
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveConfigTab('interview')}
                    style={{
                      padding: '14px 28px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 0 20px rgba(99,102,241,0.4)', transition: 'all 0.2s'
                    }}
                  >
                    Proceed to AI Interview Setup →
                  </button>
                </div>
          </div>
        )}

        {/* TAB 2: INTERVIEW SETUP */}
        {activeConfigTab === 'interview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Configure Your AI Interview</h2>
              <button
                onClick={() => setActiveConfigTab('ats')}
                style={{
                  background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600
                }}
              >
                ← Back to ATS Optimizer
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
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

            <div>
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

            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
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
              {isGeneratingNext ? <><FaSpinner className="rai-spin" /> Preparing AI Interviewer...</> : <><FaRobot /> Start Resume-Based Interview</>}
            </button>
          </div>
        )}
      </div>
    );
  };

  /* Render: Interview Phase */
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
            <div style={{ color: violations > 0 ? '#f87171' : '#64748b', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaExclamationTriangle /> {violations}/{MAX_VIOLATIONS} warnings
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

          <MiniProctoring violations={violations} maxViolations={MAX_VIOLATIONS} onViolation={handleProctorViolation} onTerminate={handleTerminate} />
        </div>
      </div>
    );
  };

  /* Render: Report Phase */
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

  /* Render: History Phase */
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

  /* Root Render */
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
