const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001; // Adjusted default port

// --- Middleware ---
app.use(cors()); 
app.use(express.json());

// --- MongoDB Connection ---
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));
  
// --- Base Schedule Template ---
// This acts as the default template for any new week.
const initialSchedule = {
    headers: ["Day", "8:45-9:40", "9:40-10:35", "10:35-10:50", "10:50-11:45", "11:45-12:40", "12:40-1:40", "1:40-2:35", "2:35-3:30", "3:30-4:25", "4:25-5:20"],
    rows: [
        ["Monday", "BDA-Lab", "BDA-Lab", "Tea Break", "OE", "DL", "Lunch Break", "Project Phase-II", "Project Phase-II", "", ""],
        ["Tuesday", "INS", "DL", "Tea Break", "OE", "PC", "Lunch Break", "Project Phase-II", "Project Phase-II", "", ""],
        ["Wednesday", "DL", "BDA", "Tea Break", "OE", "INS", "Lunch Break", "STEIGEN", "STEIGEN", "", ""],
        ["Thursday", "INS", "PC", "Tea Break", "BDA", "PC", "Lunch Break", "SOFTSKILL", "SOFTSKILL", "", ""],
        ["Friday", "INS", "BDA", "Tea Break", "PC-Lab", "PC-Lab", "Lunch Break", "Project Phase-II", "Project Phase-II", "", ""]
    ]
};

// --- Data Schema for Weekly Data ---
const WeeklyDataSchema = new mongoose.Schema({
    // weekId will be the date of the Monday of that week, e.g., "2025-10-27"
    weekId: { type: String, required: true, unique: true }, 
    schedule: { type: Object, required: true },
    attendance: { type: Object, default: {} }
});

const WeeklyData = mongoose.model('WeeklyData', WeeklyDataSchema);

// --- API Routes ---
// GET: Retrieve data for a specific week
app.get('/api/data', async (req, res) => {
    const { weekId } = req.query;
    if (!weekId) {
        return res.status(400).json({ message: 'weekId query parameter is required.' });
    }

    try {
        let data = await WeeklyData.findOne({ weekId });
        if (!data) {
            // If no data exists for this week, return the default schedule
            // with empty attendance. This allows the user to see the schedule
            // for a future week without creating a DB entry yet.
            res.json({
                weekId: weekId,
                schedule: initialSchedule,
                attendance: {}
            });
        } else {
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST: Update or create data for a specific week
app.post('/api/data', async (req, res) => {
    try {
        const { weekId, schedule, attendance } = req.body;
        if (!weekId) {
            return res.status(400).json({ message: 'weekId is required in the request body.' });
        }

        // Find the document for the week and update it, or create it if it doesn't exist (upsert: true)
        const updatedData = await WeeklyData.findOneAndUpdate(
            { weekId: weekId },
            { schedule, attendance },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(updatedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

