import { MongoClient } from 'mongodb';

// Types
export interface GameScore {
  name: string;
  score: number;
  time: number;
  mode: string;
  timestamp: Date;
}

// Sanitize name to only allow alphanumeric characters
export const sanitizeName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9]/g, '');
};

// Initialize MongoDB client
const getMongoClient = async (): Promise<MongoClient> => {
  // In production, these should be fetched from Azure Key Vault
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  
  if (!username || !password) {
    throw new Error('MongoDB credentials not found in environment variables');
  }

  const uri = `mongodb://${username}:${password}@asciistudio-server.mongo.cosmos.azure.com:443/`;
  const client = new MongoClient(uri, {
    // Azure Cosmos DB for MongoDB requires TLS
    tls: true,
    replicaSet: 'globaldb',
    retryWrites: false,
    maxIdleTimeMS: 120000,
  });

  await client.connect();
  return client;
};

// Submit score to MongoDB
export const submitScore = async (scoreData: Omit<GameScore, 'timestamp'>): Promise<void> => {
  let client: MongoClient | null = null;
  
  try {
    client = await getMongoClient();
    const db = client.db('asciiman');
    const scores = db.collection<GameScore>('scores');

    const score: GameScore = {
      ...scoreData,
      name: sanitizeName(scoreData.name), // Sanitize name before saving
      timestamp: new Date()
    };

    await scores.insertOne(score);
  } catch (error) {
    console.error('Error submitting score:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}; 