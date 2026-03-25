const fs = require('fs').promises;
const path = require('path');
const { broadcastSSE } = require('./sse');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADMIN_SETTINGS_FILE = path.join(DATA_DIR, 'admin-settings.json');
const VEHICLES_DATA_FILE = path.join(DATA_DIR, 'vehicles-data.json');
const STUDENTS_DATA_FILE = path.join(DATA_DIR, 'students-data.json');

// In-memory state
let adminSettings = {
    pin: '1234',
    lastModified: new Date().toISOString(),
    schoolName: '',
    theme: 'blue',
    darkMode: false,
    pathwayLabel: 'Pathway'
};

// Sample vehicle data with bus/taxi structure
let vehicles = [
    { id: 1, type: "bus", number: "50", status: "not-arrived", arrivalTime: null, students: [{ name: "Charlotte Lee", pathway: "Explorers" }, { name: "Lucas Brown", pathway: "Horizons" }] },
    { id: 2, type: "bus", number: "51", status: "not-arrived", arrivalTime: null, students: [{ name: "Ethan Martinez", pathway: "Horizons" }, { name: "Amelia Rodriguez", pathway: "Futures" }] },
    { id: 3, type: "bus", number: "52", status: "not-arrived", arrivalTime: null, students: [{ name: "Noah Wilson", pathway: "Explorers" }, { name: "William Anderson", pathway: "Horizons" }] },
    { id: 4, type: "bus", number: "54", status: "not-arrived", arrivalTime: null, students: [] },
    { id: 5, type: "bus", number: "55", status: "not-arrived", arrivalTime: null, students: [] },
    { id: 6, type: "bus", number: "56", status: "not-arrived", arrivalTime: null, students: [] },
    { id: 7, type: "bus", number: "57", status: "not-arrived", arrivalTime: null, students: [] },
    { id: 8, type: "bus", number: "58", status: "not-arrived", arrivalTime: null, students: [] },
    { id: 9, type: "bus", number: "59", status: "not-arrived", arrivalTime: null, students: [] },
    { id: 10, type: "taxi", number: "1", status: "partial", arrivalTime: null, students: [{ name: "Emma Thompson", pathway: "Futures", status: "not-arrived" }, { name: "Harper Taylor", pathway: "Preparations", status: "not-arrived" }] },
    { id: 11, type: "taxi", number: "2", status: "not-arrived", arrivalTime: null, students: [{ name: "Sophia Davis", pathway: "Futures", status: "not-arrived" }] },
    { id: 12, type: "taxi", number: "3", status: "not-arrived", arrivalTime: null, students: [{ name: "Isabella Miller", pathway: "Preparations", status: "not-arrived" }] },
    { id: 13, type: "parent", number: "Drop-off", status: "partial", arrivalTime: null, students: [{ name: "Olivia Johnson", pathway: "Preparations", status: "not-arrived" }, { name: "Mason Garcia", pathway: "Explorers", status: "not-arrived" }] }
];

let students = [];

// Atomic file write: write to .tmp then rename to prevent corruption
async function atomicWriteFile(filePath, data) {
    const tmpPath = filePath + '.tmp';
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmpPath, data);
    await fs.rename(tmpPath, filePath);
}

// Create a timestamped backup, keep last 10
async function createBackup(filePath) {
    try {
        const backupDir = path.join(path.dirname(filePath), 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = path.basename(filePath, '.json');
        const backupPath = path.join(backupDir, `${baseName}_${timestamp}.json`);
        await fs.copyFile(filePath, backupPath);
        console.log(`Backup created: ${backupPath}`);

        const files = await fs.readdir(backupDir);
        const relatedBackups = files
            .filter(f => f.startsWith(baseName + '_') && f.endsWith('.json'))
            .sort()
            .reverse();
        for (const old of relatedBackups.slice(10)) {
            await fs.unlink(path.join(backupDir, old));
        }
    } catch (error) {
        console.error('Error creating backup:', error.message);
    }
}

// Admin settings
async function loadAdminSettings() {
    try {
        const data = await fs.readFile(ADMIN_SETTINGS_FILE, 'utf8');
        adminSettings = JSON.parse(data);
        console.log('Admin settings loaded successfully');
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No admin settings file found, using defaults');
            return false;
        }
        console.error('Error loading admin settings:', error);
        return false;
    }
}

async function saveAdminSettings() {
    try {
        await atomicWriteFile(ADMIN_SETTINGS_FILE, JSON.stringify(adminSettings, null, 2));
        console.log('Admin settings saved successfully');
    } catch (error) {
        console.error('Error saving admin settings:', error);
    }
}

function getAdminSettings() { return adminSettings; }
function setAdminSettings(key, value) { adminSettings[key] = value; }

// Vehicles
async function loadVehiclesData() {
    try {
        const data = await fs.readFile(VEHICLES_DATA_FILE, 'utf8');
        vehicles = JSON.parse(data);
        console.log('Vehicles data loaded successfully');
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No saved data file found, using default data');
            return false;
        }
        console.error('Error loading vehicles data:', error);
        return false;
    }
}

async function saveVehiclesData() {
    try {
        await atomicWriteFile(VEHICLES_DATA_FILE, JSON.stringify(vehicles, null, 2));
        broadcastSSE('vehicles', vehicles);
        console.log('Vehicles data saved successfully');
    } catch (error) {
        console.error('Error saving vehicles data:', error);
    }
}

function getVehicles() { return vehicles; }
function setVehicles(newVehicles) { vehicles = newVehicles; }

// Students
async function loadStudentsData() {
    try {
        const data = await fs.readFile(STUDENTS_DATA_FILE, 'utf8');
        students = JSON.parse(data);
        console.log('Students data loaded successfully');
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No saved students data file found, using empty array');
            students = [];
            return false;
        }
        console.error('Error loading students data:', error);
        students = [];
        return false;
    }
}

async function saveStudentsData() {
    try {
        await atomicWriteFile(STUDENTS_DATA_FILE, JSON.stringify(students, null, 2));
        console.log('Students data saved successfully');
    } catch (error) {
        console.error('Error saving students data:', error);
    }
}

function getStudents() { return students; }

module.exports = {
    loadAdminSettings, saveAdminSettings, getAdminSettings, setAdminSettings,
    loadVehiclesData, saveVehiclesData, getVehicles, setVehicles,
    loadStudentsData, saveStudentsData, getStudents,
    createBackup,
    VEHICLES_DATA_FILE
};
