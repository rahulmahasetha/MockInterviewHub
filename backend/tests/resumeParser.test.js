const { parseResumeFallback, analyzeAtsFallback } = require('../utils/resumeParser');

describe('parseResumeFallback', () => {
  const sampleResume = `
John Doe
Software Engineer
john@example.com

Skills
- JavaScript, React, Node.js, MongoDB

Experience
- Senior Software Engineer at Acme Inc. (2022-2024)

Projects
- Built an analytics dashboard with React and Node.js

Education
- B.Tech in Computer Science, SRM University AP

Certifications
- AWS Certified Developer Associate
`;

  test('returns an object with all expected sections', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result).toHaveProperty('personalDetails');
    expect(result).toHaveProperty('skills');
    expect(result).toHaveProperty('experience');
    expect(result).toHaveProperty('projects');
    expect(result).toHaveProperty('education');
    expect(result).toHaveProperty('certifications');
  });

  test('extracts skills from the Skills section', () => {
    const result = parseResumeFallback(sampleResume);
    const skills = result.skills.map((s) => s.toLowerCase());
    expect(skills.some((s) => s.includes('javascript'))).toBe(true);
    expect(skills.some((s) => s.includes('react'))).toBe(true);
  });

  test('extracts experience entries', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result.experience.some((e) => e.toLowerCase().includes('acme'))).toBe(true);
  });

  test('extracts projects', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result.projects.some((p) => p.toLowerCase().includes('dashboard'))).toBe(true);
  });

  test('extracts education', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result.education.some((e) => e.toLowerCase().includes('computer science'))).toBe(true);
  });

  test('extracts certifications', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result.certifications.some((c) => c.toLowerCase().includes('aws'))).toBe(true);
  });

  test('extracts name from personalDetails', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result.personalDetails.name).toBe('John Doe');
  });

  test('extracts email from personalDetails', () => {
    const result = parseResumeFallback(sampleResume);
    expect(result.personalDetails.email).toBe('john@example.com');
  });

  test('handles empty text gracefully', () => {
    const result = parseResumeFallback('');
    expect(result.skills).toEqual([]);
    expect(result.experience).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.education).toEqual([]);
  });

  test('handles null gracefully', () => {
    const result = parseResumeFallback(null);
    expect(result.skills).toBeInstanceOf(Array);
    expect(result.experience).toBeInstanceOf(Array);
  });

  test('falls back to regex skill extraction when no section header exists', () => {
    const plainText = 'Skills: Python, Django, PostgreSQL';
    const result = parseResumeFallback(plainText);
    const skills = result.skills.map((s) => s.toLowerCase());
    expect(skills.some((s) => s.includes('python'))).toBe(true);
  });

  test('deduplicates skills between Skills and Technologies sections', () => {
    const resumeWithBoth = `
Skills
- JavaScript, React

Technologies
- JavaScript, Node.js
`;
    const result = parseResumeFallback(resumeWithBoth);
    const jsCounts = result.skills.filter(
      (s) => s.toLowerCase() === 'javascript'
    ).length;
    expect(jsCounts).toBe(1);
  });
});

describe('analyzeAtsFallback', () => {
  const sampleResume = `
Jane Developer
jane.dev@example.com
+1 (555) 987-6543

Summary
Results-driven Full Stack Engineer with 4+ years of experience building scalable web applications.

Skills
JavaScript, TypeScript, React, Node.js, Express, MongoDB, SQL, Git, REST, HTML5, CSS3

Experience
Senior Software Engineer at TechCorp (2021 - Present)
- Architected REST microservices in Node.js and React, increasing throughput by 45% for 50k users.
- Optimized PostgreSQL queries, cutting API latency by 35ms across production endpoints.

Projects
E-Commerce Cloud Platform
- Developed full-stack shopping portal with React, Redux, and Node.js.
- Deployed automated CI/CD pipeline using Git and Docker, cutting deployment time by 50%.

Education
B.Tech in Information Technology, State University (2017 - 2021)
`;

  test('computes an ATS score and returns all expected breakdown metrics', () => {
    const analysis = analyzeAtsFallback(sampleResume, 'Looking for React, Node.js, and Docker developer');
    expect(analysis).toHaveProperty('atsScore');
    expect(analysis.atsScore).toBeGreaterThanOrEqual(40);
    expect(analysis.atsScore).toBeLessThanOrEqual(100);
    expect(analysis).toHaveProperty('scoreBreakdown');
    expect(analysis.scoreBreakdown).toHaveProperty('keywordsMatch');
    expect(analysis.scoreBreakdown).toHaveProperty('formattingAndStructure');
    expect(analysis.scoreBreakdown).toHaveProperty('quantifiableImpact');
    expect(analysis.scoreBreakdown).toHaveProperty('experienceRelevance');
  });

  test('accurately identifies matched and missing keywords against a Job Description', () => {
    const jd = 'Must have React, Node.js, Docker, Kubernetes, AWS, and GraphQL.';
    const analysis = analyzeAtsFallback(sampleResume, jd);
    expect(analysis.matchedKeywords).toContain('React');
    expect(analysis.matchedKeywords).toContain('Node.js');
    expect(analysis.matchedKeywords).toContain('Docker');
    expect(analysis.missingKeywords).toContain('Kubernetes');
    expect(analysis.missingKeywords).toContain('AWS');
  });

  test('generates actionable bullet point improvements with the XYZ formula', () => {
    const analysis = analyzeAtsFallback(sampleResume);
    expect(Array.isArray(analysis.bulletPointImprovements)).toBe(true);
    expect(analysis.bulletPointImprovements.length).toBeGreaterThan(0);
    expect(analysis.bulletPointImprovements[0]).toHaveProperty('original');
    expect(analysis.bulletPointImprovements[0]).toHaveProperty('improved');
    expect(analysis.bulletPointImprovements[0]).toHaveProperty('reason');
  });

  test('identifies strengths and weaknesses', () => {
    const analysis = analyzeAtsFallback(sampleResume);
    expect(Array.isArray(analysis.strengths)).toBe(true);
    expect(analysis.strengths.length).toBeGreaterThan(0);
    expect(Array.isArray(analysis.weaknesses)).toBe(true);
  });

  test('handles brief or empty resumes gracefully without throwing errors', () => {
    const analysis = analyzeAtsFallback('');
    expect(analysis).toHaveProperty('atsScore');
    expect(analysis.atsScore).toBeGreaterThanOrEqual(0);
    expect(analysis.formattingIssues.length).toBeGreaterThan(0);
  });
});

