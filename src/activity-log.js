const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_DIR = path.join(DATA_DIR, 'logs');

// In-memory buffer for today's log entries
let todayEntries = [];
let loadedDate = null;

function getTodayString() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getLogFilePath(dateStr) {
    return path.join(LOG_DIR, `${dateStr}.json`);
}

async function ensureLogDir() {
    await fs.mkdir(LOG_DIR, { recursive: true });
}

// Load today's log from disk
async function loadTodayLog() {
    const today = getTodayString();
    if (loadedDate === today && todayEntries.length > 0) return;

    await ensureLogDir();
    try {
        const data = await fs.readFile(getLogFilePath(today), 'utf8');
        todayEntries = JSON.parse(data);
        loadedDate = today;
    } catch (err) {
        if (err.code === 'ENOENT') {
            todayEntries = [];
            loadedDate = today;
        } else {
            console.error('Error loading activity log:', err.message);
            todayEntries = [];
            loadedDate = today;
        }
    }
}

// Save today's log to disk
async function saveTodayLog() {
    await ensureLogDir();
    const today = getTodayString();
    const filePath = getLogFilePath(today);
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(todayEntries, null, 2));
    await fs.rename(tmpPath, filePath);
}

// Add a log entry
async function logActivity(action, details, extra = {}) {
    const today = getTodayString();
    // If day rolled over, flush and reset
    if (loadedDate !== today) {
        todayEntries = [];
        loadedDate = today;
    }

    const entry = {
        timestamp: new Date().toISOString(),
        action,
        details,
        ...extra
    };

    todayEntries.push(entry);

    // Save async (don't block the caller)
    saveTodayLog().catch(err => console.error('Error saving activity log:', err.message));

    return entry;
}

// Get today's log entries
async function getTodayEntries() {
    await loadTodayLog();
    return [...todayEntries].reverse(); // newest first
}

// Get log entries for a specific date
async function getEntriesForDate(dateStr) {
    if (dateStr === getTodayString()) {
        return getTodayEntries();
    }

    try {
        const data = await fs.readFile(getLogFilePath(dateStr), 'utf8');
        return JSON.parse(data).reverse();
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        console.error('Error reading log for', dateStr, err.message);
        return [];
    }
}

// Get list of available log dates
async function getAvailableDates() {
    await ensureLogDir();
    try {
        const files = await fs.readdir(LOG_DIR);
        return files
            .filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
            .map(f => f.replace('.json', ''))
            .sort()
            .reverse(); // newest first
    } catch {
        return [];
    }
}

// Cleanup logs older than N days
async function cleanupOldLogs(keepDays = 90) {
    await ensureLogDir();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    try {
        const files = await fs.readdir(LOG_DIR);
        for (const file of files) {
            if (!file.endsWith('.json') || file.endsWith('.tmp')) continue;
            const dateStr = file.replace('.json', '');
            if (dateStr < cutoffStr) {
                await fs.unlink(path.join(LOG_DIR, file));
                console.log(`Cleaned up old log: ${file}`);
            }
        }
    } catch (err) {
        console.error('Error cleaning up logs:', err.message);
    }
}

module.exports = {
    logActivity,
    getTodayEntries,
    getEntriesForDate,
    getAvailableDates,
    loadTodayLog,
    cleanupOldLogs
};
