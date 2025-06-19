import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import type { GameScore } from '../src/api/scores';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

// Initialize MongoDB client
const getMongoClient = async (): Promise<MongoClient> => {
  const connectionString = process.env.AZURE_COSMOS_CONNECTIONSTRING;
  
  if (!connectionString) {
    console.error('Connection string is missing');
    throw new Error('MongoDB connection string not found in environment variables');
  }

  console.log('Attempting to connect to MongoDB...');
  try {
    const client = new MongoClient(connectionString);
    await client.connect();
    console.log('Successfully connected to MongoDB');
    return client;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Sanitize name to only allow alphanumeric characters
const sanitizeName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9]/g, '');
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Get scores endpoint
app.get('/api/scores', async (req, res) => {
  let client: MongoClient | null = null;
  
  try {
    client = await getMongoClient();
    const db = client.db('asciiman');
    const scores = db.collection<GameScore>('scores');

    // Get the latest 10 scores, sorted by score (highest first)
    const latestScores = await scores.find()
      .sort({ score: -1 })
      .limit(10)
      .toArray();

    res.json({
      scores: latestScores.map(score => ({
        ...score,
        name: score.name // In a real app, you might want to mask this
      }))
    });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('MongoDB connection closed');
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
      }
    }
  }
});

// Submit score endpoint
app.post('/api/scores', async (req, res) => {
  let client: MongoClient | null = null;
  
  try {
    console.log('Received score submission:', {
      ...req.body,
      // Don't log the actual name for privacy
      name: req.body.name ? '[REDACTED]' : undefined
    });

    const { name, score, time, mode } = req.body;
    
    // Validate input
    if (!name || typeof score !== 'number' || typeof time !== 'number' || !mode) {
      console.error('Invalid input data:', {
        hasName: !!name,
        scoreType: typeof score,
        timeType: typeof time,
        hasMode: !!mode
      });
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

    console.log('Attempting to insert score:', {
      ...scoreData,
      name: '[REDACTED]'
    });

    await scores.insertOne(scoreData);
    console.log('Score inserted successfully');
    res.status(201).json({ message: 'Score submitted successfully' });
  } catch (error) {
    console.error('Error submitting score:', error);
    // Send more detailed error information in development
    if (process.env.NODE_ENV !== 'production') {
      res.status(500).json({ 
        error: 'Failed to submit score',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.status(500).json({ error: 'Failed to submit score' });
    }
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('MongoDB connection closed');
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
      }
    }
  }
});

app.listen(port, () => {
  console.log(`Development server running on port ${port}`);
  console.log('Environment variables loaded:', {
    hasConnectionString: !!process.env.AZURE_COSMOS_CONNECTIONSTRING,
    port: port
  });
}); 