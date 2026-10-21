const {
  escapeRegExp,
  dedupeLeaderboardRows,
  formatScoreTimestamp,
  buildFallbackQuestions,
} = require('../utils/helpers');

// 

describe('escapeRegExp', () => {
  test('escapes regex special characters', () => {
    const escaped = escapeRegExp('foo.bar*baz+qux?');
    expect(escaped).toBe('foo\\.bar\\*baz\\+qux\\?');
  });

  test('leaves plain alphanumeric strings unchanged', () => {
    expect(escapeRegExp('hello123')).toBe('hello123');
  });

  test('escapes brackets and parens', () => {
    const result = escapeRegExp('(test)[me]');
    expect(result).toContain('\\(');
    expect(result).toContain('\\)');
    expect(result).toContain('\\[');
    expect(result).toContain('\\]');
  });

  test('escapes curly braces and caret', () => {
    const result = escapeRegExp('{a}^b');
    expect(result).toContain('\\{');
    expect(result).toContain('\\}');
    expect(result).toContain('\\^');
  });

  test('correctly escapes a string for use in RegExp', () => {
    const raw = 'John.Doe';
    const pattern = new RegExp(`^${escapeRegExp(raw)}$`, 'i');
    expect(pattern.test('John.Doe')).toBe(true);
    // Without escaping, '.' would match any char — should NOT match "JohnXDoe"
    expect(pattern.test('JohnXDoe')).toBe(false);
  });
});

// 

describe('dedupeLeaderboardRows', () => {
  test('deduplicates rows with the same name/type/topic, keeping highest score', () => {
    const rows = [
      { name: 'Alice', score: 80, type: 'quiz', topic: 'math' },
      { name: 'Alice', score: 95, type: 'quiz', topic: 'math' },
      { name: 'Alice', score: 60, type: 'quiz', topic: 'math' },
    ];
    const result = dedupeLeaderboardRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(95);
  });

  test('keeps different name entries separate', () => {
    const rows = [
      { name: 'Alice', score: 80, type: 'quiz', topic: 'math' },
      { name: 'Bob', score: 70, type: 'quiz', topic: 'math' },
    ];
    const result = dedupeLeaderboardRows(rows);
    expect(result).toHaveLength(2);
  });

  test('treats name comparison case-insensitively', () => {
    const rows = [
      { name: 'alice', score: 50, type: 'quiz', topic: '' },
      { name: 'ALICE', score: 90, type: 'quiz', topic: '' },
    ];
    const result = dedupeLeaderboardRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(90);
  });

  test('sorts results by score descending', () => {
    const rows = [
      { name: 'Charlie', score: 40, type: 'quiz', topic: '' },
      { name: 'Alice', score: 90, type: 'quiz', topic: '' },
      { name: 'Bob', score: 70, type: 'quiz', topic: '' },
    ];
    const result = dedupeLeaderboardRows(rows);
    expect(result[0].name).toBe('Alice');
    expect(result[1].name).toBe('Bob');
    expect(result[2].name).toBe('Charlie');
  });

  test('skips rows without a name', () => {
    const rows = [
      { name: '', score: 100, type: 'quiz', topic: '' },
      { name: 'Valid', score: 50, type: 'quiz', topic: '' },
    ];
    const result = dedupeLeaderboardRows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  test('returns empty array for empty input', () => {
    expect(dedupeLeaderboardRows([])).toEqual([]);
  });

  test('keeps entries of different types separate', () => {
    const rows = [
      { name: 'Alice', score: 80, type: 'quiz', topic: 'math' },
      { name: 'Alice', score: 80, type: 'interview', topic: '' },
    ];
    const result = dedupeLeaderboardRows(rows);
    expect(result).toHaveLength(2);
  });
});

// 

describe('formatScoreTimestamp', () => {
  test('returns a non-empty string', () => {
    const ts = formatScoreTimestamp();
    expect(typeof ts).toBe('string');
    expect(ts.length).toBeGreaterThan(0);
  });

  test('includes date digits', () => {
    const ts = formatScoreTimestamp();
    // Should contain digits for year, month, day
    expect(/\d/.test(ts)).toBe(true);
  });
});

// 

describe('buildFallbackQuestions', () => {
  test('returns one question per category by default', () => {
    const result = buildFallbackQuestions(['Skills', 'Experience'], 1);
    expect(result).toHaveLength(2);
  });

  test('returns countPerCategory questions per category', () => {
    const result = buildFallbackQuestions(['Skills', 'Projects'], 3);
    expect(result).toHaveLength(6);
  });

  test('each question object has category, question, and idealAnswer', () => {
    const result = buildFallbackQuestions(['Skills'], 1);
    expect(result[0]).toHaveProperty('category', 'Skills');
    expect(result[0]).toHaveProperty('question');
    expect(result[0]).toHaveProperty('idealAnswer');
    expect(typeof result[0].question).toBe('string');
  });

  test('question text references the category name', () => {
    const result = buildFallbackQuestions(['Skills'], 1);
    expect(result[0].question.toLowerCase()).toContain('skills');
  });

  test('uses default categories when empty array is passed', () => {
    const result = buildFallbackQuestions([], 1);
    expect(result.length).toBeGreaterThan(0);
  });

  test('uses default categories when undefined is passed', () => {
    const result = buildFallbackQuestions(undefined, 1);
    expect(result.length).toBeGreaterThan(0);
  });

  test('clamps countPerCategory to at least 1', () => {
    const result = buildFallbackQuestions(['Skills'], 0);
    expect(result).toHaveLength(1);
  });

  test('adds follow-up suffix for index > 0 within the same category', () => {
    const result = buildFallbackQuestions(['Skills'], 2);
    expect(result[1].question).toContain('follow-up');
  });
});
