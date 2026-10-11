const { parseResumeFallback } = require('../utils/resumeParser');

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
- B.Tech in Computer Science, IIT Delhi

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
