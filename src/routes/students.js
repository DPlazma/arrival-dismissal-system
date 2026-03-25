const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const { getStudents, saveStudentsData } = require('../data');

// Add student
router.post('/', requireAuth, async (req, res) => {
    const name = req.body.name;
    const transport = req.body.transport;
    const studentClass = req.body.class;

    if (!name || !transport || !studentClass) {
        return res.status(400).json({ error: 'Name, transport, and class are required' });
    }

    const students = getStudents();
    const newStudent = {
        id: Math.max(...students.map(s => s.id), 0) + 1,
        name: name.trim(),
        transport: transport.trim(),
        pathway: studentClass.trim(),
        arrived: false,
        arrivalTime: null
    };

    students.push(newStudent);
    await saveStudentsData();

    console.log(`New student added: ${newStudent.name}`);
    res.status(201).json({ message: 'Student added successfully', student: newStudent });
});

// Update student
router.put('/:id', requireAuth, async (req, res) => {
    const studentId = parseInt(req.params.id);
    const students = getStudents();
    const student = students.find(s => s.id === studentId);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const name = req.body.name;
    const transport = req.body.transport;
    const studentClass = req.body.class;

    if (name) student.name = name.trim();
    if (transport) student.transport = transport.trim();
    if (studentClass) student.pathway = studentClass.trim();

    await saveStudentsData();
    res.json({ message: 'Student updated successfully', student });
});

// Get arrived students
router.get('/arrived', (req, res) => {
    res.json(getStudents().filter(s => s.arrived));
});

// Get all students
router.get('/', (req, res) => {
    res.json(getStudents());
});

module.exports = router;
