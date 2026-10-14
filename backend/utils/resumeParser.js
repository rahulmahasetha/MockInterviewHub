const splitSections = (text) => {
  const normalized = String(text || '').replace(/\r/g, '').trim();
  if (!normalized) return [];

  const sections = {
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    technologies: [],
    publications: []
  };

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  let current = null;

  const sectionMatchers = {
    skills: /^(?:skills|technical\s+skills|core\s+skills|key\s+skills|languages|technologies|tools|tech\s+stack|programming\s+languages|skills\s+&\s+tools|technical\s+expertise|competencies|expertise|technologies\s+&\s+tools):?$/i,
    experience: /^(?:experience|work\s+experience|professional\s+experience|employment|employment\s+history|work\s+history|professional\s+background|career\s+history):?$/i,
    projects: /^(?:projects|personal\s+projects|notable\s+projects|academic\s+projects|key\s+projects|development\s+projects):?$/i,
    education: /^(?:education|academic\s+background|academic\s+credentials|academic\s+qualification|academic\s+qualifications|qualifications|education\s+&\s+credentials):?$/i,
    certifications: /^(?:certifications|licenses|certifications\s+&\s+licenses|courses|training|professional\s+certifications):?$/i,
    achievements: /^(?:achievements|awards|highlights|honors|achievements\s+&\s+awards):?$/i,
    technologies: /^(?:technologies|tools|tech\s+stack|programming\s+languages|technologies\s+used):?$/i,
    publications: /^(?:publications|papers|research\s+papers|articles):?$/i
  };

  for (const line of lines) {
    // Clean formatting characters (Markdown symbols) for matching
    const cleanLine = line.replace(/[#*_\-[\]()]/g, '').trim();
    
    const matchedSection = Object.entries(sectionMatchers).find(([, regex]) => {
      if (cleanLine.length > 50) return false;
      return regex.test(cleanLine);
    });

    if (matchedSection) {
      current = matchedSection[0];
      continue;
    }

    if (!current) continue;

    const bullet = line.replace(/^[-•*]\s*/, '').trim();
    if (bullet) {
      if (current === 'skills' || current === 'technologies') {
        // Split comma/semicolon/bullet lists to capture individual skill tags
        const parts = bullet.split(/[,;|•]/).map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (p.length < 50) {
            sections[current].push(p);
          }
        }
      } else {
        sections[current].push(bullet);
      }
    }
  }

  return sections;
};

const emptySection = () => ({
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  achievements: [],
  technologies: [],
  publications: []
});

const parseResumeFallback = (text) => {
  const rawSections = splitSections(text);
  // splitSections returns [] for empty/null input — fall back to empty section object
  const sections = Array.isArray(rawSections) ? emptySection() : rawSections;
  
  // Combine skills and technologies sections into a single set of unique skills
  const combinedSkills = [...new Set([...sections.skills, ...sections.technologies])];

  // Normalize to avoid calling .match() or .split() on null/undefined
  const safeText = String(text || '');

  // Try to find email and phone
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const emailMatch = safeText.match(emailRegex);
  const phoneMatch = safeText.match(phoneRegex);
  const email = emailMatch ? emailMatch[0] : '';
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Name is typically in the first few lines
  const lines = safeText.split('\n').map(l => l.trim()).filter(Boolean);
  let name = '';
  for (const l of lines.slice(0, 5)) {
    if (!l.includes('@') && !l.match(/\d{4,}/) && l.length < 40) {
      name = l;
      break;
    }
  }

  const fallback = {
    personalDetails: { name, email, phone },
    education: sections.education,
    skills: combinedSkills,
    projects: sections.projects,
    experience: sections.experience,
    certifications: sections.certifications,
    achievements: sections.achievements,
    technologies: sections.technologies,
    publications: sections.publications
  };

  // Secondary backup: Regex matching for skills if sections list is empty
  if (fallback.skills.length === 0) {
    const skillMatches = String(text || '').match(/(?:skills?|technologies?|languages?|tech\s+stack)[:\-]\s*([^\n]+)/gi) || [];
    const extracted = skillMatches
      .flatMap((match) => match.split(/[:\-]/).slice(1))
      .join(',')
      .split(/[,;|•]/)
      .map((item) => item.trim())
      .filter(item => item && item.length < 50);
    if (extracted.length) {
      fallback.skills = [...new Set(extracted)];
    }
  }

  if (fallback.experience.length === 0) {
    const experienceMatches = String(text || '').match(/(?:worked|experience|engineer|developer|manager|intern)[^\n]{0,120}/gi) || [];
    fallback.experience = experienceMatches.slice(0, 6).map((item) => item.trim()).filter(Boolean);
  }

  if (fallback.projects.length === 0) {
    const projectMatches = String(text || '').match(/(?:project|built|developed|created)[^\n]{0,140}/gi) || [];
    fallback.projects = projectMatches.slice(0, 6).map((item) => item.trim()).filter(Boolean);
  }

  if (fallback.education.length === 0) {
    const educationMatches = String(text || '').match(/(?:b\.?tech|b\.e|bsc|msc|phd|master|bachelor|degree|university|college)[^\n]{0,140}/gi) || [];
    fallback.education = educationMatches.slice(0, 6).map((item) => item.trim()).filter(Boolean);
  }

  return fallback;
};

const STANDARD_TECH_KEYWORDS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Express", "Python", "SQL",
  "MongoDB", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Git", "REST",
  "GraphQL", "CI/CD", "Redis", "HTML5", "CSS3", "Tailwind", "Jest",
  "Microservices", "Linux", "Java", "C++", "Next.js", "Redux", "GCP", "Azure"
];

const ACTION_VERBS = [
  "Architected", "Developed", "Engineered", "Implemented", "Spearheaded",
  "Designed", "Built", "Optimized", "Scaled", "Automated", "Deployed", "Reduced",
  "Increased", "Delivered", "Managed", "Collaborated", "Refactored"
];

const analyzeAtsFallback = (rawText, jobDescription = '', targetRole = '') => {
  const text = String(rawText || '').trim();
  const parsed = parseResumeFallback(text);
  const normalizedText = text.toLowerCase();

  // 1. Determine Target Keywords
  let targetKeywords = [];
  if (jobDescription && jobDescription.trim()) {
    const jdLower = jobDescription.toLowerCase();
    targetKeywords = STANDARD_TECH_KEYWORDS.filter(k => jdLower.includes(k.toLowerCase()));
    if (targetKeywords.length < 5) {
      const jdWords = jobDescription.match(/\b[A-Z][a-zA-Z0-9+#.-]{1,20}\b/g) || [];
      const additional = [...new Set(jdWords)].filter(w => !['The', 'And', 'For', 'With', 'You', 'Will', 'Are', 'Our', 'Job', 'Role', 'Requirements', 'Responsibilities'].includes(w));
      targetKeywords = [...new Set([...targetKeywords, ...additional.slice(0, 8)])];
    }
  }

  if (targetKeywords.length === 0) {
    if (targetRole && /frontend/i.test(targetRole)) {
      targetKeywords = ["JavaScript", "TypeScript", "React", "HTML5", "CSS3", "Tailwind", "Redux", "Next.js", "REST", "Git", "Jest"];
    } else if (targetRole && /backend/i.test(targetRole)) {
      targetKeywords = ["Node.js", "Express", "Python", "SQL", "MongoDB", "PostgreSQL", "Docker", "AWS", "Redis", "REST", "Microservices"];
    } else if (targetRole && /(devops|cloud)/i.test(targetRole)) {
      targetKeywords = ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform", "Python", "Git", "GCP", "Microservices"];
    } else {
      targetKeywords = ["JavaScript", "React", "Node.js", "SQL", "Git", "Docker", "AWS", "REST", "Python", "CI/CD", "MongoDB"];
    }
  }

  // 2. Identify Matched & Missing Keywords
  const matchedKeywords = targetKeywords.filter(k => normalizedText.includes(k.toLowerCase()));
  const missingKeywords = targetKeywords.filter(k => !normalizedText.includes(k.toLowerCase()));

  // 3. Score Breakdown
  const keywordMatchRatio = targetKeywords.length > 0 ? (matchedKeywords.length / targetKeywords.length) : 0.7;
  const keywordsMatch = Math.min(100, Math.max(30, Math.round(keywordMatchRatio * 100)));

  // Formatting & structure
  let formattingAndStructure = 100;
  const formattingIssues = [];
  if (!parsed.personalDetails.email) {
    formattingAndStructure -= 15;
    formattingIssues.push("Missing a clear contact email address.");
  }
  if (!parsed.personalDetails.phone) {
    formattingAndStructure -= 10;
    formattingIssues.push("Missing a contact phone number.");
  }
  if (!parsed.education || parsed.education.length === 0) {
    formattingAndStructure -= 15;
    formattingIssues.push("No explicit Education section detected.");
  }
  if (!parsed.skills || parsed.skills.length === 0) {
    formattingAndStructure -= 20;
    formattingIssues.push("No distinct Skills section detected.");
  }
  if (!parsed.experience || parsed.experience.length === 0) {
    formattingAndStructure -= 15;
    formattingIssues.push("No distinct Work Experience or Employment section detected.");
  }
  if (text.split(/\s+/).length < 150) {
    formattingAndStructure -= 15;
    formattingIssues.push("Resume content is too brief (< 150 words). Provide more detailed accomplishments.");
  }
  formattingAndStructure = Math.max(35, formattingAndStructure);

  // Quantifiable impact (numbers, %, $, x, scale)
  const metricMatches = text.match(/(?:\d+%\s*|\$\s*\d+|\b\d+\s*(?:k|m|million|billion|users|clients|requests|ms|seconds|minutes|hours|days|x|fold)\b|\b(?:reduced|increased|boosted|saved|scaled)\s+[a-zA-Z\s]{0,20}\d+)/gi) || [];
  const metricCount = metricMatches.length;
  const quantifiableImpact = Math.min(100, Math.max(25, 40 + metricCount * 12));

  // Experience relevance & Action Verbs
  const actionVerbMatches = ACTION_VERBS.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(text));
  const experienceRelevance = Math.min(100, Math.max(40, 50 + actionVerbMatches.length * 6));

  // Overall ATS Score
  const atsScore = Math.min(100, Math.max(35, Math.round(
    keywordsMatch * 0.40 +
    quantifiableImpact * 0.25 +
    formattingAndStructure * 0.20 +
    experienceRelevance * 0.15
  )));

  // Strengths
  const strengths = [];
  if (matchedKeywords.length >= 3) {
    strengths.push(`Strong keyword alignment with core technologies: ${matchedKeywords.slice(0, 4).join(', ')}.`);
  }
  if (parsed.education?.length > 0) {
    strengths.push("Clear academic qualifications and education history present.");
  }
  if (metricCount >= 2) {
    strengths.push(`Includes ${metricCount} measurable performance metrics or data points in experience bullets.`);
  }
  if (actionVerbMatches.length >= 3) {
    strengths.push("Effective use of strong engineering action verbs throughout the experience.");
  }
  if (strengths.length === 0) {
    strengths.push("Clean text format that is readable by standard ATS parsers.");
  }

  // Weaknesses
  const weaknesses = [];
  if (missingKeywords.length > 0) {
    weaknesses.push(`Missing high-impact keywords for target role: ${missingKeywords.slice(0, 4).join(', ')}.`);
  }
  if (metricCount < 3) {
    weaknesses.push("Limited quantifiable metrics in bullet points. Quantify outcomes with %, $, time saved, or user scale.");
  }
  if (actionVerbMatches.length < 3) {
    weaknesses.push("Bullet points start passively. Begin each bullet point with strong action verbs (e.g. 'Architected', 'Spearheaded', 'Optimized').");
  }
  if (!/summary|objective|profile/i.test(text.slice(0, 500))) {
    weaknesses.push("Missing a concise 2-3 line Professional Summary at the top of the resume.");
  }

  // Bullet Point Improvements
  const sampleLines = [...(parsed.experience || []), ...(parsed.projects || [])].filter(l => l.length > 20 && l.length < 150);
  const targetOriginal = sampleLines[0] || "Worked on backend development and database integration for the application.";
  
  const bulletPointImprovements = [
    {
      original: targetOriginal,
      improved: `Architected scalable backend microservices with Node.js and MongoDB, improving API response times by 32% across 10,000+ daily active users.`,
      reason: "Applies the Google XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]' with concrete numbers and tools."
    }
  ];

  if (sampleLines[1]) {
    bulletPointImprovements.push({
      original: sampleLines[1],
      improved: `Engineered reusable component architecture utilizing React and Tailwind CSS, accelerating feature delivery cycles by 25%.`,
      reason: "Highlights business velocity and measurable development efficiency."
    });
  }

  return {
    atsScore,
    scoreBreakdown: {
      keywordsMatch,
      formattingAndStructure,
      quantifiableImpact,
      experienceRelevance
    },
    summary: `Your resume demonstrates an ATS match score of ${atsScore}%. ${missingKeywords.length > 0 ? `Adding missing keywords like ${missingKeywords.slice(0, 3).join(', ')} and quantifying achievements will significantly boost pass rates.` : 'Strong alignment with target role requirements.'}`,
    matchedKeywords,
    missingKeywords,
    strengths,
    weaknesses,
    formattingIssues,
    bulletPointImprovements
  };
};

module.exports = { parseResumeFallback, analyzeAtsFallback };

