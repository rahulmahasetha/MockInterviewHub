const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, getIsMongoDBConnected } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const quizRoutes = require('./routes/quizRoutes');
const progressRoutes = require('./routes/progressRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/triviatrek';

if (require.main === module) {
  connectDB(MONGODB_URI);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check for deployment probes and uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: getIsMongoDBConnected() ? 'connected' : 'fallback_mode'
  });
});

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/quiz-categories', quizRoutes);
app.use('/progress', progressRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/resume', resumeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} — ${getIsMongoDBConnected() ? 'MongoDB connected' : 'fallback mode'}`);
  });
}

module.exports = app;
