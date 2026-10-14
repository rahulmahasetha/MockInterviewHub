const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, getIsMongoDBConnected } = require('./config/db');

// Import routes
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

// Connect to Database when server is started directly
if (require.main === module) {
  connectDB(MONGODB_URI);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint for deployment probes & uptime monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: getIsMongoDBConnected() ? 'connected' : 'fallback_mode'
  });
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/quiz-categories', quizRoutes);
app.use('/progress', progressRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/admin', adminRoutes);

// Start Express Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 EduQuest Backend Server Running on Port ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;

