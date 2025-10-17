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
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("FATAL ERROR: The MONGODB_URI environment variable is not defined.");
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// --- Data Schema ---
const AppDataSchema = new mongoose.Schema({
    weekId: { type: String, required: true, unique: true }, // Format: "YYYY-MM-DD" of the Monday
    schedule: Object,
    attendance: Object,
    extraClasses: Object
});

const AppData = mongoose.model('AppData', AppDataSchema);

// --- Initial Data (Template) ---
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

// --- API Routes ---

// GET weekly data
app.get('/api/data', async (req, res) => {
    const { weekId } = req.query;
    if (!weekId) {
        return res.status(400).json({ message: "weekId is required" });
    }

    try {
        let data = await AppData.findOne({ weekId });
        if (!data) {
            // If no data for this week, return the default schedule
            return res.json({
                schedule: initialSchedule,
                attendance: {},
                extraClasses: {}
            });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Server error fetching weekly data", error });
    }
});

// POST (save) weekly data
app.post('/api/data', async (req, res) => {
    const { weekId, schedule, attendance, extraClasses } = req.body;
    if (!weekId) {
        return res.status(400).json({ message: "weekId is required" });
    }

    try {
        await AppData.findOneAndUpdate(
            { weekId },
            { schedule, attendance, extraClasses },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: "Data saved successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error saving data", error });
    }
});

// GET overall summary data
app.get('/api/summary', async (req, res) => {
    try {
        const getMonday = d => {
            d = new Date(d);
            d.setHours(0, 0, 0, 0);
            const day = d.getDay(),
                diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.setDate(diff));
        };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mondayOfCurrentWeek = getMonday(today);

        const allRecords = await AppData.find({});
        
        let totalScheduled = 0;
        let totalAttended = 0;
        
        const dayMap = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7 };
        const todayDayIndex = today.getDay() === 0 ? 7 : today.getDay();

        for (const record of allRecords) {
            const recordDate = new Date(record.weekId);
            if (recordDate > mondayOfCurrentWeek) {
                continue; // Skip future weeks
            }

            const { schedule, attendance, extraClasses } = record;
            if (!schedule || !schedule.rows) continue;

            const isCurrentWeek = recordDate.getTime() === mondayOfCurrentWeek.getTime();

            schedule.rows.forEach(row => {
                const dayName = row[0];
                const dayIndex = dayMap[dayName];
                
                // If it's the current week, only count days up to today
                if (isCurrentWeek && dayIndex > todayDayIndex) {
                    return; 
                }

                const classItems = row.slice(1);
                for (let timeIndex = 0; timeIndex < classItems.length; timeIndex++) {
                    const item = classItems[timeIndex];
                    if (item && !['Tea Break', 'Lunch Break'].includes(item)) {
                        const timeSlot = schedule.headers[timeIndex + 1];
                        const attendanceStatus = attendance?.[dayName]?.[timeSlot]?.status;
                        
                        if (attendanceStatus !== 'cancelled') {
                            totalScheduled++;
                            if (attendanceStatus === 'present') {
                                totalAttended++;
                            }
                        }

                        let colSpan = 1;
                        while (timeIndex + colSpan < classItems.length && classItems[timeIndex + colSpan] === item) {
                            colSpan++;
                        }
                        timeIndex += colSpan - 1;
                    }
                }
            });

            if (extraClasses) {
                for (const subject in extraClasses) {
                    totalAttended += extraClasses[subject];
                }
            }
        }

        res.json({ totalScheduled, totalAttended });
    } catch (error) {
        res.status(500).json({ message: "Server error fetching summary data", error });
    }
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

