const fs = require('fs');
const path = require('path');
const FALLBACK_DB_PATH = path.join(__dirname, '../db_fallback.json');

const formatScoreTimestamp = () => new Date().toLocaleString(undefined, {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

// Initialize fallback database file if it doesn't exist
if (!fs.existsSync(FALLBACK_DB_PATH)) {
  const initialData = {
    users: [],
    leaderboard: [
      { id: 1, name: "AlphaExplorer", score: 400, date: formatScoreTimestamp() },
      { id: 2, name: "QuizMaster", score: 320, date: formatScoreTimestamp() },
      { id: 3, name: "JungleJane", score: 260, date: formatScoreTimestamp() },
      { id: 4, name: "HistoryBuff", score: 200, date: formatScoreTimestamp() }
    ],
    progress: []
  };
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialData, null, 2));
}

const readFallbackData = () => {
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading fallback file:', err);
    return { users: [], leaderboard: [], progress: [] };
  }
};

const writeFallbackData = (data) => {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing fallback file:', err);
  }
};

module.exports = { readFallbackData, writeFallbackData };
