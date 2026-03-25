const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const { getTodayEntries, getEntriesForDate, getAvailableDates } = require('../activity-log');
const { generateInsights } = require('../insights');

// Get today's activity log
router.get('/', requireAuth, async (req, res) => {
    try {
        const entries = await getTodayEntries();
        res.json(entries);
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ error: 'Error fetching activity log' });
    }
});

// Get available log dates
router.get('/dates', requireAuth, async (req, res) => {
    try {
        const dates = await getAvailableDates();
        res.json(dates);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching log dates' });
    }
});

// Get log for a specific date
router.get('/date/:date', requireAuth, async (req, res) => {
    const dateStr = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    try {
        const entries = await getEntriesForDate(dateStr);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching log for date' });
    }
});

// Get smart insights
router.get('/insights', requireAuth, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 14, 90);
        const insights = await generateInsights(days);
        res.json(insights);
    } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({ error: 'Error generating insights' });
    }
});

module.exports = router;
