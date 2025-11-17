// src/index.js

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Session middleware for PIN verification
app.use(session({
    secret: 'arrival-dismissal-admin-session',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// CORS middleware for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Data persistence
const DATA_FILE = path.join(__dirname, '..', 'data', 'vehicles-data.json');

// Save vehicles data to file
async function saveVehiclesData() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(DATA_FILE);
        await fs.mkdir(dataDir, { recursive: true });

        await fs.writeFile(DATA_FILE, JSON.stringify(vehicles, null, 2));
        console.log('Vehicles data saved successfully');
    } catch (error) {
        console.error('Error saving vehicles data:', error);
    }
}

// Load vehicles data from file
async function loadVehiclesData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        vehicles = JSON.parse(data);
        console.log('Vehicles data loaded successfully');
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No saved data file found, using default data');
            return false;
        } else {
            console.error('Error loading vehicles data:', error);
            return false;
        }
    }
}

// Sample vehicle data with bus/taxi structure
let vehicles = [
    // Buses (bulk status only)
    { 
        id: 1, 
        type: "bus", 
        number: "50", 
        status: "not-arrived", 
        arrivalTime: null,
        students: [
            { name: "Charlotte Lee", pathway: "Explorers" },
            { name: "Lucas Brown", pathway: "Horizons" }
        ]
    },
    { 
        id: 2, 
        type: "bus", 
        number: "51", 
        status: "not-arrived", 
        arrivalTime: null,
        students: [
            { name: "Ethan Martinez", pathway: "Horizons" },
            { name: "Amelia Rodriguez", pathway: "Futures" }
        ]
    },
    { 
        id: 3, 
        type: "bus", 
        number: "52", 
        status: "not-arrived", 
        arrivalTime: null,
        students: [
            { name: "Noah Wilson", pathway: "Explorers" },
            { name: "William Anderson", pathway: "Horizons" }
        ]
    },
    { 
        id: 4, 
        type: "bus", 
        number: "54", 
        status: "not-arrived", 
        arrivalTime: null,
        students: []
    },
    { 
        id: 5, 
        type: "bus", 
        number: "55", 
        status: "not-arrived", 
        arrivalTime: null,
        students: []
    },
    { 
        id: 6, 
        type: "bus", 
        number: "56", 
        status: "not-arrived", 
        arrivalTime: null,
        students: []
    },
    { 
        id: 7, 
        type: "bus", 
        number: "57", 
        status: "not-arrived", 
        arrivalTime: null,
        students: []
    },
    { 
        id: 8, 
        type: "bus", 
        number: "58", 
        status: "not-arrived", 
        arrivalTime: null,
        students: []
    },
    { 
        id: 9, 
        type: "bus", 
        number: "59", 
        status: "not-arrived", 
        arrivalTime: null,
        students: []
    },
    // Taxis (individual student status)
    { 
        id: 10, 
        type: "taxi", 
        number: "1", 
        status: "partial", 
        arrivalTime: null,
        students: [
            { name: "Emma Thompson", pathway: "Futures", status: "not-arrived" },
            { name: "Harper Taylor", pathway: "Preparations", status: "not-arrived" }
        ]
    },
    { 
        id: 11, 
        type: "taxi", 
        number: "2", 
        status: "not-arrived", 
        arrivalTime: null,
        students: [
            { name: "Sophia Davis", pathway: "Futures", status: "not-arrived" }
        ]
    },
    { 
        id: 12, 
        type: "taxi", 
        number: "3", 
        status: "not-arrived", 
        arrivalTime: null,
        students: [
            { name: "Isabella Miller", pathway: "Preparations", status: "not-arrived" }
        ]
    },
    // Parent Drop (treated like taxi)
    { 
        id: 13, 
        type: "parent", 
        number: "Drop-off", 
        status: "partial", 
        arrivalTime: null,
        students: [
            { name: "Olivia Johnson", pathway: "Preparations", status: "not-arrived" },
            { name: "Mason Garcia", pathway: "Explorers", status: "not-arrived" }
        ]
    }
];

// Admin settings data persistence
const ADMIN_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'admin-settings.json');

// Default admin settings
let adminSettings = {
    pin: '',
    schoolName: '',
    logoUrl: '',
    theme: 'blue',
    darkMode: false,
    pathwayLabel: 'Pathway'
};

// Save admin settings to file
async function saveAdminSettings() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(ADMIN_SETTINGS_FILE);
        await fs.mkdir(dataDir, { recursive: true });

        await fs.writeFile(ADMIN_SETTINGS_FILE, JSON.stringify(adminSettings, null, 2));
        console.log('Admin settings saved successfully');
    } catch (error) {
        console.error('Error saving admin settings:', error);
    }
}

// Load admin settings from file
async function loadAdminSettings() {
    try {
        const data = await fs.readFile(ADMIN_SETTINGS_FILE, 'utf8');
        adminSettings = { ...adminSettings, ...JSON.parse(data) };
        console.log('Admin settings loaded successfully');
        return adminSettings;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No admin settings file found, using defaults');
            return adminSettings;
        } else {
            console.error('Error loading admin settings:', error);
            return adminSettings;
        }
    }
}

// Route to serve the display page (main interface for staff)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/display-new.html'));
});

// Route to serve the admin page (requires PIN verification)
app.get('/admin', (req, res) => {
    if (req.session.adminAuthenticated) {
        res.sendFile(path.join(__dirname, '../public/admin-new.html'));
    } else {
        res.sendFile(path.join(__dirname, '../public/admin-pin.html'));
    }
});

// Route to serve the display page for staff
app.get('/display', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/display-new.html'));
});

// Route to serve the old display page
app.get('/display-old', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/display.html'));
});

// Migration: Add lastModified field to existing vehicles
vehicles.forEach(vehicle => {
    if (!vehicle.lastModified) {
        // Give each vehicle a random timestamp within the last hour to create variety
        const baseTime = new Date();
        const randomOffset = Math.floor(Math.random() * 60); // Random minutes within last hour
        baseTime.setMinutes(baseTime.getMinutes() - randomOffset);
        vehicle.lastModified = baseTime.toISOString();
    }
});

// API Routes

// Get all vehicles
app.get('/api/vehicles', (req, res) => {
    res.json(vehicles);
});

// Get only buses
app.get('/api/vehicles/buses', (req, res) => {
    const buses = vehicles.filter(vehicle => vehicle.type === 'bus');
    res.json(buses);
});

// Get only taxis and parent drop-offs
app.get('/api/vehicles/taxis', (req, res) => {
    const taxis = vehicles.filter(vehicle => vehicle.type === 'taxi' || vehicle.type === 'parent');
    res.json(taxis);
});

// Get arrived vehicles (for display screens)
app.get('/api/vehicles/arrived', (req, res) => {
    const arrivedVehicles = vehicles.filter(vehicle => vehicle.status === 'arrived');
    res.json(arrivedVehicles);
});

// Toggle vehicle status (for buses: not-arrived -> arrived -> absent -> not-arrived)
app.post('/api/vehicles/:id/toggle', async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    if (vehicle.type === 'bus') {
        // Cycle through states for buses: not-arrived -> arrived -> absent -> not-arrived
        if (vehicle.status === 'not-arrived') {
            vehicle.status = 'arrived';
            vehicle.arrivalTime = new Date().toISOString();
        } else if (vehicle.status === 'arrived') {
            vehicle.status = 'absent';
            vehicle.arrivalTime = null;
        } else { // absent
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
        }
        
        vehicle.lastModified = new Date().toISOString();
        
        console.log(`Bus ${vehicle.number} status changed to: ${vehicle.status} at ${new Date().toLocaleString()}`);
        
        // Save data after toggling bus
        await saveVehiclesData();
        
        res.json({ 
            message: `Bus ${vehicle.number} marked as ${vehicle.status.replace('-', ' ')}`,
            vehicle: vehicle
        });
    } else {
        // For taxis/parent drop, calculate status based on students
        updateTaxiStatus(vehicle);
        vehicle.lastModified = new Date().toISOString();
        
        // Save data after toggling taxi
        await saveVehiclesData();
        
        res.json({ 
            message: `${vehicle.type} ${vehicle.number} status updated`,
            vehicle: vehicle
        });
    }
});

// Toggle individual student status within a taxi/parent drop vehicle
app.post('/api/vehicles/:id/students/:studentIndex/toggle', async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    if (vehicle.type === 'bus') {
        return res.status(400).json({ error: 'Cannot toggle individual students for buses' });
    }
    
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = vehicle.students[studentIndex];
    
    // Cycle through states: not-arrived -> arrived -> absent -> not-arrived
    if (student.status === 'not-arrived') {
        student.status = 'arrived';
    } else if (student.status === 'arrived') {
        student.status = 'absent';
    } else { // absent
        student.status = 'not-arrived';
    }
    
    // Update vehicle status based on students
    updateTaxiStatus(vehicle);
    vehicle.lastModified = new Date().toISOString();
    
    // Save data after toggling student
    await saveVehiclesData();
    
    console.log(`${student.name} in ${vehicle.type} ${vehicle.number} status changed to: ${student.status} at ${new Date().toLocaleString()}`);
    
    res.json({ 
        message: `${student.name} marked as ${student.status.replace('-', ' ')}`,
        vehicle: vehicle
    });
});

// Helper function to update vehicle status based on type and students
function updateVehicleStatus(vehicle) {
    if (vehicle.type === 'bus') {
        // Buses don't have individual student status, status is set manually
        return;
    } else if (vehicle.type === 'taxi' || vehicle.type === 'parent') {
        // For taxis and parent drop-offs, update based on student statuses
        updateTaxiStatus(vehicle);
    }
}

// Helper function to update taxi status based on student statuses
function updateTaxiStatus(vehicle) {
    const studentStatuses = vehicle.students.map(s => s.status);
    const arrivedCount = studentStatuses.filter(s => s === 'arrived').length;
    const totalCount = studentStatuses.length;
    
    if (arrivedCount === 0) {
        vehicle.status = 'not-arrived';
        vehicle.arrivalTime = null;
    } else if (arrivedCount === totalCount) {
        vehicle.status = 'arrived';
        if (!vehicle.arrivalTime) {
            vehicle.arrivalTime = new Date().toISOString();
        }
    } else {
        vehicle.status = 'partial';
        if (!vehicle.arrivalTime) {
            vehicle.arrivalTime = new Date().toISOString();
        }
    }
}

// Add new vehicle
app.post('/api/vehicles', async (req, res) => {
    const { type, number, students } = req.body;
    
    if (!type || !number) {
        return res.status(400).json({ error: 'Type and number are required' });
    }
    
    if (!['bus', 'taxi', 'parent'].includes(type)) {
        return res.status(400).json({ error: 'Type must be bus, taxi, or parent' });
    }
    
    // Check if vehicle with same type and number already exists
    const existingVehicle = vehicles.find(v => v.type === type && v.number === number);
    if (existingVehicle) {
        return res.status(400).json({ error: `A ${type} with number ${number} already exists` });
    }
    
    // Generate new ID
    const newId = Math.max(...vehicles.map(v => v.id), 0) + 1;
    
    const newVehicle = {
        id: newId,
        type: type,
        number: number.toString(),
        status: 'not-arrived',
        arrivalTime: null,
        lastModified: new Date().toISOString(),
        students: students || []
    };
    
    // For taxis/parent drops, add status to each student
    if (type !== 'bus') {
        newVehicle.students = newVehicle.students.map(student => ({
            ...student,
            status: 'not-arrived'
        }));
    }
    
    vehicles.push(newVehicle);
    
    console.log(`New vehicle added: ${type} ${number} with ${newVehicle.students.length} students`);
    
    // Save data after adding vehicle
    await saveVehiclesData();
    
    res.status(201).json({
        success: true,
        vehicle: newVehicle,
        message: `${type} ${number} has been added successfully`
    });
});

// Update vehicle
app.put('/api/vehicles/:id', async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const { type, number } = req.body;
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    if (!type || !number) {
        return res.status(400).json({ error: 'Type and number are required' });
    }
    
    if (!['bus', 'taxi', 'parent'].includes(type)) {
        return res.status(400).json({ error: 'Type must be bus, taxi, or parent' });
    }
    
    // Check if another vehicle with same type and number already exists
    const existingVehicle = vehicles.find(v => v.id !== vehicleId && v.type === type && v.number === number);
    if (existingVehicle) {
        return res.status(400).json({ error: `A ${type} with number ${number} already exists` });
    }
    
    const oldType = vehicle.type;
    const oldNumber = vehicle.number;
    
    vehicle.type = type;
    vehicle.number = number.toString();
    vehicle.lastModified = new Date().toISOString();
    
    console.log(`Vehicle updated: ${oldType} ${oldNumber} -> ${type} ${number}`);
    
    // Save data after updating vehicle
    await saveVehiclesData();
    
    res.json({
        success: true,
        vehicle: vehicle,
        message: `Vehicle updated to ${type} ${number} successfully`
    });
});

// Delete student from vehicle
app.delete('/api/vehicles/:id/students/:studentIndex', (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    const deletedStudent = vehicle.students[studentIndex];
    vehicle.students.splice(studentIndex, 1);
    
    // Update vehicle status based on remaining students
    updateVehicleStatus(vehicle);
    
    console.log(`Student removed: ${deletedStudent.name} from ${vehicle.type} ${vehicle.number}`);
    
    res.json({
        success: true,
        message: `${deletedStudent.name} has been removed from ${vehicle.type} ${vehicle.number}`
    });
});

// Update student in vehicle
app.put('/api/vehicles/:id/students/:studentIndex', (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    const { name, pathway } = req.body;
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    if (!name || !pathway) {
        return res.status(400).json({ error: 'Name and pathway are required' });
    }
    
    const oldName = vehicle.students[studentIndex].name;
    const oldPathway = vehicle.students[studentIndex].pathway;
    
    vehicle.students[studentIndex].name = name.trim();
    vehicle.students[studentIndex].pathway = pathway;
    
    console.log(`Student updated: ${oldName} (${oldPathway}) -> ${name} (${pathway})`);
    
    res.json({
        success: true,
        student: vehicle.students[studentIndex],
        message: `Student updated to ${name} (${pathway}) successfully`
    });
});

// Delete vehicle
app.delete('/api/vehicles/:id', async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const vehicleIndex = vehicles.findIndex(v => v.id === vehicleId);
    
    if (vehicleIndex === -1) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    const deletedVehicle = vehicles[vehicleIndex];
    vehicles.splice(vehicleIndex, 1);
    
    console.log(`Vehicle deleted: ${deletedVehicle.type} ${deletedVehicle.number}`);
    
    // Save data after deleting vehicle
    await saveVehiclesData();
    
    res.json({
        success: true,
        message: `${deletedVehicle.type} ${deletedVehicle.number} has been removed successfully`
    });
});

// CSV template download endpoint for vehicles
app.get('/api/csv-template', (req, res) => {
    const csvContent = "VehicleType,VehicleNumber,StudentName,Pathway\nbus,50,John Smith,Explorers\nbus,50,Jane Doe,Futures\ntaxi,1,Bob Johnson,Preparations";
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vehicle_import_template.csv"');
    res.send(csvContent);
});
app.post('/api/students', (req, res) => {
    const { name, transport, class: studentClass } = req.body;
    
    if (!name || !transport || !studentClass) {
        return res.status(400).json({ error: 'Name, transport, and class are required' });
    }
    
    const newStudent = {
        id: Math.max(...students.map(s => s.id)) + 1,
        name: name.trim(),
        transport: transport.trim(),
        class: studentClass.trim(),
        arrived: false,
        arrivalTime: null
    };
    
    students.push(newStudent);
    
    console.log(`New student added: ${newStudent.name}`);
    res.status(201).json({ message: 'Student added successfully', student: newStudent });
});

// Update student information
app.put('/api/students/:id', (req, res) => {
    const studentId = parseInt(req.params.id);
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    const { name, transport, class: studentClass } = req.body;
    
    if (name) student.name = name.trim();
    if (transport) student.transport = transport.trim();
    if (studentClass) student.class = studentClass.trim();
    
    res.json({ message: 'Student updated successfully', student: student });
});

// Reset all vehicle arrivals (for new day)
app.post('/api/reset', (req, res) => {
    let resetCount = 0;
    vehicles.forEach(vehicle => {
        if (vehicle.status !== 'not-arrived') {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
            resetCount++;
        }
        
        // For taxis/parent drops, also reset individual students
        if (vehicle.type !== 'bus') {
            vehicle.students.forEach(student => {
                if (student.status !== 'not-arrived') {
                    student.status = 'not-arrived';
                }
            });
        }
    });
    
    console.log(`All vehicle arrivals reset for new day: ${resetCount} vehicles reset`);
    res.json({ message: 'All arrivals reset successfully' });
});

// Get summary statistics
app.get('/api/stats', (req, res) => {
    const totalVehicles = vehicles.length;
    const arrivedVehicles = vehicles.filter(v => v.status === 'arrived').length;
    const partialVehicles = vehicles.filter(v => v.status === 'partial').length;
    const notArrivedVehicles = vehicles.filter(v => v.status === 'not-arrived').length;
    const absentVehicles = vehicles.filter(v => v.status === 'absent').length;
    
    // Count total students
    let totalStudents = 0;
    let arrivedStudents = 0;
    let absentStudents = 0;
    
    vehicles.forEach(vehicle => {
        if (vehicle.type === 'bus') {
            totalStudents += vehicle.students.length;
            if (vehicle.status === 'arrived') {
                arrivedStudents += vehicle.students.length;
            } else if (vehicle.status === 'absent') {
                absentStudents += vehicle.students.length;
            }
        } else {
            // For taxis/parent drops, count individual student statuses
            vehicle.students.forEach(student => {
                totalStudents++;
                if (student.status === 'arrived') {
                    arrivedStudents++;
                } else if (student.status === 'absent') {
                    absentStudents++;
                }
            });
        }
    });
    
    res.json({
        vehicles: {
            total: totalVehicles,
            arrived: arrivedVehicles,
            partial: partialVehicles,
            notArrived: notArrivedVehicles,
            absent: absentVehicles
        },
        students: {
            total: totalStudents,
            arrived: arrivedStudents,
            absent: absentStudents,
            notArrived: totalStudents - arrivedStudents - absentStudents
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const totalVehicles = vehicles.length;
    const arrivedVehicles = vehicles.filter(v => v.status === 'arrived').length;
    
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        totalVehicles: totalVehicles,
        arrivedVehicles: arrivedVehicles
    });
});

// Automated reset functions
function resetForAfternoonDismissal() {
    let resetCount = 0;
    vehicles.forEach(vehicle => {
        if (vehicle.status === 'arrived') {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
            resetCount++;
        }
        // For taxis/parent drops, reset arrived students but keep absent ones
        if (vehicle.type !== 'bus') {
            vehicle.students.forEach(student => {
                if (student.status === 'arrived') {
                    student.status = 'not-arrived';
                }
                // Keep 'absent' students as 'absent'
            });
            updateTaxiStatus(vehicle);
        }
        // Keep 'absent' vehicles as 'absent'
    });
    
    console.log(`🕛 Afternoon dismissal reset: ${resetCount} vehicles reset from 'arrived' to 'not-arrived' at ${new Date().toLocaleString()}`);
    console.log(`📋 Absent vehicles/students remain marked as absent`);
}

function resetForNewDay() {
    let resetCount = 0;
    vehicles.forEach(vehicle => {
        if (vehicle.status !== 'not-arrived') {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
            resetCount++;
        }
        
        // For taxis/parent drops, reset all students
        if (vehicle.type !== 'bus') {
            vehicle.students.forEach(student => {
                student.status = 'not-arrived';
            });
        }
    });
    
    console.log(`🌅 End of day reset: ${resetCount} vehicles reset to 'not-arrived' for new day at ${new Date().toLocaleString()}`);
}

// Schedule automated resets
function scheduleAutomatedResets() {
    const now = new Date();
    
    // Schedule midday reset (12:00 PM) - only reset 'arrived' to 'not-arrived'
    const midday = new Date();
    midday.setHours(12, 0, 0, 0);
    if (midday <= now) {
        midday.setDate(midday.getDate() + 1); // Next day if already passed
    }
    
    const millisecondsUntilMidday = midday.getTime() - now.getTime();
    setTimeout(() => {
        resetForAfternoonDismissal();
        // Schedule next midday reset (24 hours later)
        setInterval(resetForAfternoonDismissal, 24 * 60 * 60 * 1000);
    }, millisecondsUntilMidday);
    
    // Schedule end of day reset (6:00 PM) - reset everything
    const endOfDay = new Date();
    endOfDay.setHours(18, 0, 0, 0);
    if (endOfDay <= now) {
        endOfDay.setDate(endOfDay.getDate() + 1); // Next day if already passed
    }
    
    const millisecondsUntilEndOfDay = endOfDay.getTime() - now.getTime();
    setTimeout(() => {
        resetForNewDay();
        // Schedule next end of day reset (24 hours later)
        setInterval(resetForNewDay, 24 * 60 * 60 * 1000);
    }, millisecondsUntilEndOfDay);
    
    console.log(`⏰ Automated resets scheduled:`);
    console.log(`   📅 Afternoon reset: ${midday.toLocaleString()} (arrived → not-arrived)`);
    console.log(`   🌙 End of day reset: ${endOfDay.toLocaleString()} (all → not-arrived)`);
}

// Manual reset endpoints for admin
app.post('/api/reset/afternoon', (req, res) => {
    resetForAfternoonDismissal();
    res.json({ 
        success: true, 
        message: 'Afternoon dismissal reset completed - arrived students reset to not-arrived'
    });
});

app.post('/api/reset/day', (req, res) => {
    resetForNewDay();
    res.json({ 
        success: true, 
        message: 'End of day reset completed - all students reset to not-arrived'
    });
});

// PIN verification endpoint
app.post('/api/verify-pin', async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin || typeof pin !== 'string') {
            return res.status(400).json({ success: false, message: 'PIN is required' });
        }

        // Load admin settings
        const settings = await loadAdminSettings();

        // Check if PIN matches
        // If no PIN is set (empty string), allow any PIN for initial access
        if (!settings.pin || settings.pin === pin) {
            req.session.adminAuthenticated = true;
            res.json({ success: true, message: 'PIN verified successfully' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid PIN' });
        }
    } catch (error) {
        console.error('Error verifying PIN:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Check admin authentication status
app.get('/api/admin-status', (req, res) => {
    res.json({ authenticated: req.session.adminAuthenticated || false });
});

// Logout admin
app.post('/api/admin-logout', (req, res) => {
    req.session.adminAuthenticated = false;
    res.json({ success: true, message: 'Logged out successfully' });
});

// Admin settings endpoints
app.get('/api/admin-settings', async (req, res) => {
    try {
        const settings = await loadAdminSettings();
        // Don't send PIN in response for security
        const { pin, ...safeSettings } = settings;
        res.json(safeSettings);
    } catch (error) {
        console.error('Error loading admin settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/admin-settings', async (req, res) => {
    try {
        const updates = req.body;

        // Load current settings
        const currentSettings = await loadAdminSettings();

        // Update settings (only allow specific fields)
        if (updates.pin !== undefined) {
            currentSettings.pin = updates.pin;
        }
        if (updates.schoolName !== undefined) {
            currentSettings.schoolName = updates.schoolName;
        }
        if (updates.logoUrl !== undefined) {
            currentSettings.logoUrl = updates.logoUrl;
        }
        if (updates.theme !== undefined) {
            currentSettings.theme = updates.theme;
        }
        if (updates.darkMode !== undefined) {
            currentSettings.darkMode = updates.darkMode;
        }
        if (updates.pathwayLabel !== undefined) {
            currentSettings.pathwayLabel = updates.pathwayLabel;
        }

        // Save updated settings
        adminSettings = currentSettings;
        await saveAdminSettings();

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating admin settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Start the server
async function startServer() {
    // Try to load saved data first
    const dataLoaded = await loadVehiclesData();
    
    // Load admin settings
    await loadAdminSettings();
    
    if (!dataLoaded) {
        // If no saved data, run migration on default data
        vehicles.forEach(vehicle => {
            if (!vehicle.lastModified) {
                // Give each vehicle a random timestamp within the last hour to create variety
                const baseTime = new Date();
                const randomOffset = Math.floor(Math.random() * 60); // Random minutes within last hour
                baseTime.setMinutes(baseTime.getMinutes() - randomOffset);
                vehicle.lastModified = baseTime.toISOString();
            }
        });
    }
    
    // Schedule automated resets after data is loaded
    scheduleAutomatedResets();
    
    app.listen(PORT, () => {
        console.log(`🚀 Vehicle Arrival System running on port ${PORT}`);
        console.log(`👨‍💼 Admin interface: http://localhost:${PORT}/admin`);
        console.log(`📺 Display interface: http://localhost:${PORT}/display`);
        console.log(`📊 API endpoints: http://localhost:${PORT}/api/vehicles`);
        console.log(`💾 Data persistence: ${dataLoaded ? 'Loaded from file' : 'Using default data'}`);
        console.log(`🚌 Buses: 9 buses (50, 51, 52, 54, 55, 56, 57, 58, 59)`);
        console.log(`🚕 Taxis: Individual student tracking supported`);
        
        // Save data every 5 minutes as a backup
        setInterval(saveVehiclesData, 5 * 60 * 1000);
    });
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, saving data before shutdown...');
    await saveVehiclesData();
    console.log('✅ Data saved, shutting down gracefully');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, saving data before shutdown...');
    await saveVehiclesData();
    console.log('✅ Data saved, shutting down gracefully');
    process.exit(0);
});