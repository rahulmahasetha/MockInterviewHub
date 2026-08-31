const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dedupeLeaderboardRows = (rows) => {
  const byKey = new Map();

  for (const row of rows) {
    if (!row.name) continue;
    const key = `${row.name.toLowerCase()}_${row.type || 'quiz'}_${row.topic || ''}`;

    const existing = byKey.get(key);
    if (!existing || Number(row.score) > Number(existing.score)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => Number(b.score) - Number(a.score));
};

const createInitialCategoryProgress = () => {
  const { QUIZ_CATEGORIES } = require('./seeder');
  return QUIZ_CATEGORIES.reduce((acc, category) => {
    acc[category.slug] = { passed: [], score: 0 };
    return acc;
  }, {});
};

const formatScoreTimestamp = () => new Date().toLocaleString(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const buildFallbackQuestions = (categories = [], countPerCategory = 1) => {
  const safeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['Skills', 'Experience'];
  const perCategory = Math.max(1, Number(countPerCategory) || 1);

  return safeCategories.flatMap((category, index) =>
    Array.from({ length: perCategory }, (_, questionIndex) => ({
      category,
      question: `Based on your resume, please explain one ${String(category).toLowerCase()} item you listed and the impact it had${questionIndex > 0 ? ` (follow-up ${questionIndex + 1})` : ''}.`,
      idealAnswer: `A strong answer should reference the exact resume item, explain the candidate's role, decisions, technical details, impact, and lessons learned.`
    }))
  );
};

module.exports = { escapeRegExp, dedupeLeaderboardRows, createInitialCategoryProgress, formatScoreTimestamp, buildFallbackQuestions };
