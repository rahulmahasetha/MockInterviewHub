const test = require('node:test');
const assert = require('node:assert/strict');
const { parseResumeFallback } = require('../utils/resumeParser');

test('parses skills and experience from plain resume text', () => {
  const rawText = `
John Doe
Software Engineer

Skills
- JavaScript, React, Node.js, MongoDB

Experience
- Senior Software Engineer at Acme Inc. (2022-2024)

Projects
- Built an analytics dashboard with React and Node.js

Education
- B.Tech in Computer Science, IIT Delhi
`;

  const parsed = parseResumeFallback(rawText);

  assert.ok(parsed.skills.some(skill => skill.toLowerCase().includes('javascript')));
  assert.ok(parsed.experience.some(exp => exp.toLowerCase().includes('acme')));
  assert.ok(parsed.projects.some(project => project.toLowerCase().includes('dashboard')));
  assert.ok(parsed.education.some(edu => edu.toLowerCase().includes('computer science')));
});
