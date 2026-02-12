const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'leaderboard.json');

// Middleware
app.use(cors()); // In production, replace with: app.use(cors({ origin: 'http://your-domain.com' }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// Leaderboard memory cache to prevent race conditions
let leaderboardCache = [];
try {
    if (fs.existsSync(DATA_FILE)) {
        leaderboardCache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } else {
        fs.writeFileSync(DATA_FILE, '[]');
    }
} catch (e) {
    console.error('Failed to load leaderboard:', e);
    leaderboardCache = [];
}

// Routes

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
    // Return sorted cache
    res.json(leaderboardCache.sort((a, b) => b.score - a.score));
});

// Submit Score
app.post('/api/leaderboard', (req, res) => {
    const { name, score, level } = req.body;

    // Enhanced validation
    if (!name || typeof name !== 'string' || name.trim().length === 0 || 
        typeof score !== 'number' || score < 0 || typeof level !== 'number') {
        return res.status(400).json({ error: 'Invalid data provided.' });
    }

    const newEntry = {
        name: name.trim().substring(0, 20),
        score,
        level,
        date: new Date().toISOString().split('T')[0]
    };

    // Update cache synchronously to prevent race conditions
    leaderboardCache.push(newEntry);
    leaderboardCache.sort((a, b) => b.score - a.score);
    if (leaderboardCache.length > 50) {
        leaderboardCache = leaderboardCache.slice(0, 50);
    }

    // Persist to file asynchronously
    fs.writeFile(DATA_FILE, JSON.stringify(leaderboardCache, null, 2), (writeErr) => {
        if (writeErr) {
            console.error('Failed to save leaderboard to file:', writeErr);
        }
    });

    res.status(201).json({ message: 'Score saved successfully.', entry: newEntry });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
