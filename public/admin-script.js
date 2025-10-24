// Global variables
let students = [];
let filteredStudents = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
    
    // Load initial data
    loadStudents();
    
    // Set up search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Set up filter functionality
    const transportFilter = document.getElementById('transportFilter');
    const statusFilter = document.getElementById('statusFilter');
    transportFilter.addEventListener('change', handleFilters);
    statusFilter.addEventListener('change', handleFilters);
    
    // Auto-refresh every 30 seconds
    setInterval(loadStudents, 30000);
});

// Load students from API
async function loadStudents() {
    try {
        const response = await fetch('/api/students');
        if (response.ok) {
            students = await response.json();
            filteredStudents = [...students];
            updateTransportFilter();
            displayStudents();
            updateStats();
        } else {
            console.error('Failed to load students');
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showStatus('Error loading students', 'error');
    }
}

// Update transport filter options
function updateTransportFilter() {
    const transportFilter = document.getElementById('transportFilter');
    const transports = [...new Set(students.map(s => s.transport))].sort();
    
    // Clear existing options except "All Transport"
    transportFilter.innerHTML = '<option value="">All Transport</option>';
    
    // Add transport options
    transports.forEach(transport => {
        const option = document.createElement('option');
        option.value = transport;
        option.textContent = transport;
        transportFilter.appendChild(option);
    });
}

// Handle search input
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm) ||
        student.transport.toLowerCase().includes(searchTerm) ||
        student.class.toLowerCase().includes(searchTerm)
    );
    
    handleFilters(); // Apply existing filters to search results
}

// Handle filter changes
function handleFilters() {
    const transportFilter = document.getElementById('transportFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = [...filteredStudents];
    
    // Apply transport filter
    if (transportFilter) {
        filtered = filtered.filter(student => student.transport === transportFilter);
    }
    
    // Apply status filter
    if (statusFilter === 'arrived') {
        filtered = filtered.filter(student => student.status === 'arrived');
    } else if (statusFilter === 'not-arrived') {
        filtered = filtered.filter(student => student.status === 'not-arrived');
    } else if (statusFilter === 'absent') {
        filtered = filtered.filter(student => student.status === 'absent');
    }
    
    displayStudents(filtered);
}

// Display students in the grid
function displayStudents(studentsToShow = filteredStudents) {
    const studentsGrid = document.getElementById('studentsGrid');
    
    if (studentsToShow.length === 0) {
        studentsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #718096;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <div style="font-size: 1.2rem; font-weight: 500;">No students found</div>
                <div style="font-size: 1rem; margin-top: 0.5rem;">Try adjusting your search or filters</div>
            </div>
        `;
        return;
    }
    
    // Sort students: not arrived first, then by name
    const sortedStudents = [...studentsToShow].sort((a, b) => {
        if (a.arrived === b.arrived) {
            return a.name.localeCompare(b.name);
        }
        return a.arrived ? 1 : -1; // Not arrived first
    });
    
    studentsGrid.innerHTML = sortedStudents.map(student => {
        const arrivalTime = student.arrivalTime 
            ? new Date(student.arrivalTime).toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })
            : '';
        
        return `
            <div class="student-card ${student.status === 'arrived' ? 'arrived' : student.status === 'absent' ? 'absent' : 'not-arrived'}" 
                 onclick="toggleStudentArrival(${student.id})"
                 tabindex="0"
                 onkeypress="handleKeyPress(event, ${student.id})">
                <div class="student-name">${escapeHtml(student.name)}</div>
                <div class="student-details">
                    <div class="student-transport">${escapeHtml(student.transport)}</div>
                    <div class="student-pathway">${escapeHtml(student.pathway)}</div>
                </div>
                <div class="student-status">
                    <span class="status-indicator ${student.status === 'arrived' ? 'arrived' : student.status === 'absent' ? 'absent' : 'not-arrived'}">
                        ${student.status === 'arrived' ? 'Arrived' : student.status === 'absent' ? 'Absent' : 'Not Arrived'}
                    </span>
                    ${arrivalTime ? `<span class="arrival-time">${arrivalTime}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Handle keyboard press for accessibility
function handleKeyPress(event, studentId) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleStudentArrival(studentId);
    }
}

// Toggle student arrival status
async function toggleStudentArrival(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    try {
        showLoading();
        
        const response = await fetch(`/api/students/${studentId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update the student data
            student.status = result.student.status;
            student.arrivalTime = result.student.arrivalTime;
            
            // Update displays
            filteredStudents = [...students];
            handleSearch(); // Reapply search
            updateStats();
            
            showStatus(result.message, 'success');
        } else {
            const error = await response.json();
            showStatus(error.error || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error toggling arrival:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Update statistics display
function updateStats() {
    const arrivedCount = students.filter(s => s.arrived).length;
    const totalCount = students.length;
    
    document.getElementById('arrivedCount').textContent = arrivedCount;
    document.getElementById('totalCount').textContent = totalCount;
}

// Open display view in same window
function openDisplayView() {
    window.location.href = '/display';
}

// Reset all arrivals for new day
async function resetAllArrivals() {
    if (!confirm('Are you sure you want to reset all arrivals? This will mark all students as not arrived.')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showStatus(result.message, 'success');
            await loadStudents(); // Reload data
        } else {
            const error = await response.json();
            showStatus(error.error || 'Failed to reset arrivals', 'error');
        }
    } catch (error) {
        console.error('Error resetting arrivals:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Refresh students data
async function refreshStudents() {
    showLoading();
    try {
        await loadStudents();
        showStatus('Students refreshed', 'success');
    } catch (error) {
        showStatus('Error refreshing students', 'error');
    } finally {
        hideLoading();
    }
}

// Show loading overlay
function showLoading() {
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// Show status message
function showStatus(message, type = 'success') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusElement.classList.add('hidden');
    }, 3000);
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + R for refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshStudents();
    }
    
    // Ctrl/Cmd + D for display view
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        openDisplayView();
    }
    
    // Focus search on Ctrl/Cmd + F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// Handle orientation changes on mobile devices
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
});

// Student Management Functions

// Open student management modal
function openStudentManager() {
    document.getElementById('studentModal').classList.remove('hidden');
    loadStudentsForManagement();
    setupTransportChangeHandler();
    setupManagementSearch();
}

// Close student management modal
function closeStudentModal() {
    document.getElementById('studentModal').classList.add('hidden');
    resetStudentForm();
}

// Setup transport dropdown change handler
function setupTransportChangeHandler() {
    const transportSelect = document.getElementById('studentTransport');
    const customGroup = document.getElementById('customTransportGroup');
    
    transportSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customGroup.style.display = 'block';
            document.getElementById('customTransport').required = true;
        } else {
            customGroup.style.display = 'none';
            document.getElementById('customTransport').required = false;
            document.getElementById('customTransport').value = '';
        }
    });
}

// Setup management search
function setupManagementSearch() {
    const searchInput = document.getElementById('managementSearch');
    searchInput.addEventListener('input', filterManagementList);
}

// Load students for management list
async function loadStudentsForManagement() {
    try {
        const response = await fetch('/api/students');
        if (response.ok) {
            const students = await response.json();
            displayStudentsForManagement(students);
        }
    } catch (error) {
        console.error('Error loading students for management:', error);
    }
}

// Display students in management list
function displayStudentsForManagement(students) {
    const listContainer = document.getElementById('managementStudentList');
    
    if (students.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #718096;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">👥</div>
                <div>No students found</div>
            </div>
        `;
        return;
    }
    
    // Sort students by name
    const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
    
    listContainer.innerHTML = sortedStudents.map(student => `
        <div class="management-student-item" data-student-id="${student.id}">
            <div class="student-info">
                <div class="student-info-name">${escapeHtml(student.name)}</div>
                <div class="student-info-details">
                    ${escapeHtml(student.transport)} • ${escapeHtml(student.pathway)}
                    ${student.status === 'arrived' ? ' • <span style="color: #48bb78; font-weight: 600;">Arrived</span>' : 
                      student.status === 'absent' ? ' • <span style="color: #f56565; font-weight: 600;">Absent</span>' : ''}
                </div>
            </div>
            <div class="student-actions">
                <button class="btn-small btn-edit" onclick="editStudent(${student.id})">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteStudent(${student.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Filter management list
function filterManagementList() {
    const searchTerm = document.getElementById('managementSearch').value.toLowerCase();
    const items = document.querySelectorAll('.management-student-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Reset student form
function resetStudentForm() {
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('formTitle').textContent = 'Add New Student';
    document.getElementById('saveButton').textContent = 'Add Student';
    document.getElementById('customTransportGroup').style.display = 'none';
    document.getElementById('customTransport').required = false;
}

// Edit student
async function editStudent(studentId) {
    try {
        const student = students.find(s => s.id === studentId);
        if (!student) return;
        
        // Populate form
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentNameInput').value = student.name;
        document.getElementById('studentPathway').value = student.pathway;
        
        // Handle transport
        const transportSelect = document.getElementById('studentTransport');
        const customGroup = document.getElementById('customTransportGroup');
        const customInput = document.getElementById('customTransport');
        
        // Check if transport is in predefined options
        const transportOptions = Array.from(transportSelect.options).map(opt => opt.value);
        if (transportOptions.includes(student.transport)) {
            transportSelect.value = student.transport;
            customGroup.style.display = 'none';
        } else {
            transportSelect.value = 'custom';
            customGroup.style.display = 'block';
            customInput.value = student.transport;
            customInput.required = true;
        }
        
        // Update form labels
        document.getElementById('formTitle').textContent = 'Edit Student';
        document.getElementById('saveButton').textContent = 'Update Student';
        
    } catch (error) {
        console.error('Error editing student:', error);
        showStatus('Error loading student data', 'error');
    }
}

// Delete student
async function deleteStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    if (!confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`/api/students/${studentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showStatus(result.message, 'success');
            
            // Reload data
            await loadStudents();
            await loadStudentsForManagement();
        } else {
            const error = await response.json();
            showStatus(error.error || 'Failed to delete student', 'error');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Handle student form submission
document.addEventListener('DOMContentLoaded', function() {
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentFormSubmit);
    }
});

async function handleStudentFormSubmit(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const name = document.getElementById('studentNameInput').value.trim();
    const transportSelect = document.getElementById('studentTransport').value;
    const customTransport = document.getElementById('customTransport').value.trim();
    const studentPathway = document.getElementById('studentPathway').value;
    
    // Determine final transport value
    const transport = transportSelect === 'custom' ? customTransport : transportSelect;
    
    if (!name || !transport || !studentPathway) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }
    
    const studentData = {
        name: name,
        transport: transport,
        pathway: studentPathway
    };
    
    try {
        showLoading();
        
        let response;
        let successMessage;
        
        if (studentId) {
            // Update existing student
            response = await fetch(`/api/students/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            successMessage = 'Student updated successfully';
        } else {
            // Add new student
            response = await fetch('/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            successMessage = 'Student added successfully';
        }
        
        if (response.ok) {
            const result = await response.json();
            showStatus(successMessage, 'success');
            
            // Reset form and reload data
            resetStudentForm();
            await loadStudents();
            await loadStudentsForManagement();
        } else {
            const error = await response.json();
            showStatus(error.error || 'Failed to save student', 'error');
        }
    } catch (error) {
        console.error('Error saving student:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('studentModal');
    if (event.target === modal) {
        closeStudentModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('studentModal');
        if (!modal.classList.contains('hidden')) {
            closeStudentModal();
        }
    }
});

// CSV Import/Export Functions
let csvImportData = [];

// Download CSV template
function downloadCSVTemplate() {
    const csvContent = "Name,Transport,Pathway\nJohn Smith,Bus 8,Explorers\nJane Doe,Taxi 5,Futures\nBob Johnson,Parent Drop,Preparations";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'student_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('Template downloaded successfully', 'success');
    }
}

// Handle CSV file upload
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showStatus('Please select a valid CSV file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseCSV(csv);
    };
    reader.readAsText(file);
}

// Parse CSV content
function parseCSV(csvText) {
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            showStatus('CSV file must contain at least a header row and one data row', 'error');
            return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Validate headers
        const requiredHeaders = ['Name', 'Transport', 'Pathway'];
        const headerMap = {};
        
        requiredHeaders.forEach(required => {
            const found = headers.find(h => h.toLowerCase() === required.toLowerCase());
            if (!found) {
                showStatus(`Required column '${required}' not found in CSV. Expected columns: ${requiredHeaders.join(', ')}`, 'error');
                return;
            }
            headerMap[required.toLowerCase()] = headers.indexOf(found);
        });
        
        // Parse data rows
        csvImportData = [];
        const errors = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            
            if (values.length < 3) {
                errors.push(`Row ${i + 1}: Insufficient columns`);
                continue;
            }
            
            const name = values[headerMap.name] || '';
            const transport = values[headerMap.transport] || '';
            const studentPathway = values[headerMap.pathway] || '';
            
            if (!name || !transport || !studentPathway) {
                errors.push(`Row ${i + 1}: Missing required data (Name: "${name}", Transport: "${transport}", Pathway: "${studentPathway}")`);
                continue;
            }
            
            // Check for duplicate in current CSV
            const duplicate = csvImportData.find(s => s.name.toLowerCase() === name.toLowerCase());
            if (duplicate) {
                errors.push(`Row ${i + 1}: Duplicate name "${name}" in CSV`);
                continue;
            }
            
            csvImportData.push({
                name: name,
                transport: transport,
                pathway: studentPathway,
                rowNumber: i + 1
            });
        }
        
        if (errors.length > 0) {
            showCSVErrors(errors);
            return;
        }
        
        if (csvImportData.length === 0) {
            showStatus('No valid student data found in CSV', 'error');
            return;
        }
        
        showCSVPreview();
        
    } catch (error) {
        console.error('Error parsing CSV:', error);
        showStatus('Error parsing CSV file. Please check the format.', 'error');
    }
}

// Show CSV parsing errors
function showCSVErrors(errors) {
    const resultsDiv = document.getElementById('csvResults');
    const contentDiv = document.getElementById('csvResultsContent');
    
    resultsDiv.className = 'csv-results error';
    resultsDiv.classList.remove('hidden');
    
    contentDiv.innerHTML = `
        <h4>❌ CSV Import Errors</h4>
        <p>Please fix the following errors and try again:</p>
        <ul class="csv-error-list">
            ${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}
        </ul>
    `;
    
    // Hide preview
    document.getElementById('csvPreview').classList.add('hidden');
}

// Show CSV preview
function showCSVPreview() {
    const previewDiv = document.getElementById('csvPreview');
    const tableDiv = document.getElementById('csvPreviewTable');
    
    // Check for conflicts with existing students
    const conflicts = [];
    csvImportData.forEach(importStudent => {
        const existing = students.find(s => s.name.toLowerCase() === importStudent.name.toLowerCase());
        if (existing) {
            conflicts.push(`${importStudent.name} (already exists)`);
        }
    });
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Transport</th>
                    <th>Pathway</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    csvImportData.forEach(student => {
        const existing = students.find(s => s.name.toLowerCase() === student.name.toLowerCase());
        const status = existing ? 
            '<span style="color: #f56565;">⚠️ Already exists</span>' : 
            '<span style="color: #48bb78;">✅ Ready to import</span>';
        
        tableHTML += `
            <tr>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.transport)}</td>
                <td>${escapeHtml(student.pathway)}</td>
                <td>${status}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    
    if (conflicts.length > 0) {
        tableHTML = `
            <div style="margin-bottom: 1rem; padding: 1rem; background-color: #fed7d7; border-radius: 6px; color: #742a2a;">
                <strong>⚠️ Conflicts Found:</strong> ${conflicts.length} student(s) already exist and will be skipped.
            </div>
        ` + tableHTML;
    }
    
    tableDiv.innerHTML = tableHTML;
    previewDiv.classList.remove('hidden');
    
    // Hide results
    document.getElementById('csvResults').classList.add('hidden');
    
    // Update import button
    const validStudents = csvImportData.filter(student => 
        !students.find(s => s.name.toLowerCase() === student.name.toLowerCase())
    );
    
    const importBtn = document.getElementById('confirmImportBtn');
    if (validStudents.length === 0) {
        importBtn.disabled = true;
        importBtn.textContent = 'No New Students to Import';
    } else {
        importBtn.disabled = false;
        importBtn.textContent = `Import ${validStudents.length} Student(s)`;
    }
}

// Cancel CSV import
function cancelCSVImport() {
    document.getElementById('csvPreview').classList.add('hidden');
    document.getElementById('csvResults').classList.add('hidden');
    document.getElementById('csvFileInput').value = '';
    csvImportData = [];
}

// Confirm CSV import
async function confirmCSVImport() {
    try {
        showLoading();
        
        const validStudents = csvImportData.filter(student => 
            !students.find(s => s.name.toLowerCase() === student.name.toLowerCase())
        );
        
        if (validStudents.length === 0) {
            showStatus('No new students to import', 'error');
            return;
        }
        
        const results = {
            success: [],
            errors: []
        };
        
        // Import students one by one
        for (const student of validStudents) {
            try {
                const response = await fetch('/api/students', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: student.name,
                        transport: student.transport,
                        pathway: student.pathway
                    })
                });
                
                if (response.ok) {
                    results.success.push(student.name);
                } else {
                    const error = await response.json();
                    results.errors.push(`${student.name}: ${error.error}`);
                }
            } catch (error) {
                results.errors.push(`${student.name}: Network error`);
            }
        }
        
        // Show results
        showCSVImportResults(results);
        
        // Refresh student lists
        await loadStudents();
        await loadStudentsForManagement();
        
        // Reset CSV import
        cancelCSVImport();
        
    } catch (error) {
        console.error('Error importing CSV:', error);
        showStatus('Error importing students. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Show CSV import results
function showCSVImportResults(results) {
    const resultsDiv = document.getElementById('csvResults');
    const contentDiv = document.getElementById('csvResultsContent');
    
    const hasErrors = results.errors.length > 0;
    resultsDiv.className = hasErrors ? 'csv-results error' : 'csv-results success';
    resultsDiv.classList.remove('hidden');
    
    let contentHTML = '';
    
    if (results.success.length > 0) {
        contentHTML += `
            <h4>✅ Successfully Imported (${results.success.length})</h4>
            <ul class="csv-success-list">
                ${results.success.map(name => `<li>${escapeHtml(name)}</li>`).join('')}
            </ul>
        `;
    }
    
    if (results.errors.length > 0) {
        contentHTML += `
            <h4>❌ Import Errors (${results.errors.length})</h4>
            <ul class="csv-error-list">
                ${results.errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}
            </ul>
        `;
    }
    
    contentDiv.innerHTML = contentHTML;
    
    // Show overall status
    if (results.success.length > 0 && results.errors.length === 0) {
        showStatus(`Successfully imported ${results.success.length} student(s)`, 'success');
    } else if (results.success.length > 0 && results.errors.length > 0) {
        showStatus(`Imported ${results.success.length} student(s) with ${results.errors.length} error(s)`, 'warning');
    } else {
        showStatus('No students were imported due to errors', 'error');
    }
}