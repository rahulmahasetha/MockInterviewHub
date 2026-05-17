const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/triviatrek';

app.use(cors());
app.use(express.json());

// Path to fallback database file
const FALLBACK_DB_PATH = path.join(__dirname, 'db_fallback.json');

// Initialize fallback database file if it doesn't exist
if (!fs.existsSync(FALLBACK_DB_PATH)) {
  const initialData = {
    users: [],
    leaderboard: [
      { id: 1, name: "AlphaExplorer", score: 400, date: new Date().toLocaleDateString() },
      { id: 2, name: "QuizMaster", score: 320, date: new Date().toLocaleDateString() },
      { id: 3, name: "JungleJane", score: 260, date: new Date().toLocaleDateString() },
      { id: 4, name: "HistoryBuff", score: 200, date: new Date().toLocaleDateString() }
    ],
    progress: []
  };
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(initialData, null, 2));
}

// Helper to read fallback data
const readFallbackData = () => {
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading fallback file:', err);
    return { users: [], leaderboard: [], progress: [] };
  }
};

// Helper to write fallback data
const writeFallbackData = (data) => {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing fallback file:', err);
  }
};

// Mongoose Connection with Graceful Fallback
let isMongoDBConnected = false;

console.log('🔌 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 5 seconds timeout
})
.then(() => {
  console.log('✅ Connected to MongoDB database successfully at ' + MONGODB_URI);
  isMongoDBConnected = true;
  seedDefaultData();
})
.catch(err => {
  console.log('\n⚠️  MongoDB Connection Failed!');
  console.log(`Could not connect to database at ${MONGODB_URI}.`);
  console.log('💡 INSTRUCTIONS: Please ensure MongoDB is installed and running on your system.');
  console.log('💡 Alternatively, specify a custom connection string in the MONGODB_URI environment variable.');
  console.log('🛡️  RESILIENT MODE: Falling back to local file-based database (db_fallback.json).\n');
  isMongoDBConnected = false;
});

// --- MongoDB / Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  science: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  jungle: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  math: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  history: {
    passed: { type: [Number], default: [] },
    score: { type: Number, default: 0 }
  },
  highestScore: { type: Number, default: 0 }
});

const LeaderboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  date: { type: String, required: true },
  id: { type: Number, unique: true, required: true }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Progress = mongoose.models.Progress || mongoose.model('Progress', ProgressSchema);
const Leaderboard = mongoose.models.Leaderboard || mongoose.model('Leaderboard', LeaderboardSchema);

// Seed default data to MongoDB if connected and empty
async function seedDefaultData() {
  try {
    const count = await Leaderboard.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial leaderboard entries to MongoDB...');
      const fallback = readFallbackData();
      await Leaderboard.insertMany(fallback.leaderboard);
      console.log('✅ Seeding complete!');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

// --- EXPRESS API ROUTES ---

// 1. User Management CRUD
app.get('/users', async (req, res) => {
  if (isMongoDBConnected) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json(data.users);
  }
});

app.post('/users', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  if (isMongoDBConnected) {
    try {
      let existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(200).json(existingUser); // return existing
      }
      const newUser = new User({ username });
      await newUser.save();
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    let existingUser = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(200).json(existingUser);
    }
    const newUser = { id: Date.now(), username, createdAt: new Date() };
    data.users.push(newUser);
    writeFallbackData(data);
    res.status(201).json(newUser);
  }
});

app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.users.findIndex(u => u.id.toString() === id.toString());
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.users[idx]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  }
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      await User.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const filtered = data.users.filter(u => u.id.toString() !== id.toString());
    data.users = filtered;
    writeFallbackData(data);
    res.json({ success: true });
  }
});

// 2. User Progress CRUD
app.get('/progress', async (req, res) => {
  const { userId } = req.query;
  
  if (isMongoDBConnected) {
    try {
      if (userId) {
        const progress = await Progress.findOne({ userId });
        res.json(progress ? [progress] : []);
      } else {
        const progressList = await Progress.find();
        res.json(progressList);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (userId) {
      const filtered = data.progress.filter(p => p.userId === userId);
      res.json(filtered);
    } else {
      res.json(data.progress);
    }
  }
});

app.post('/progress', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  if (isMongoDBConnected) {
    try {
      let existingProgress = await Progress.findOne({ userId });
      if (existingProgress) {
        return res.status(200).json(existingProgress);
      }
      const newProgress = new Progress(req.body);
      await newProgress.save();
      res.status(201).json(newProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    let existingProgress = data.progress.find(p => p.userId === userId);
    if (existingProgress) {
      return res.status(200).json(existingProgress);
    }
    const newProgress = { id: Date.now().toString(), ...req.body };
    data.progress.push(newProgress);
    writeFallbackData(data);
    res.status(201).json(newProgress);
  }
});

app.put('/progress/:id', async (req, res) => {
  const { id } = req.params;
  
  if (isMongoDBConnected) {
    try {
      // Allow updating by userId or mongoose _id
      let updatedProgress;
      if (mongoose.Types.ObjectId.isValid(id)) {
        updatedProgress = await Progress.findByIdAndUpdate(id, req.body, { new: true });
      }
      
      if (!updatedProgress) {
        updatedProgress = await Progress.findOneAndUpdate({ userId: id }, req.body, { new: true });
      }

      if (!updatedProgress) {
        // Fallback: If not found, let's create a new one
        updatedProgress = new Progress({ userId: id, ...req.body });
        await updatedProgress.save();
      }

      res.json(updatedProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.progress.findIndex(p => p.id === id || p.userId === id);
    if (idx !== -1) {
      data.progress[idx] = { ...data.progress[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.progress[idx]);
    } else {
      // Create new fallback progress
      const newProgress = { id: Date.now().toString(), userId: id, ...req.body };
      data.progress.push(newProgress);
      writeFallbackData(data);
      res.json(newProgress);
    }
  }
});

app.delete('/progress/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Progress.findByIdAndDelete(id);
      } else {
        await Progress.findOneAndDelete({ userId: id });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const filtered = data.progress.filter(p => p.id !== id && p.userId !== id);
    data.progress = filtered;
    writeFallbackData(data);
    res.json({ success: true });
  }
});

// 3. Leaderboard CRUD
app.get('/leaderboard', async (req, res) => {
  if (isMongoDBConnected) {
    try {
      // Default: sort by score descending
      const leaderboard = await Leaderboard.find().sort({ score: -1 }).limit(10);
      res.json(leaderboard);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const sorted = [...data.leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    res.json(sorted);
  }
});

app.post('/leaderboard', async (req, res) => {
  const entry = req.body;
  if (!entry.name || entry.score === undefined) {
    return res.status(400).json({ error: 'Name and score are required' });
  }

  // Ensure entry has an id
  if (!entry.id) {
    entry.id = Date.now() + Math.floor(Math.random() * 1000);
  }
  if (!entry.date) {
    entry.date = new Date().toLocaleDateString();
  }

  if (isMongoDBConnected) {
    try {
      const newEntry = new Leaderboard(entry);
      await newEntry.save();
      res.status(201).json(newEntry);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    data.leaderboard.push(entry);
    writeFallbackData(data);
    res.status(201).json(entry);
  }
});

app.put('/leaderboard/:id', async (req, res) => {
  const { id } = req.params;
  if (isMongoDBConnected) {
    try {
      let updatedEntry = await Leaderboard.findOneAndUpdate({ id: Number(id) }, req.body, { new: true });
      if (!updatedEntry && mongoose.Types.ObjectId.isValid(id)) {
        updatedEntry = await Leaderboard.findByIdAndUpdate(id, req.body, { new: true });
      }
      res.json(updatedEntry);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    const idx = data.leaderboard.findIndex(l => l.id.toString() === id.toString());
    if (idx !== -1) {
      data.leaderboard[idx] = { ...data.leaderboard[idx], ...req.body };
      writeFallbackData(data);
      res.json(data.leaderboard[idx]);
    } else {
      res.status(404).json({ error: 'Leaderboard entry not found' });
    }
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 EduQuest Backend Server Running on Port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
