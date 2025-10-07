const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors()); 
app.use(express.json());

// --- MongoDB Connection ---
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error("FATAL ERROR: The MONGODB_URI environment variable is not defined.");
    process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));
  
// --- Base Schedule Template ---
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
    weekId: { type: String, required: true, unique: true }, 
    schedule: { type: Object, required: true },
    attendance: { type: Object, default: {} },
    extraClasses: { type: Object, default: {} } // New field for extra classes
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
            // If no data exists, return the default template
            res.json({
                weekId: weekId,
                schedule: initialSchedule,
                attendance: {},
                extraClasses: {} // Return empty object for extra classes
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
        const { weekId, schedule, attendance, extraClasses } = req.body;
        if (!weekId) {
            return res.status(400).json({ message: 'weekId is required in the request body.' });
        }

        const updatedData = await WeeklyData.findOneAndUpdate(
            { weekId: weekId },
            { schedule, attendance, extraClasses }, // Include extraClasses in the update
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

