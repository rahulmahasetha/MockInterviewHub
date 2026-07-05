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

const parseResumeFallback = (text) => {
  const sections = splitSections(text);
  
  // Combine skills and technologies sections into a single set of unique skills
  const combinedSkills = [...new Set([...sections.skills, ...sections.technologies])];

  // Try to find email and phone
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const email = emailMatch ? emailMatch[0] : '';
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Name is typically in the first few lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
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

module.exports = { parseResumeFallback };
