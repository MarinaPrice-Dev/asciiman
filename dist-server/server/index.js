import express, { Router } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3001;
// Initialize MongoDB client
const getMongoClient = async () => {
    const connectionString = process.env.AZURE_COSMOS_CONNECTIONSTRING;
    if (!connectionString) {
        console.error('Connection string is missing');
        throw new Error('MongoDB connection string not found in environment variables');
    }
    console.log('Attempting to connect to MongoDB...');
    try {
        const client = new MongoClient(connectionString, {
            // Azure Cosmos DB specific settings
            tls: true,
            replicaSet: 'globaldb',
            readPreference: 'primary',
            retryWrites: false,
            directConnection: true
        });
        await client.connect();
        console.log('Successfully connected to MongoDB');
        // Ensure index exists
        const db = client.db('asciiman');
        const scores = db.collection('scores');
        try {
            await scores.createIndex({ score: -1 });
            console.log('Index on score field created or already exists');
        }
        catch (error) {
            console.warn('Failed to create index, but continuing:', error);
        }
        return client;
    }
    catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
};
// Sanitize name to only allow alphanumeric characters
const sanitizeName = (name) => {
    return name.replace(/[^a-zA-Z0-9]/g, '');
};
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
// Get scores endpoint
app.get('/api/scores', async (req, res) => {
    let client = null;
    try {
        const { difficulty } = req.query;
        const filterDifficulty = typeof difficulty === 'string' ? difficulty.toLowerCase() : 'all';
        
        client = await getMongoClient();
        const db = client.db('asciiman');
        const scores = db.collection('scores');

        // Build query filter
        const queryFilter = filterDifficulty === 'all' ? {} : { mode: filterDifficulty };

        // Get scores with optional difficulty filter
        const allScores = await scores.find(queryFilter).toArray();
        const sortedScores = allScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        res.json({
            scores: sortedScores.map(score => ({
                ...score,
                name: score.name // In a real app, you might want to mask this
            }))
        });
    }
    catch (error) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
    finally {
        if (client) {
            try {
                await client.close();
                console.log('MongoDB connection closed');
            }
            catch (error) {
                console.error('Error closing MongoDB connection:', error);
            }
        }
    }
});
const router = Router();
// Submit score endpoint
app.post('/api/scores', (req, res) => {
    let client = null;
    (async () => {
        try {
            console.log('Received score submission:', {
                ...req.body,
                name: req.body.name ? '[REDACTED]' : undefined
            });
            const { name, score, time, mode } = req.body;
            if (!name || typeof score !== 'number' || typeof time !== 'number' || !mode) {
                return res.status(400).json({ error: 'Invalid input data' });
            }
            client = await getMongoClient();
            const db = client.db('asciiman');
            const scores = db.collection('scores');
            const scoreData = {
                name: sanitizeName(name),
                score,
                time,
                mode,
                timestamp: new Date()
            };
            await scores.insertOne(scoreData);
            res.status(201).json({ message: 'Score submitted successfully' });
        }
        catch (error) {
            console.error('Error submitting score:', error);
            res.status(500).json({ error: 'Failed to submit score' });
        }
        finally {
            if (client) {
                await client.close();
            }
        }
    })().catch(error => {
        console.error('Unhandled error:', error);
        res.status(500).json({ error: 'Internal server error' });
    });
});
app.use(router);
app.listen(port, () => {
    console.log(`Development server running on port ${port}`);
    console.log('Environment variables loaded:', {
        hasConnectionString: !!process.env.AZURE_COSMOS_CONNECTIONSTRING,
        port: port
    });
});
