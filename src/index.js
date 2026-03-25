const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');

const { registerSSE } = require('./sse');
const {
    loadAdminSettings, loadVehiclesData, loadStudentsData,
    saveVehiclesData, saveStudentsData,
    getAdminSettings, getVehicles
} = require('./data');
const { scheduleAutomatedResets } = require('./scheduler');
const vehicleRoutes = require('./routes/vehicles');
const studentRoutes = require('./routes/students');
const adminRoutes = require('./routes/admin');
const logRoutes = require('./routes/log');
const { loadTodayLog, cleanupOldLogs } = require('./activity-log');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTP request logging
app.use(morgan('short'));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const SESSION_SECRET = process.env.SESSION_SECRET || 'vehicle-arrival-system-secret-key-2024';
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  WARNING: Using default session secret. Set SESSION_SECRET environment variable for production.');
}

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// SSE for real-time updates
registerSSE(app);

// Page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/display-new.html'));
});

app.get('/admin', (req, res) => {
    if (req.session.adminAuthenticated) {
        res.sendFile(path.join(__dirname, '../public/admin-new.html'));
    } else {
        res.sendFile(path.join(__dirname, '../public/admin-pin.html'));
    }
});

app.get('/display', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/display-new.html'));
});

app.get('/display-old', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/display.html'));
});

// API routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/log', logRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/health', (req, res) => {
    const vehicles = getVehicles();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        totalVehicles: vehicles.length,
        arrivedVehicles: vehicles.filter(v => v.status === 'arrived').length
    });
});

// Startup
async function startServer() {
    const dataLoaded = await loadVehiclesData();
    const studentsLoaded = await loadStudentsData();
    await loadAdminSettings();

    // Migrate plaintext PIN to bcrypt hash if needed
    const settings = getAdminSettings();
    if (settings.pin && !settings.pin.startsWith('$2')) {
        console.log('Migrating plaintext PIN to hashed PIN...');
        const { setAdminSettings, saveAdminSettings } = require('./data');
        setAdminSettings('pin', await bcrypt.hash(settings.pin, 10));
        await saveAdminSettings();
        console.log('PIN migration complete');
    }

    if (!dataLoaded) {
        getVehicles().forEach(vehicle => {
            if (!vehicle.lastModified) {
                const baseTime = new Date();
                baseTime.setMinutes(baseTime.getMinutes() - Math.floor(Math.random() * 60));
                vehicle.lastModified = baseTime.toISOString();
            }
        });
    }

    scheduleAutomatedResets();

    // Load activity log for today and clean up old logs
    await loadTodayLog();
    cleanupOldLogs(90);

    app.listen(PORT, () => {
        console.log(`🚀 Vehicle Arrival System running on port ${PORT}`);
        console.log(`👨‍💼 Admin interface: http://localhost:${PORT}/admin`);
        console.log(`📺 Display interface: http://localhost:${PORT}/display`);
        console.log(`📊 API endpoints: http://localhost:${PORT}/api/vehicles`);
        console.log(`💾 Data persistence: ${dataLoaded ? 'Loaded from file' : 'Using default data'}`);

        // Save data every 5 minutes as a backup
        setInterval(saveVehiclesData, 5 * 60 * 1000);
    });
}

startServer().catch(error => {
    console.error('Error starting server:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, saving data before shutdown...');
    await saveVehiclesData();
    await saveStudentsData();
    console.log('✅ Data saved, shutting down gracefully');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, saving data before shutdown...');
    await saveVehiclesData();
    await saveStudentsData();
    console.log('✅ Data saved, shutting down gracefully');
    process.exit(0);
});
