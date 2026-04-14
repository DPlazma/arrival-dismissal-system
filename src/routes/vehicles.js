const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const { getVehicles, setVehicles, saveVehiclesData, getStudents, saveStudentsData } = require('../data');
const { logActivity } = require('../activity-log');

// Helper: update taxi status based on student statuses
function updateTaxiStatus(vehicle) {
    const studentStatuses = vehicle.students.map(s => s.status);
    const arrivedCount = studentStatuses.filter(s => s === 'arrived').length;
    const totalCount = studentStatuses.length;

    if (arrivedCount === 0) {
        vehicle.status = 'not-arrived';
        vehicle.arrivalTime = null;
    } else if (arrivedCount === totalCount) {
        vehicle.status = 'arrived';
        if (!vehicle.arrivalTime) vehicle.arrivalTime = new Date().toISOString();
    } else {
        vehicle.status = 'partial';
        if (!vehicle.arrivalTime) vehicle.arrivalTime = new Date().toISOString();
    }
}

function updateVehicleStatus(vehicle) {
    if (vehicle.type === 'taxi' || vehicle.type === 'parent') {
        updateTaxiStatus(vehicle);
    }
}

// Get all vehicles
router.get('/', (req, res) => {
    res.json(getVehicles());
});

// Get only buses
router.get('/buses', (req, res) => {
    res.json(getVehicles().filter(v => v.type === 'bus'));
});

// Get only taxis and parent drop-offs
router.get('/taxis', (req, res) => {
    res.json(getVehicles().filter(v => v.type === 'taxi' || v.type === 'parent'));
});

// Get arrived vehicles
router.get('/arrived', (req, res) => {
    res.json(getVehicles().filter(v => v.status === 'arrived'));
});

// Toggle vehicle status
router.post('/:id/toggle', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const vehicles = getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);

    if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (vehicle.type === 'bus' || vehicle.type === 'adhoc') {
        if (vehicle.status === 'not-arrived') {
            vehicle.status = 'arrived';
            vehicle.arrivalTime = new Date().toISOString();
        } else if (vehicle.status === 'arrived') {
            vehicle.status = 'absent';
            vehicle.arrivalTime = null;
        } else {
            vehicle.status = 'not-arrived';
            vehicle.arrivalTime = null;
        }

        vehicle.lastModified = new Date().toISOString();
        const displayName = vehicle.type === 'adhoc' ? vehicle.description : `Bus ${vehicle.number}`;
        console.log(`${vehicle.type} ${vehicle.type === 'adhoc' ? vehicle.description : vehicle.number} status changed to: ${vehicle.status}`);

        await saveVehiclesData();
        logActivity(`vehicle_${vehicle.status === 'arrived' ? 'arrived' : vehicle.status === 'absent' ? 'absent' : 'reset'}`, `${displayName} marked as ${vehicle.status.replace('-', ' ')}`, { vehicleType: vehicle.type, vehicleName: vehicle.number });
        res.json({ message: `${displayName} marked as ${vehicle.status.replace('-', ' ')}`, vehicle });
    } else {
        updateTaxiStatus(vehicle);
        vehicle.lastModified = new Date().toISOString();
        await saveVehiclesData();
        logActivity(`vehicle_${vehicle.status}`, `${vehicle.type} ${vehicle.number} status: ${vehicle.status}`, { vehicleType: vehicle.type, vehicleName: vehicle.number });
        res.json({ message: `${vehicle.type} ${vehicle.number} status updated`, vehicle });
    }
});

// Toggle individual student within a taxi/parent vehicle
router.post('/:id/students/:studentIndex/toggle', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    const vehicle = getVehicles().find(v => v.id === vehicleId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.type === 'bus') return res.status(400).json({ error: 'Cannot toggle individual students for buses' });
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) return res.status(404).json({ error: 'Student not found' });

    const student = vehicle.students[studentIndex];
    if (student.status === 'not-arrived') student.status = 'arrived';
    else if (student.status === 'arrived') student.status = 'absent';
    else student.status = 'not-arrived';

    updateTaxiStatus(vehicle);
    vehicle.lastModified = new Date().toISOString();
    await saveVehiclesData();

    console.log(`${student.name} in ${vehicle.type} ${vehicle.number} status changed to: ${student.status}`);
    logActivity(`student_${student.status === 'arrived' ? 'arrived' : student.status === 'absent' ? 'absent' : 'reset'}`, `${student.name} (${vehicle.type} ${vehicle.number}) marked as ${student.status.replace('-', ' ')}`, { vehicleType: vehicle.type, vehicleName: vehicle.number, studentName: student.name });
    res.json({ message: `${student.name} marked as ${student.status.replace('-', ' ')}`, vehicle });
});

// Set individual student status directly
router.post('/:id/students/:studentIndex/status', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    const { status } = req.body;
    const validStatuses = ['arrived', 'absent', 'not-arrived'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be: arrived, absent, or not-arrived' });
    }

    const vehicle = getVehicles().find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.type === 'bus') return res.status(400).json({ error: 'Cannot set individual student status for buses' });
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) return res.status(404).json({ error: 'Student not found' });

    const student = vehicle.students[studentIndex];
    student.status = status;

    updateTaxiStatus(vehicle);
    vehicle.lastModified = new Date().toISOString();
    await saveVehiclesData();

    logActivity(`student_${status === 'arrived' ? 'arrived' : status === 'absent' ? 'absent' : 'reset'}`,
        `${student.name} (${vehicle.type} ${vehicle.number}) marked as ${status.replace('-', ' ')}`,
        { vehicleType: vehicle.type, vehicleName: vehicle.number, studentName: student.name });
    res.json({ message: `${student.name} marked as ${status.replace('-', ' ')}`, vehicle });
});

// Set vehicle status directly (arrived, absent, not-arrived)
router.post('/:id/status', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['arrived', 'absent', 'not-arrived'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be: arrived, absent, or not-arrived' });
    }

    const vehicles = getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    vehicle.status = status;
    if (status === 'arrived') {
        vehicle.arrivalTime = vehicle.arrivalTime || new Date().toISOString();
    } else {
        vehicle.arrivalTime = null;
    }

    // For taxis, also set all students to match
    if (vehicle.type !== 'bus' && vehicle.type !== 'adhoc') {
        vehicle.students.forEach(s => { s.status = status; });
    }

    vehicle.lastModified = new Date().toISOString();
    await saveVehiclesData();

    const displayName = vehicle.type === 'bus' ? `Bus ${vehicle.number}` :
                        vehicle.type === 'adhoc' ? vehicle.description :
                        vehicle.description || `${vehicle.type} ${vehicle.number}`;
    logActivity(`vehicle_${status === 'arrived' ? 'arrived' : status === 'absent' ? 'absent' : 'reset'}`,
        `${displayName} marked as ${status.replace('-', ' ')}`, { vehicleType: vehicle.type, vehicleName: vehicle.number });
    res.json({ message: `${displayName} marked as ${status.replace('-', ' ')}`, vehicle });
});

// Set vehicle note (e.g., "2nd call")
router.post('/:id/note', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const { note } = req.body;
    const vehicles = getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (note && typeof note === 'string' && note.length > 60) {
        return res.status(400).json({ error: 'Note must be 60 characters or less' });
    }

    vehicle.note = (note && typeof note === 'string') ? note.trim() : '';
    vehicle.lastModified = new Date().toISOString();
    await saveVehiclesData();

    const displayName = vehicle.type === 'bus' ? `Bus ${vehicle.number}` :
                        vehicle.type === 'adhoc' ? vehicle.description :
                        `${vehicle.type} ${vehicle.number}`;
    if (vehicle.note) {
        logActivity('vehicle_note', `${displayName}: "${vehicle.note}"`, { vehicleType: vehicle.type, vehicleName: vehicle.number });
    }
    res.json({ message: vehicle.note ? `Note set on ${displayName}` : `Note cleared on ${displayName}`, vehicle });
});

// Batch set status (arrived or absent)
router.post('/batch-status', requireAuth, async (req, res) => {
    const { vehicleIds = [], studentSelections = {}, status } = req.body;
    const validStatuses = ['arrived', 'absent', 'not-arrived'];
    const hasVehicles = Array.isArray(vehicleIds) && vehicleIds.length > 0;
    const hasStudents = Object.keys(studentSelections).length > 0;

    if (!hasVehicles && !hasStudents) {
        return res.status(400).json({ error: 'No vehicles or students specified' });
    }
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const vehicles = getVehicles();
    let updated = 0;
    let studentsUpdated = 0;

    // Handle whole-vehicle status changes
    for (const vehicleId of vehicleIds) {
        const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
        if (!vehicle) continue;

        vehicle.status = status;
        if (status === 'arrived') {
            vehicle.arrivalTime = vehicle.arrivalTime || new Date().toISOString();
        } else {
            vehicle.arrivalTime = null;
        }

        if (vehicle.type !== 'bus' && vehicle.type !== 'adhoc') {
            vehicle.students.forEach(s => { s.status = status; });
        }

        vehicle.lastModified = new Date().toISOString();
        updated++;

        const displayName = vehicle.type === 'bus' ? `Bus ${vehicle.number}` :
                            vehicle.type === 'adhoc' ? vehicle.description :
                            vehicle.description || `${vehicle.type} ${vehicle.number}`;
        logActivity(`vehicle_${status === 'arrived' ? 'arrived' : status === 'absent' ? 'absent' : 'reset'}`,
            `${displayName} marked as ${status.replace('-', ' ')}`, { vehicleType: vehicle.type, vehicleName: vehicle.number });
    }

    // Handle per-student status changes (partial selections)
    for (const [vehicleId, indices] of Object.entries(studentSelections)) {
        const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
        if (!vehicle || !Array.isArray(indices)) continue;

        for (const idx of indices) {
            if (idx >= 0 && idx < vehicle.students.length) {
                vehicle.students[idx].status = status;
                studentsUpdated++;

                logActivity(`student_${status === 'arrived' ? 'arrived' : status === 'absent' ? 'absent' : 'reset'}`,
                    `${vehicle.students[idx].name} (${vehicle.type} ${vehicle.number}) marked as ${status.replace('-', ' ')}`,
                    { vehicleType: vehicle.type, vehicleName: vehicle.number, studentName: vehicle.students[idx].name });
            }
        }

        // Recalculate vehicle status from student statuses
        updateTaxiStatus(vehicle);
        vehicle.lastModified = new Date().toISOString();
    }

    await saveVehiclesData();
    const parts = [];
    if (updated > 0) parts.push(`${updated} vehicle${updated !== 1 ? 's' : ''}`);
    if (studentsUpdated > 0) parts.push(`${studentsUpdated} student${studentsUpdated !== 1 ? 's' : ''}`);
    res.json({ message: `${parts.join(' and ')} marked as ${status.replace('-', ' ')}`, updated, studentsUpdated });
});

// Batch toggle
router.post('/batch-toggle', requireAuth, async (req, res) => {
    const { vehicleIds } = req.body;
    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
        return res.status(400).json({ error: 'vehicleIds must be a non-empty array' });
    }

    const vehicles = getVehicles();
    const updatedVehicles = [];
    const errors = [];

    for (const vehicleId of vehicleIds) {
        const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
        if (!vehicle) { errors.push(`Vehicle ${vehicleId} not found`); continue; }

        if (vehicle.type === 'bus' || vehicle.type === 'adhoc') {
            if (vehicle.status === 'not-arrived') { vehicle.status = 'arrived'; vehicle.arrivalTime = new Date().toISOString(); }
            else if (vehicle.status === 'arrived') { vehicle.status = 'absent'; vehicle.arrivalTime = null; }
            else { vehicle.status = 'not-arrived'; vehicle.arrivalTime = null; }
        } else {
            updateTaxiStatus(vehicle);
        }

        vehicle.lastModified = new Date().toISOString();
        updatedVehicles.push(vehicle);
    }

    await saveVehiclesData();

    if (errors.length > 0) {
        res.status(207).json({ message: `Updated ${updatedVehicles.length} vehicles, ${errors.length} errors`, updated: updatedVehicles.length, errors });
    } else {
        res.json({ message: `Successfully updated ${updatedVehicles.length} vehicle${updatedVehicles.length !== 1 ? 's' : ''}`, updated: updatedVehicles.length });
    }
});

// Add ad-hoc transport
router.post('/adhoc', requireAuth, async (req, res) => {
    const { description } = req.body;
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ error: 'Description is required' });
    }
    if (description.length > 50) {
        return res.status(400).json({ error: 'Description must be 50 characters or less' });
    }

    const students = getStudents();
    const newStudent = {
        id: Math.max(...students.map(s => s.id), 0) + 1,
        name: description.trim(),
        transport: 'Ad-hoc',
        pathway: 'Special Transport',
        arrived: true,
        arrivalTime: new Date().toISOString()
    };

    students.push(newStudent);
    await saveStudentsData();

    console.log(`Ad-hoc transport added: ${description}`);
    res.json({ message: `Ad-hoc transport "${description}" added`, student: newStudent });
});

// Add new vehicle
router.post('/', requireAuth, async (req, res) => {
    const { type, number, students } = req.body;
    if (!type || !number) return res.status(400).json({ error: 'Type and number are required' });
    if (!['bus', 'taxi', 'parent'].includes(type)) return res.status(400).json({ error: 'Type must be bus, taxi, or parent' });

    const vehicles = getVehicles();
    if (vehicles.find(v => v.type === type && v.number === number)) {
        return res.status(400).json({ error: `A ${type} with number ${number} already exists` });
    }

    const newId = Math.max(...vehicles.map(v => v.id), 0) + 1;
    const newVehicle = {
        id: newId, type, number: number.toString(),
        status: 'not-arrived', arrivalTime: null,
        lastModified: new Date().toISOString(),
        students: students || []
    };

    if (type !== 'bus') {
        newVehicle.students = newVehicle.students.map(s => ({ ...s, status: 'not-arrived' }));
    }

    vehicles.push(newVehicle);
    console.log(`New vehicle added: ${type} ${number} with ${newVehicle.students.length} students`);
    await saveVehiclesData();
    logActivity('vehicle_added', `New ${type} ${number} added with ${newVehicle.students.length} students`, { vehicleType: type, vehicleName: number });

    res.status(201).json({ success: true, vehicle: newVehicle, message: `${type} ${number} has been added successfully` });
});

// Update vehicle
router.put('/:id', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const { type, number } = req.body;
    const vehicles = getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (!type || !number) return res.status(400).json({ error: 'Type and number are required' });
    if (!['bus', 'taxi', 'parent'].includes(type)) return res.status(400).json({ error: 'Type must be bus, taxi, or parent' });
    if (vehicles.find(v => v.id !== vehicleId && v.type === type && v.number === number)) {
        return res.status(400).json({ error: `A ${type} with number ${number} already exists` });
    }

    const oldType = vehicle.type;
    const oldNumber = vehicle.number;
    vehicle.type = type;
    vehicle.number = number.toString();
    vehicle.lastModified = new Date().toISOString();

    console.log(`Vehicle updated: ${oldType} ${oldNumber} -> ${type} ${number}`);
    await saveVehiclesData();
    logActivity('vehicle_edited', `${oldType} ${oldNumber} updated to ${type} ${number}`, { vehicleType: type, vehicleName: number });
    res.json({ success: true, vehicle, message: `Vehicle updated to ${type} ${number} successfully` });
});

// Delete student from vehicle
router.delete('/:id/students/:studentIndex', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    const vehicle = getVehicles().find(v => v.id === vehicleId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) return res.status(404).json({ error: 'Student not found' });

    const deletedStudent = vehicle.students[studentIndex];
    vehicle.students.splice(studentIndex, 1);
    updateVehicleStatus(vehicle);
    await saveVehiclesData();

    console.log(`Student removed: ${deletedStudent.name} from ${vehicle.type} ${vehicle.number}`);
    res.json({ success: true, message: `${deletedStudent.name} has been removed from ${vehicle.type} ${vehicle.number}` });
});

// Update student in vehicle
router.put('/:id/students/:studentIndex', requireAuth, async (req, res) => {
    const vehicleId = parseInt(req.params.id);
    const studentIndex = parseInt(req.params.studentIndex);
    const { name, pathway } = req.body;
    const vehicle = getVehicles().find(v => v.id === vehicleId);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (studentIndex < 0 || studentIndex >= vehicle.students.length) return res.status(404).json({ error: 'Student not found' });
    if (!name || !pathway) return res.status(400).json({ error: 'Name and pathway are required' });

    const oldName = vehicle.students[studentIndex].name;
    const oldPathway = vehicle.students[studentIndex].pathway;
    vehicle.students[studentIndex].name = name.trim();
    vehicle.students[studentIndex].pathway = pathway;
    await saveVehiclesData();

    console.log(`Student updated: ${oldName} (${oldPathway}) -> ${name} (${pathway})`);
    res.json({ success: true, student: vehicle.students[studentIndex], message: `Student updated to ${name} (${pathway}) successfully` });
});

// Delete vehicle
router.delete('/:id', requireAuth, async (req, res) => {
    const vehicles = getVehicles();
    const vehicleId = parseInt(req.params.id);
    const vehicleIndex = vehicles.findIndex(v => v.id === vehicleId);

    if (vehicleIndex === -1) return res.status(404).json({ error: 'Vehicle not found' });

    const deletedVehicle = vehicles[vehicleIndex];
    vehicles.splice(vehicleIndex, 1);
    console.log(`Vehicle deleted: ${deletedVehicle.type} ${deletedVehicle.number}`);
    await saveVehiclesData();
    logActivity('vehicle_deleted', `${deletedVehicle.type} ${deletedVehicle.number} removed`, { vehicleType: deletedVehicle.type, vehicleName: deletedVehicle.number });

    res.json({ success: true, message: `${deletedVehicle.type} ${deletedVehicle.number} has been removed successfully` });
});

// CSV template
router.get('/csv-template', (req, res) => {
    const csvContent = "VehicleType,VehicleNumber,StudentName,Pathway\nbus,50,John Smith,Explorers\nbus,50,Jane Doe,Futures\ntaxi,1,Bob Johnson,Preparations";
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vehicle_import_template.csv"');
    res.send(csvContent);
});

// Expose updateTaxiStatus for scheduler
router.updateTaxiStatus = updateTaxiStatus;

module.exports = router;
