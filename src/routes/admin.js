const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pinRateLimiter, requireAuth } = require('../middleware');
const { broadcastSSE } = require('../sse');
const {
    getAdminSettings, setAdminSettings, saveAdminSettings,
    getVehicles, setVehicles, saveVehiclesData
} = require('../data');
const { logActivity } = require('../activity-log');

// PIN verification (rate limited)
router.post('/verify-pin', pinRateLimiter, async (req, res) => {
    const { pin } = req.body;
    const settings = getAdminSettings();

    if (!pin) return res.status(400).json({ error: 'PIN is required' });
    if (!settings.pin) return res.status(401).json({ error: 'No PIN configured' });

    try {
        const isMatch = await bcrypt.compare(pin, settings.pin);
        if (isMatch) {
            req.session.adminAuthenticated = true;
            logActivity('admin_login', 'Admin logged in via PIN');
            res.json({ success: true, message: 'PIN verified successfully' });
        } else {
            res.status(401).json({ error: 'Incorrect PIN' });
        }
    } catch (error) {
        console.error('Error verifying PIN:', error);
        res.status(500).json({ error: 'Error verifying PIN' });
    }
});

// Get public UI settings (no auth)
router.get('/ui-settings', (req, res) => {
    const settings = getAdminSettings();
    res.json({
        schoolName: settings.schoolName || '',
        theme: settings.theme || 'blue',
        darkMode: settings.darkMode || false,
        pathwayLabel: settings.pathwayLabel || 'Pathway'
    });
});

// Update UI settings (auth required)
router.put('/ui-settings', requireAuth, async (req, res) => {
    const { schoolName, theme, darkMode, pathwayLabel } = req.body;
    const validThemes = ['blue', 'green', 'purple', 'orange'];

    if (theme !== undefined && !validThemes.includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme' });
    }

    if (schoolName !== undefined) setAdminSettings('schoolName', String(schoolName).substring(0, 200));
    if (theme !== undefined) setAdminSettings('theme', theme);
    if (darkMode !== undefined) setAdminSettings('darkMode', !!darkMode);
    if (pathwayLabel !== undefined) setAdminSettings('pathwayLabel', String(pathwayLabel).substring(0, 50) || 'Pathway');
    setAdminSettings('lastModified', new Date().toISOString());

    await saveAdminSettings();

    const settings = getAdminSettings();
    const uiSettings = {
        schoolName: settings.schoolName,
        theme: settings.theme,
        darkMode: settings.darkMode,
        pathwayLabel: settings.pathwayLabel
    };
    broadcastSSE('settings', uiSettings);
    res.json({ success: true, settings: uiSettings });
});

// Get admin settings (auth required)
router.get('/admin-settings', (req, res) => {
    if (!req.session.adminAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const settings = getAdminSettings();
    res.json({ hasPin: !!settings.pin, lastModified: settings.lastModified });
});

// Update admin settings (auth required)
router.put('/admin-settings', async (req, res) => {
    if (!req.session.adminAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const { pin } = req.body;
    if (!pin || pin.trim().length === 0) {
        return res.status(400).json({ error: 'PIN is required' });
    }

    try {
        setAdminSettings('pin', await bcrypt.hash(pin.trim(), 10));
        setAdminSettings('lastModified', new Date().toISOString());
        await saveAdminSettings();

        res.json({
            success: true,
            message: 'Admin settings updated successfully',
            settings: { hasPin: true, lastModified: getAdminSettings().lastModified }
        });
    } catch (error) {
        console.error('Error updating admin settings:', error);
        res.status(500).json({ error: 'Error saving settings' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Could not log out' });
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Reset all arrivals
router.post('/reset', requireAuth, async (req, res) => {
    const vehicles = getVehicles();
    let resetCount = 0;
    let adhocRemoved = 0;

    const filtered = vehicles.filter(vehicle => {
        if (vehicle.type === 'adhoc') { adhocRemoved++; return false; }
        return true;
    });
    setVehicles(filtered);

    getVehicles().forEach(vehicle => {
        if (vehicle.status !== 'not-arrived') {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
            resetCount++;
        }
        vehicle.note = ''; // Clear any notes on reset
        if (vehicle.type !== 'bus') {
            vehicle.students.forEach(student => {
                if (student.status !== 'not-arrived') student.status = 'not-arrived';
            });
        }
    });

    await saveVehiclesData();
    console.log(`All vehicle arrivals reset: ${resetCount} vehicles reset, ${adhocRemoved} ad-hoc removed`);
    logActivity('reset_all', `All arrivals reset: ${resetCount} vehicles reset, ${adhocRemoved} ad-hoc removed`);
    res.json({ message: 'All arrivals reset successfully' });
});

// Manual reset: afternoon
router.post('/reset/afternoon', requireAuth, async (req, res) => {
    const { resetForAfternoonDismissal } = require('../scheduler');
    await resetForAfternoonDismissal();
    logActivity('reset_afternoon', 'Afternoon dismissal reset performed');
    res.json({ success: true, message: 'Afternoon dismissal reset completed - arrived students reset to not-arrived' });
});

// Manual reset: end of day
router.post('/reset/day', requireAuth, async (req, res) => {
    const { resetForNewDay } = require('../scheduler');
    await resetForNewDay();
    logActivity('reset_day', 'End of day reset performed');
    res.json({ success: true, message: 'End of day reset completed - all students reset to not-arrived' });
});

// Stats
router.get('/stats', (req, res) => {
    const vehicles = getVehicles();
    const totalVehicles = vehicles.length;
    const arrivedVehicles = vehicles.filter(v => v.status === 'arrived').length;
    const partialVehicles = vehicles.filter(v => v.status === 'partial').length;
    const notArrivedVehicles = vehicles.filter(v => v.status === 'not-arrived').length;
    const absentVehicles = vehicles.filter(v => v.status === 'absent').length;

    let totalStudents = 0, arrivedStudents = 0, absentStudents = 0;
    vehicles.forEach(vehicle => {
        if (vehicle.type === 'bus') {
            totalStudents += vehicle.students.length;
            if (vehicle.status === 'arrived') arrivedStudents += vehicle.students.length;
            else if (vehicle.status === 'absent') absentStudents += vehicle.students.length;
        } else {
            vehicle.students.forEach(student => {
                totalStudents++;
                if (student.status === 'arrived') arrivedStudents++;
                else if (student.status === 'absent') absentStudents++;
            });
        }
    });

    res.json({
        vehicles: { total: totalVehicles, arrived: arrivedVehicles, partial: partialVehicles, notArrived: notArrivedVehicles, absent: absentVehicles },
        students: { total: totalStudents, arrived: arrivedStudents, absent: absentStudents, notArrived: totalStudents - arrivedStudents - absentStudents }
    });
});

module.exports = router;
