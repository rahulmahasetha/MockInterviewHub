const mongoose = require('mongoose');
const { seedDefaultData, seedQuizData, seedResumeSections, cleanupDuplicateLeaderboardEntries } = require('../utils/seeder');

let isMongoDBConnected = false;

const connectDB = async (MONGODB_URI) => {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    console.log('Connected to MongoDB database successfully at ' + MONGODB_URI);
    isMongoDBConnected = true;

    // Drop stale indexes that don't match current schema
    try {
      const usersCollection = mongoose.connection.collection('users');
      const indexes = await usersCollection.indexes();
      for (const idx of indexes) {
        if (idx.key && idx.key.email !== undefined) {
          console.log('Dropping stale email index from users collection...');
          await usersCollection.dropIndex(idx.name);
          console.log('Stale email index removed successfully.');
        }
      }
    } catch (e) {
      if (e.codeName !== 'IndexNotFound') {
        console.log('Note: Could not clean stale indexes:', e.message);
      }
    }

    await seedDefaultData();
    await seedQuizData();
    await seedResumeSections();
    await cleanupDuplicateLeaderboardEntries();
  } catch (err) {
    console.log('\nMongoDB Connection Notice:');
    console.log(`Could not connect to database at ${MONGODB_URI}.`);
    console.log('Ensure MongoDB is running or specify a connection string via MONGODB_URI.');
    console.log('Resilient Mode Active: Running with local file database (db_fallback.json).\n');
    isMongoDBConnected = false;
  }
};

const getIsMongoDBConnected = () => isMongoDBConnected;

module.exports = { connectDB, getIsMongoDBConnected };
