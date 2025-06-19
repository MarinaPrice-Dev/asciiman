import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import type { GameScore } from '../src/api/scores';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// Initialize MongoDB client
const getMongoClient = async (): Promise<MongoClient> => {
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  
  if (!username || !password) {
    throw new Error('MongoDB credentials not found in environment variables');
  }

  const uri = `mongodb://${username}:${password}@asciistudio-server.mongo.cosmos.azure.com:443/`;
  const client = new MongoClient(uri, {
    tls: true,
    replicaSet: 'globaldb',
    retryWrites: false,
    maxIdleTimeMS: 120000,
  });

  await client.connect();
  return client;
};

// Sanitize name to only allow alphanumeric characters
const sanitizeName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9]/g, '');
};

// Submit score endpoint
app.post('/api/scores', async (req, res) => {
  let client: MongoClient | null = null;
  
  try {
    const { name, score, time, mode } = req.body;
    
    // Validate input
    if (!name || typeof score !== 'number' || typeof time !== 'number' || !mode) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    client = await getMongoClient();
    const db = client.db('asciiman');
    const scores = db.collection<GameScore>('scores');

    const scoreData: GameScore = {
      name: sanitizeName(name),
      score,
      time,
      mode,
      timestamp: new Date()
    };

    await scores.insertOne(scoreData);
    res.status(201).json({ message: 'Score submitted successfully' });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle client-side routing by serving index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Production server running on port ${port}`);
}); 