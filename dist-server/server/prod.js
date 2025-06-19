import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import helmet from 'helmet';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
}));
// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://asciiman-hmexechchsavd4hx.uksouth-01.azurewebsites.net',
    'http://localhost:5173',
    'http://localhost:3001'
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));
// Request size limits
app.use(express.json({ limit: '10kb' }));
const port = process.env.PORT || 3000;
// Initialize MongoDB client with proper Azure Cosmos DB settings
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
            directConnection: true,
            // Add timeouts
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 30000
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
                name: score.name
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
// Validate score data
const validateScoreData = (data) => {
    if (!data || typeof data !== 'object')
        return false;
    const submission = data;
    const validModes = ['easy', 'medium', 'hard', 'insane'];
    return (
    // Name validation
    typeof submission.name === 'string' &&
        submission.name.length >= 1 &&
        submission.name.length <= 20 &&
        // Score validation
        typeof submission.score === 'number' &&
        Number.isInteger(submission.score) &&
        submission.score >= 0 &&
        submission.score <= 999999 &&
        // Time validation
        typeof submission.time === 'number' &&
        Number.isInteger(submission.time) &&
        submission.time >= 0 &&
        submission.time <= 3600 && // Max 1 hour
        // Mode validation
        typeof submission.mode === 'string' &&
        validModes.includes(submission.mode.toLowerCase()));
};
// Submit score endpoint
app.post('/api/scores', (req, res) => {
    let client = null;
    (async () => {
        try {
            console.log('Received score submission:', {
                ...req.body,
                name: req.body.name ? '[REDACTED]' : undefined
            });
            // Validate input
            if (!validateScoreData(req.body)) {
                console.error('Invalid input data:', {
                    data: {
                        ...req.body,
                        name: req.body.name ? '[REDACTED]' : undefined
                    }
                });
                return res.status(400).json({ error: 'Invalid input data' });
            }
            const { name, score, time, mode } = req.body;
            client = await getMongoClient();
            const db = client.db('asciiman');
            const scores = db.collection('scores');
            const scoreData = {
                name: sanitizeName(name).slice(0, 20), // Ensure max length
                score: Math.min(Math.max(0, score), 999999), // Ensure within bounds
                time: Math.min(Math.max(0, time), 3600),
                mode: mode.toLowerCase(),
                timestamp: new Date()
            };
            // Rate limiting check
            const recentSubmissions = await scores.countDocuments({
                name: scoreData.name,
                timestamp: { $gt: new Date(Date.now() - 60000) } // Last minute
            });
            if (recentSubmissions >= 5) {
                return res.status(429).json({ error: 'Too many submissions. Please wait.' });
            }
            console.log('Attempting to insert score:', {
                ...scoreData,
                name: '[REDACTED]'
            });
            await scores.insertOne(scoreData);
            console.log('Score inserted successfully');
            res.status(201).json({ message: 'Score submitted successfully' });
        }
        catch (error) {
            console.error('Error submitting score:', error);
            res.status(500).json({ error: 'Failed to submit score' });
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
    })().catch(error => {
        console.error('Unhandled error:', error);
        res.status(500).json({ error: 'Internal server error' });
    });
});
// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));
// Handle client-side routing by serving index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});
app.listen(port, () => {
    console.log(`Production server running on port ${port}`);
    console.log('Environment variables loaded:', {
        hasConnectionString: !!process.env.AZURE_COSMOS_CONNECTIONSTRING,
        port: port
    });
});
