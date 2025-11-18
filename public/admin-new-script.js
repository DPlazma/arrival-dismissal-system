// Global variables
let allVehicles = [];
let filteredVehicles = [];
let currentTime = new Date();
let selectedVehicles = new Set();
let selectedStudents = new Map(); // vehicleId -> Set of student indices
let adminSettings = {
    schoolName: '',
    logoUrl: '',
    theme: 'blue',
    darkMode: false,
    adminPin: '',
    pathwayLabel: 'Pathway'
};

// Settings Management Functions
async function loadAdminSettings() {
    // Load settings from localStorage (for UI preferences)
    adminSettings.schoolName = localStorage.getItem('schoolName') || '';
    adminSettings.logoUrl = localStorage.getItem('logoUrl') || '';
    adminSettings.theme = localStorage.getItem('theme') || 'blue';

    // Check for stored dark mode preference, otherwise use system preference
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode !== null) {
        adminSettings.darkMode = storedDarkMode === 'true';
    } else {
        // Use system preference if no stored preference
        adminSettings.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    adminSettings.pathwayLabel = localStorage.getItem('pathwayLabel') || 'Pathway';

    // Load PIN from server
    try {
        const response = await fetch('/api/admin-settings');
        if (response.ok) {
            const serverSettings = await response.json();
            adminSettings.adminPin = serverSettings.pin;
        } else {
            console.warn('Could not load admin settings from server');
            adminSettings.adminPin = '';
        }
    } catch (error) {
        console.error('Error loading admin settings:', error);
        adminSettings.adminPin = '';
    }

    // Apply settings to UI
    document.getElementById('schoolName').value = adminSettings.schoolName;
    document.getElementById('pathwayLabel').value = adminSettings.pathwayLabel;
    document.getElementById('adminPin').value = adminSettings.adminPin;
    document.getElementById('confirmAdminPin').value = adminSettings.adminPin;
    if (adminSettings.logoUrl) {
        document.getElementById('logoPreview').src = adminSettings.logoUrl;
        document.getElementById('logoPreview').style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
    }

    // Apply theme
    applyTheme(adminSettings.theme);

    // Mark selected theme option
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelector(`[data-theme="${adminSettings.theme}"]`).classList.add('selected');
    
    // Apply dark mode
    document.getElementById('darkModeToggle').checked = adminSettings.darkMode;
    if (adminSettings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Listen for system theme changes (only if no stored preference)
    if (storedDarkMode === null && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (localStorage.getItem('darkMode') === null) {
                adminSettings.darkMode = e.matches;
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
                document.getElementById('darkModeToggle').checked = e.matches;
            }
        });
    }
    
    // Update PIN field
    document.getElementById('adminPin').value = adminSettings.adminPin;
    document.getElementById('confirmAdminPin').value = adminSettings.adminPin;
    
    // Update pathway labels throughout the UI
    updatePathwayLabels();
}

// Load and apply theme settings (called on page load)
function loadAdminThemeSettings() {
    // Load theme from localStorage
    adminSettings.theme = localStorage.getItem('theme') || 'blue';
    adminSettings.pathwayLabel = localStorage.getItem('pathwayLabel') || 'Pathway';
    
    // Check for stored dark mode preference, otherwise use system preference
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode !== null) {
        adminSettings.darkMode = storedDarkMode === 'true';
    } else {
        // Use system preference if no stored preference
        adminSettings.darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply theme
    applyTheme(adminSettings.theme);
    
    // Apply dark mode
    if (adminSettings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Listen for system theme changes (only if no stored preference)
    if (storedDarkMode === null && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (localStorage.getItem('darkMode') === null) {
                adminSettings.darkMode = e.matches;
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            }
        });
    }
}

async function saveGeneralSettings() {
    const schoolName = document.getElementById('schoolName').value.trim();
    const pathwayLabel = document.getElementById('pathwayLabel').value.trim() || 'Pathway';
    
    adminSettings.schoolName = schoolName;
    adminSettings.pathwayLabel = pathwayLabel;
    localStorage.setItem('schoolName', schoolName);
    localStorage.setItem('pathwayLabel', pathwayLabel);
    
    // Update school name in headers
    updateSchoolNameDisplay();
    
    // Update pathway labels throughout the UI
    updatePathwayLabels();
    
    alert('General settings saved successfully!');
}

function updateSchoolNameDisplay() {
    const schoolName = adminSettings.schoolName;
    const titleElement = document.querySelector('.title');
    if (schoolName) {
        titleElement.textContent = `${schoolName} - Vehicle Management`;
    } else {
        titleElement.textContent = 'Vehicle Management';
    }
}

// Update all pathway labels in the UI to use the configured label
function updatePathwayLabels() {
    const label = adminSettings.pathwayLabel;
    
    // Update filter label
    const pathwayFilterLabel = document.querySelector('label[for="pathwayFilter"]');
    if (pathwayFilterLabel) {
        pathwayFilterLabel.textContent = `Filter by ${label}:`;
    }
    
    // Update "All Pathways" option
    const allPathwaysOption = document.querySelector('#pathwayFilter option[value=""]');
    if (allPathwaysOption) {
        allPathwaysOption.textContent = `All ${label}s`;
    }
    
    // Update student pathway filter
    const studentPathwayFilterLabel = document.querySelector('label[for="studentPathwayFilter"]');
    if (studentPathwayFilterLabel) {
        studentPathwayFilterLabel.textContent = `Filter by ${label}:`;
    }
    
    const studentAllPathwaysOption = document.querySelector('#studentPathwayFilter option[value=""]');
    if (studentAllPathwaysOption) {
        studentAllPathwaysOption.textContent = `All ${label}s`;
    }
    
    // Update default pathway label
    const defaultPathwayLabel = document.querySelector('label[for="defaultPathway"]');
    if (defaultPathwayLabel) {
        defaultPathwayLabel.textContent = `Default ${label} (optional):`;
    }
    
    // Update CSV instructions
    const csvInstructions = document.querySelector('.bulk-import-section small');
    if (csvInstructions) {
        csvInstructions.textContent = `CSV should have columns: VehicleType, VehicleNumber, StudentName, ${label}`;
    }
    
    // Update bulk add instructions
    const bulkAddInstructions = document.querySelector('.bulk-add-section small');
    if (bulkAddInstructions) {
        bulkAddInstructions.textContent = `Enter student names, one per line. You can assign ${label.toLowerCase()}s and vehicles later.`;
    }
    
    // Update all existing "Select pathway" options
    const selectOptions = document.querySelectorAll('option[value=""]');
    selectOptions.forEach(option => {
        if (option.textContent.includes('Select ') && option.textContent.includes('pathway')) {
            option.textContent = `Select ${label.toLowerCase()}`;
        }
    });
}

function previewLogo() {
    const file = document.getElementById('logoUpload').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('logoPreview').src = e.target.result;
            document.getElementById('logoPreview').style.display = 'block';
            document.getElementById('logoPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function saveThemeSettings() {
    localStorage.setItem('theme', adminSettings.theme);
    localStorage.setItem('darkMode', adminSettings.darkMode);
    alert('Theme settings saved successfully!');
}

function selectTheme(theme) {
    adminSettings.theme = theme;
    
    // Remove selected class from all options
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    document.querySelector(`[data-theme="${theme}"]`).classList.add('selected');
    
    // Apply theme immediately
    applyTheme(theme);
}

function applyTheme(theme) {
    const root = document.documentElement;
    
    // Remove existing theme classes
    document.body.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange');
    
    // Apply new theme
    document.body.classList.add(`theme-${theme}`);
    
    // Update CSS variables based on theme
    const themes = {
        blue: {
            primary: '#60a5fa',
            secondary: '#3b82f6'
        },
        green: {
            primary: '#10b981',
            secondary: '#059669'
        },
        purple: {
            primary: '#8b5cf6',
            secondary: '#7c3aed'
        },
        orange: {
            primary: '#f59e0b',
            secondary: '#d97706'
        }
    };
    
    if (themes[theme]) {
        root.style.setProperty('--primary-color', themes[theme].primary);
        root.style.setProperty('--secondary-color', themes[theme].secondary);
    }
}

function toggleDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    adminSettings.darkMode = darkModeToggle.checked;
    
    // Apply dark mode immediately
    if (adminSettings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

async function saveSecuritySettings() {
    const pin = document.getElementById('adminPin').value;
    const confirmPin = document.getElementById('confirmAdminPin').value;

    if (pin !== confirmPin) {
        alert('PINs do not match. Please try again.');
        return;
    }

    if (pin && pin.length < 4) {
        alert('PIN must be at least 4 digits.');
        return;
    }

    try {
        const response = await fetch('/api/admin-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin: pin })
        });

        if (response.ok) {
            adminSettings.adminPin = pin;
            alert('Security settings saved successfully!');
        } else {
            const error = await response.json();
            alert('Error saving security settings: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving security settings:', error);
        alert('Network error. Please try again.');
    }
}

async function testPinAccess() {
    try {
        const response = await fetch('/api/admin-settings');
        if (response.ok) {
            const settings = await response.json();
            if (settings.pin) {
                // Redirect to PIN page to test access
                window.location.href = '/admin-pin.html';
            } else {
                alert('No PIN is currently set.');
            }
        } else {
            alert('Could not check PIN settings.');
        }
    } catch (error) {
        console.error('Error checking PIN settings:', error);
        alert('Network error. Please try again.');
    }
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });

            if (response.ok) {
                // Redirect to display page
                window.location.href = '/';
            } else {
                alert('Error logging out. Please try again.');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Network error. Please try again.');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load and apply theme settings
    loadAdminThemeSettings();
    
    // Update time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Load initial data
    loadAllVehicles();
    
    // Set up filter functionality
    const vehicleFilter = document.getElementById('vehicleFilter');
    const pathwayFilter = document.getElementById('pathwayFilter');
    const sortBy = document.getElementById('sortBy');
    vehicleFilter.addEventListener('change', applyFilters);
    pathwayFilter.addEventListener('change', applyFilters);
    sortBy.addEventListener('change', handleSortChange);
    
    // Set up ad-hoc input
    const adhocInput = document.getElementById('adhocInput');
    adhocInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addAdhocVehicle();
        }
    });
    // Auto-refresh every 30 seconds
    setInterval(loadAllVehicles, 30000);
});

// Update current time display
function updateCurrentTime() {
    currentTime = new Date();
    const timeString = currentTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('currentTime').textContent = timeString;
}

// Load all vehicles from API
async function loadAllVehicles() {
    try {
        const response = await fetch('/api/vehicles');
        if (response.ok) {
            allVehicles = await response.json();
            filteredVehicles = [...allVehicles];
            applySorting(); // Apply current sorting after loading
            displayVehicles();
            updateStats();
            applyFilters();
            updateSelectionSummary(); // Update selection panel
        } else {
            showToast('Failed to load vehicles', 'error');
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showToast('Error loading vehicles', 'error');
    }
}

// Display buses in admin grid
function displayBuses() {
    const busGrid = document.getElementById('busAdminGrid');
    const buses = filteredVehicles.filter(vehicle => vehicle.type === 'bus');
    
    if (buses.length === 0) {
        busGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚌</div>
                <div class="empty-state-title">No buses found</div>
                <div class="empty-state-message">Add buses or adjust filters</div>
            </div>
        `;
        return;
    }
    
    // Sort buses by number
    const sortedBuses = [...buses].sort((a, b) => parseInt(a.number) - parseInt(b.number));
    
    busGrid.innerHTML = sortedBuses.map(bus => {
        const statusText = getStatusText(bus.status);
        const studentCount = bus.students.length;
        const isSelected = selectedVehicles.has(bus.id);
        
        return `
            <div class="bus-admin-card ${bus.status} ${isSelected ? 'selected' : ''}" data-vehicle-id="${bus.id}" onclick="toggleVehicleSelection(${bus.id})">
                <div class="bus-number">Bus ${escapeHtml(bus.number)}</div>
                <div class="bus-status ${bus.status}">${statusText}</div>
                <div class="bus-student-list">
                    <div class="bus-student-count">${studentCount} student${studentCount !== 1 ? 's' : ''}</div>
                    ${bus.students.length > 0 ? `
                        <div style="margin-top: 0.5rem; font-size: 0.7rem;">
                            ${bus.students.slice(0, 3).map(s => s.name).join(', ')}
                            ${bus.students.length > 3 ? `<br>+${bus.students.length - 3} more` : ''}
                        </div>
                    ` : ''}
                </div>
                ${bus.arrivalTime ? `<div style="font-size: 0.7rem; margin-top: 0.5rem; color: #666;">
                    ${formatTime(bus.arrivalTime)}
                </div>` : ''}
            </div>
        `;
    }).join('');
}

// Display taxis in admin grid
function displayTaxis() {
    const taxiGrid = document.getElementById('taxiAdminGrid');
    const taxis = filteredVehicles.filter(vehicle => vehicle.type === 'taxi' || vehicle.type === 'parent' || vehicle.type === 'adhoc');
    
    if (taxis.length === 0) {
        taxiGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚕</div>
                <div class="empty-state-title">No taxis/drop-offs found</div>
                <div class="empty-state-message">Add vehicles or adjust filters</div>
            </div>
        `;
        return;
    }
    
    // Sort taxis numerically by number only (ignore status changes)
    const sortedTaxis = [...taxis].sort((a, b) => {
        // Ad-hoc vehicles go to the end
        if (a.type === 'adhoc' && b.type !== 'adhoc') return 1;
        if (b.type === 'adhoc' && a.type !== 'adhoc') return -1;
        
        // For regular vehicles, sort by number
        if (a.type !== 'adhoc' && b.type !== 'adhoc') {
            return parseInt(a.number) - parseInt(b.number);
        }
        
        // Ad-hoc vehicles sorted by description
        return a.description.localeCompare(b.description);
    });
    
    taxiGrid.innerHTML = sortedTaxis.map(taxi => {
        const statusBadge = getStatusBadge(taxi.status);
        const vehicleTypeIcon = taxi.type === 'parent' ? '🚗' : taxi.type === 'adhoc' ? '📝' : '🚕';
        const vehicleName = taxi.type === 'adhoc' ? taxi.description : (taxi.type === 'parent' ? 'Parent Drop-off' : `Taxi ${taxi.number}`);
        const isSelected = selectedVehicles.has(taxi.id);
        const isAdhoc = taxi.type === 'adhoc';
        
        return `
            <div class="taxi-admin-card ${taxi.status} ${isSelected ? 'selected' : ''} ${isAdhoc ? 'adhoc' : ''}" data-vehicle-id="${taxi.id}" onclick="toggleVehicleSelection(${taxi.id})">
                <div class="taxi-header">
                    <div class="taxi-name">${vehicleTypeIcon} ${escapeHtml(vehicleName)}</div>
                    <div class="taxi-status-badge ${taxi.status}">${statusBadge}</div>
                </div>
                
                <div class="taxi-students">
                    ${taxi.students.map((student, index) => {
                        const studentKey = `${taxi.id}-${index}`;
                        const isStudentSelected = selectedStudents.has(taxi.id) && selectedStudents.get(taxi.id).has(index);
                        return `
                        <div class="student-item ${student.status || 'not-arrived'} ${isStudentSelected ? 'selected' : ''}" 
                             onclick="toggleStudentSelection(${taxi.id}, ${index})">
                            <div class="student-info">
                                <div class="student-name">${escapeHtml(student.name)}</div>
                                <div class="student-pathway">${escapeHtml(student.pathway)}</div>
                            </div>
                            <div class="student-status-indicator ${student.status || 'not-arrived'}">
                                ${getStatusText(student.status || 'not-arrived')}
                            </div>
                        </div>
                    `}).join('')}
                </div>
                
                ${taxi.arrivalTime ? `<div style="font-size: 0.8rem; color: #666; text-align: center; margin-top: 1rem;">
                    First arrival: ${formatTime(taxi.arrivalTime)}
                </div>` : ''}
            </div>
        `;
    }).join('');
}

// Display all vehicles
function displayVehicles() {
    displayBuses();
    displayTaxis();
}

// Toggle bus status (cycles: not-arrived -> arrived -> absent -> not-arrived)
async function toggleBusStatus(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            await loadAllVehicles();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update bus status', 'error');
        }
    } catch (error) {
        console.error('Error toggling bus status:', error);
        showToast('Error updating bus status', 'error');
    }
}

// Toggle individual student status in taxi
async function toggleStudentStatus(vehicleId, studentIndex) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}/students/${studentIndex}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            await loadAllVehicles();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update student status', 'error');
        }
    } catch (error) {
        console.error('Error toggling student status:', error);
        showToast('Error updating student status', 'error');
    }
}

// Toggle vehicle selection for batch operations
function toggleVehicleSelection(vehicleId) {
    if (selectedVehicles.has(vehicleId)) {
        selectedVehicles.delete(vehicleId);
    } else {
        selectedVehicles.add(vehicleId);
    }
    updateSelectionSummary();
    displayVehicles(); // Refresh display to show selection state
}

// Toggle student selection for batch operations
function toggleStudentSelection(vehicleId, studentIndex) {
    if (!selectedStudents.has(vehicleId)) {
        selectedStudents.set(vehicleId, new Set());
    }
    
    const vehicleSelections = selectedStudents.get(vehicleId);
    if (vehicleSelections.has(studentIndex)) {
        vehicleSelections.delete(studentIndex);
        if (vehicleSelections.size === 0) {
            selectedStudents.delete(vehicleId);
        }
    } else {
        vehicleSelections.add(studentIndex);
    }
    
    updateSelectionSummary();
    displayVehicles(); // Refresh display to show selection state
}

// Update the selection summary panel
function updateSelectionSummary() {
    const vehicleCount = selectedVehicles.size;
    let studentCount = 0;
    
    // Count selected students
    for (const studentSet of selectedStudents.values()) {
        studentCount += studentSet.size;
    }
    
    const totalSelections = vehicleCount + studentCount;
    const summaryElement = document.getElementById('selectionSummary');
    const confirmBtn = document.getElementById('confirmChangesBtn');
    
    if (totalSelections === 0) {
        summaryElement.innerHTML = '<div class="selection-count">No vehicles or students selected</div>';
        confirmBtn.disabled = true;
    } else {
        // Count by type
        let busCount = 0;
        let taxiCount = 0;
        let parentCount = 0;
        
        selectedVehicles.forEach(vehicleId => {
            const vehicle = allVehicles.find(v => v.id === vehicleId);
            if (vehicle) {
                if (vehicle.type === 'bus') busCount++;
                else if (vehicle.type === 'taxi') taxiCount++;
                else if (vehicle.type === 'parent') parentCount++;
            }
        });
        
        let summaryText = '';
        if (busCount > 0) summaryText += `${busCount} bus${busCount !== 1 ? 'es' : ''}`;
        if (taxiCount > 0) {
            if (summaryText) summaryText += ', ';
            summaryText += `${taxiCount} taxi${taxiCount !== 1 ? 'es' : ''}`;
        }
        if (parentCount > 0) {
            if (summaryText) summaryText += ', ';
            summaryText += `${parentCount} parent drop-off${parentCount !== 1 ? 's' : ''}`;
        }
        
        summaryElement.innerHTML = `<div class="selection-count">${vehicleCount} vehicle${vehicleCount !== 1 ? 's' : ''} selected</div>
                                   <div style="font-size: 0.9rem; color: var(--secondary-text-color); margin-top: 0.5rem;">${summaryText}</div>`;
        confirmBtn.disabled = false;
    }
}

// Confirm selected changes
async function confirmSelectedChanges() {
    const totalSelections = selectedVehicles.size + Array.from(selectedStudents.values()).reduce((sum, set) => sum + set.size, 0);
    if (totalSelections === 0) return;
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // Process selected vehicles
        if (selectedVehicles.size > 0) {
            const response = await fetch('/api/vehicles/batch-toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vehicleIds: Array.from(selectedVehicles)
                })
            });
            
            if (response.ok) {
                successCount += selectedVehicles.size;
            } else {
                errorCount += selectedVehicles.size;
            }
        }
        
        // Process selected students
        for (const [vehicleId, studentIndices] of selectedStudents.entries()) {
            for (const studentIndex of studentIndices) {
                try {
                    const response = await fetch(`/api/vehicles/${vehicleId}/students/${studentIndex}/toggle`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error('Error updating student:', error);
                }
            }
        }
        
        // Clear selections and refresh
        selectedVehicles.clear();
        selectedStudents.clear();
        updateSelectionSummary();
        await loadAllVehicles();
        
        if (errorCount === 0) {
            showToast(`Successfully updated ${successCount} item${successCount !== 1 ? 's' : ''}`, 'success');
        } else {
            showToast(`Updated ${successCount} item${successCount !== 1 ? 's' : ''}, ${errorCount} error${errorCount !== 1 ? 's' : ''}`, 'error');
        }
    } catch (error) {
        console.error('Error confirming changes:', error);
        showToast('Error updating selections', 'error');
    }
}

// Clear all selections
function clearSelection() {
    selectedVehicles.clear();
    selectedStudents.clear();
    updateSelectionSummary();
    displayVehicles();
}

// Add ad-hoc vehicle
async function addAdhocVehicle() {
    const input = document.getElementById('adhocInput');
    const description = input.value.trim();
    
    if (!description) {
        showToast('Please enter a description for the ad-hoc vehicle', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/vehicles/adhoc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            input.value = '';
            await loadAllVehicles();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to add ad-hoc vehicle', 'error');
        }
    } catch (error) {
        console.error('Error adding ad-hoc vehicle:', error);
        showToast('Error adding ad-hoc vehicle', 'error');
    }
}

// Apply filters
function applyFilters() {
    const vehicleFilter = document.getElementById('vehicleFilter').value;
    const pathwayFilter = document.getElementById('pathwayFilter').value;
    
    let filtered = [...allVehicles];
    
    // Apply vehicle filter
    if (vehicleFilter) {
        if (['bus', 'taxi', 'parent', 'adhoc'].includes(vehicleFilter)) {
            filtered = filtered.filter(vehicle => vehicle.type === vehicleFilter);
        } else if (['arrived', 'partial', 'not-arrived', 'absent'].includes(vehicleFilter)) {
            filtered = filtered.filter(vehicle => vehicle.status === vehicleFilter);
        }
    }
    
    // Apply pathway filter
    if (pathwayFilter) {
        filtered = filtered.filter(vehicle => 
            vehicle.students.some(student => student.pathway === pathwayFilter)
        );
    }
    
    filteredVehicles = filtered;
    applySorting(); // Apply sorting after filtering
    displayVehicles();
}

// Update statistics
function updateStats() {
    const totalVehicles = allVehicles.length;
    const arrivedVehicles = allVehicles.filter(v => v.status === 'arrived').length;
    const partialVehicles = allVehicles.filter(v => v.status === 'partial').length;
    const absentVehicles = allVehicles.filter(v => v.status === 'absent').length;
    
    document.getElementById('totalVehicles').textContent = totalVehicles;
    document.getElementById('arrivedVehicles').textContent = arrivedVehicles;
    document.getElementById('partialVehicles').textContent = partialVehicles;
    document.getElementById('absentVehicles').textContent = absentVehicles;
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'arrived': return 'Arrived';
        case 'partial': return 'Partial';
        case 'absent': return 'Absent';
        default: return 'Not Arrived';
    }
}

// Get status badge for taxis
function getStatusBadge(status) {
    switch (status) {
        case 'arrived': return 'All Arrived';
        case 'partial': return 'Partial';
        case 'absent': return 'All Absent';
        default: return 'Waiting';
    }
}

// Format time for display
function formatTime(timeString) {
    const time = new Date(timeString);
    return time.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Legacy function redirects - remove the old modal functions
function showAddVehicleModal() {
    // Redirect to the integrated manager
    showStudentManagementModal();
    switchTab('add-vehicle');
}

function hideAddVehicleModal() {
    // No longer needed - handled by integrated modal
    hideStudentManagementModal();
}

// Legacy function - now handled by createNewVehicle in integrated modal
async function handleAddVehicle(event) {
    if (event) event.preventDefault();
    // Redirect to integrated functionality
    showToast('Please use the Vehicle Manager for adding vehicles', 'info');
    showStudentManagementModal();
    switchTab('add-vehicle');
}

// Reset all vehicles
async function resetAllVehicles() {
    if (!confirm('Are you sure you want to reset all vehicles to "Not Arrived"? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            await loadAllVehicles();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to reset vehicles', 'error');
        }
    } catch (error) {
        console.error('Error resetting vehicles:', error);
        showToast('Error resetting vehicles', 'error');
    }
}

// Refresh data
async function refreshData() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.remove('hidden');
    
    try {
        await loadAllVehicles();
        showToast('Data refreshed successfully', 'success');
    } catch (error) {
        showToast('Error refreshing data', 'error');
    } finally {
        setTimeout(() => {
            loadingIndicator.classList.add('hidden');
        }, 500);
    }
}

// Open display view in same window
function openDisplayView() {
    window.location.href = '/display';
}

// Show toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastContent = toast.querySelector('.toast-content');
    
    toastContent.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
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
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Sorting functionality
function applySorting() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredVehicles.sort((a, b) => {
        switch (sortBy) {
            case 'numerical':
                // Sort by vehicle type first (Bus < Taxi), then by number
                if (a.type !== b.type) {
                    return a.type === 'Bus' ? -1 : 1;
                }
                return a.number - b.number;
                
            case 'newest':
                // Sort by creation time (newest first)
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                
            case 'oldest':
                // Sort by creation time (oldest first)
                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                
            case 'status':
                // Sort by status (Arrived, Departed, Not Arrived)
                const statusOrder = { 'Arrived': 0, 'Departed': 1, 'Not Arrived': 2 };
                if (a.type === 'Bus' && b.type === 'Bus') {
                    return statusOrder[a.status] - statusOrder[b.status];
                } else if (a.type === 'Taxi' && b.type === 'Taxi') {
                    // For taxis, count arrived students
                    const aArrived = a.students.filter(s => s.status === 'Arrived').length;
                    const bArrived = b.students.filter(s => s.status === 'Arrived').length;
                    return bArrived - aArrived;
                } else {
                    return a.type === 'Bus' ? -1 : 1;
                }
                
            default:
                return 0;
        }
    });
}

function handleSortChange() {
    applySorting();
    displayVehicles();
    // Also update management list if it's currently visible
    if (document.getElementById('studentManagementModal').classList.contains('hidden') === false) {
        loadVehicleManagementList();
    }
}

// Student Management Modal Functions
function showStudentManagementModal() {
    // No PIN check needed - user is already authenticated for admin access
    showManagementModal();
}

function showManagementModal() {
    document.getElementById('studentManagementModal').classList.remove('hidden');
    switchMainTab('vehicles'); // Default to vehicle management
    
    // Load admin settings
    loadAdminSettings();
}

function hideStudentManagementModal() {
    document.getElementById('studentManagementModal').classList.add('hidden');
    clearCsvPreview();
    clearBulkForm();
}

// Vehicle Edit Modal Functions
let currentEditingVehicleId = null;

function showVehicleEditModal(vehicleId) {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    currentEditingVehicleId = vehicleId;
    
    // Populate the form
    document.getElementById('editVehicleType').value = vehicle.type;
    document.getElementById('editVehicleNumber').value = vehicle.number;
    
    // Show the modal
    document.getElementById('vehicleEditModal').classList.remove('hidden');
}

function hideVehicleEditModal() {
    document.getElementById('vehicleEditModal').classList.add('hidden');
    currentEditingVehicleId = null;
}

// Main tab switching (Vehicles vs Students)
function switchMainTab(mainTab) {
    // Remove active class from all main tabs and content
    document.querySelectorAll('.main-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.main-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.sub-tabs-container').forEach(container => {
        container.classList.remove('active');
    });
    
    // Add active class to selected main tab and content
    event.target.classList.add('active');
    document.getElementById(`${mainTab}-content`).classList.add('active');
    document.getElementById(`${mainTab}-subtabs`).classList.add('active');
    
    // Activate the first sub-tab by default
    if (mainTab === 'vehicles') {
        // Reset all vehicle sub-tabs first
        document.querySelectorAll('#vehicles-subtabs .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#vehicles-content .sub-content').forEach(content => content.classList.remove('active'));
        // Activate first sub-tab
        document.querySelector('#vehicles-subtabs .sub-tab-btn').classList.add('active');
        document.getElementById('vehicles-current').classList.add('active');
        loadVehicleManagementList();
    } else if (mainTab === 'students') {
        // Reset all student sub-tabs first
        document.querySelectorAll('#students-subtabs .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#students-content .sub-content').forEach(content => content.classList.remove('active'));
        // Activate first sub-tab
        document.querySelector('#students-subtabs .sub-tab-btn').classList.add('active');
        document.getElementById('students-current').classList.add('active');
        loadStudentManagementList();
    } else if (mainTab === 'settings') {
        // Reset all settings sub-tabs first
        document.querySelectorAll('#settings-subtabs .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#settings-content .sub-content').forEach(content => content.classList.remove('active'));
        // Activate first sub-tab
        document.querySelector('#settings-subtabs .sub-tab-btn').classList.add('active');
        document.getElementById('settings-general').classList.add('active');
    }
}

// Sub-tab switching within main categories
function switchSubTab(mainTab, subTab) {
    // Remove active class from all sub-tabs in this category
    const container = document.getElementById(`${mainTab}-subtabs`);
    container.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Remove active class from all sub-content in this category
    const mainContent = document.getElementById(`${mainTab}-content`);
    mainContent.querySelectorAll('.sub-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected sub-tab and content
    // Handle both programmatic calls (no event) and button clicks (with event)
    const targetButton = event && event.target ? event.target : document.querySelector(`#${mainTab}-subtabs button[onclick*="${subTab}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
    document.getElementById(`${mainTab}-${subTab}`).classList.add('active');
    
    // Load data for specific tabs
    if (mainTab === 'vehicles' && subTab === 'current') {
        loadVehicleManagementList();
    } else if (mainTab === 'students' && subTab === 'current') {
        loadStudentManagementList();
    } else if (mainTab === 'vehicles' && subTab === 'add') {
        clearNewVehicleForm();
    }
}

// Legacy function for backwards compatibility
function switchTab(tabName) {
    // Map old tab names to new structure
    if (tabName === 'manage-vehicles' || tabName === 'add-vehicle') {
        switchMainTab('vehicles');
        if (tabName === 'add-vehicle') {
            setTimeout(() => switchSubTab('vehicles', 'add'), 100);
        }
    } else if (tabName === 'manage-students' || tabName === 'csv-import' || tabName === 'manual-entry') {
        switchMainTab('students');
        if (tabName === 'csv-import') {
            setTimeout(() => switchSubTab('students', 'csv'), 100);
        } else if (tabName === 'manual-entry') {
            setTimeout(() => switchSubTab('students', 'bulk'), 100);
        }
    }
}

// CSV Import Functions
function downloadCsvTemplate() {
    const pathwayHeader = adminSettings.pathwayLabel;
    const csvContent = `VehicleType,VehicleNumber,StudentName,${pathwayHeader}\n` +
                      `Bus,1,John Smith,Preparations\n` +
                      `Bus,1,Jane Doe,Horizons\n` +
                      `Taxi,101,Bob Johnson,Explorers\n` +
                      `Taxi,102,Alice Brown,Futures\n` +
                      `Parent,Drop1,Charlie Davis,Preparations`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseAndPreviewCsv(csv);
    };
    reader.readAsText(file);
}

function parseAndPreviewCsv(csvData) {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
        showToast('CSV file must have at least a header row and one data row', 'error');
        return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Validate headers
    const pathwayHeader = adminSettings.pathwayLabel;
    const requiredHeaders = ['VehicleType', 'VehicleNumber', 'StudentName', pathwayHeader];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
        showToast(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
        return;
    }
    
    // Parse data rows
    const data = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length < headers.length) {
            errors.push(`Row ${i + 1}: Not enough columns (expected ${headers.length}, got ${values.length})`);
            continue;
        }
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        // Validate required fields
        if (!row.VehicleType || !row.VehicleNumber || !row.StudentName) {
            errors.push(`Row ${i + 1}: Missing required fields (VehicleType, VehicleNumber, or StudentName)`);
            continue;
        }
        
        // Validate vehicle type
        const validTypes = ['Bus', 'Taxi', 'Parent'];
        if (!validTypes.includes(row.VehicleType)) {
            errors.push(`Row ${i + 1}: Invalid VehicleType "${row.VehicleType}". Must be: ${validTypes.join(', ')}`);
            continue;
        }
        
        data.push(row);
    }
    
    if (errors.length > 0) {
        showToast(`CSV validation errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`, 'error');
        return;
    }
    
    if (data.length === 0) {
        showToast('No valid data rows found in CSV file', 'error');
        return;
    }
    
    // Store parsed data for import
    window.csvImportData = data;
    
    // Show preview
    displayCsvPreview(data, headers);
}

function displayCsvPreview(data, headers) {
    const preview = document.getElementById('csvPreview');
    const content = document.getElementById('csvPreviewContent');
    
    let html = '<div class="csv-row csv-header">' + headers.join(' | ') + '</div>';
    
    data.slice(0, 10).forEach(row => {
        html += '<div class="csv-row">' + 
                headers.map(h => escapeHtml(row[h] || '')).join(' | ') + 
                '</div>';
    });
    
    if (data.length > 10) {
        html += `<div class="csv-row" style="font-style: italic; color: #666;">... and ${data.length - 10} more rows</div>`;
    }
    
    content.innerHTML = html;
    preview.style.display = 'block';
}

function clearCsvPreview() {
    document.getElementById('csvPreview').style.display = 'none';
    document.getElementById('csvFile').value = '';
    window.csvImportData = null;
}

async function importCsvData() {
    if (!window.csvImportData || window.csvImportData.length === 0) {
        showToast('No data to import', 'error');
        return;
    }
    
    try {
        const pathwayHeader = adminSettings.pathwayLabel;
        const vehicleMap = new Map();
        
        // Group students by vehicle
        window.csvImportData.forEach(row => {
            // Normalize vehicle type to lowercase
            const vehicleType = row.VehicleType.toLowerCase();
            if (!['bus', 'taxi', 'parent'].includes(vehicleType)) {
                throw new Error(`Invalid vehicle type: ${row.VehicleType}. Must be Bus, Taxi, or Parent`);
            }
            
            const vehicleKey = `${vehicleType}-${row.VehicleNumber}`;
            if (!vehicleMap.has(vehicleKey)) {
                vehicleMap.set(vehicleKey, {
                    type: vehicleType,
                    number: row.VehicleNumber.toString(),
                    students: []
                });
            }
            
            vehicleMap.get(vehicleKey).students.push({
                name: row.StudentName,
                pathway: row[pathwayHeader],
                status: 'not-arrived'
            });
        });
        
        // Create/update vehicles
        let successCount = 0;
        let errorCount = 0;
        let errorMessages = [];
        
        for (const [key, vehicleData] of vehicleMap) {
            try {
                console.log('Sending vehicle data:', vehicleData);
                const response = await fetch('/api/vehicles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(vehicleData)
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    const errorData = await response.json();
                    errorMessages.push(`${vehicleData.type} ${vehicleData.number}: ${errorData.error}`);
                    errorCount++;
                }
            } catch (error) {
                errorMessages.push(`${vehicleData.type} ${vehicleData.number}: ${error.message}`);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            showToast(`Successfully imported ${successCount} vehicles`);
            loadAllVehicles();
        }
        
        if (errorCount > 0) {
            const errorMessage = errorMessages.length > 0 ? 
                `Import errors: ${errorMessages.slice(0, 3).join('; ')}${errorMessages.length > 3 ? '...' : ''}` :
                `${errorCount} vehicles failed to import`;
            showToast(errorMessage, 'error');
        }
        
        if (successCount > 0 && errorCount === 0) {
            hideStudentManagementModal();
        }
        
    } catch (error) {
        console.error('CSV Import Error:', error);
        showToast(`Error importing CSV data: ${error.message}`, 'error');
    }
}

// Manual Entry Functions
async function processBulkStudents() {
    const bulkText = document.getElementById('bulkStudents').value.trim();
    const defaultPathway = document.getElementById('defaultPathway').value;
    
    if (!bulkText) {
        showToast('Please enter student names', 'error');
        return;
    }
    
    const studentNames = bulkText.split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    if (studentNames.length === 0) {
        showToast('No valid student names found', 'error');
        return;
    }
    
    try {
        // Create a new taxi for these students
        const nextTaxiNumber = Math.max(...allVehicles
            .filter(v => v.type === 'Taxi')
            .map(v => v.number), 100) + 1;
        
        const newVehicle = {
            type: 'Taxi',
            number: nextTaxiNumber,
            students: studentNames.map(name => ({
                name,
                pathway: defaultPathway || 'Unassigned',
                status: 'Not Arrived'
            }))
        };
        
        const response = await fetch('/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newVehicle)
        });
        
        if (response.ok) {
            showToast(`Created Taxi ${nextTaxiNumber} with ${studentNames.length} students`);
            loadAllVehicles();
            hideStudentManagementModal();
        } else {
            const error = await response.text();
            showToast(`Error creating vehicle: ${error}`, 'error');
        }
    } catch (error) {
        showToast('Error processing bulk students', 'error');
    }
}

// Student input management for Add Vehicle modal
function addStudentInput() {
    const studentInputs = document.getElementById('studentInputs');
    const newInput = document.createElement('div');
    newInput.className = 'student-input-group';
    newInput.innerHTML = `
        <input type="text" placeholder="Student name" class="student-name-input">
        <select class="student-pathway-input">
            <option value="">Select ${adminSettings.pathwayLabel.toLowerCase()}</option>
            <option value="Preparations">Preparations</option>
            <option value="Horizons">Horizons</option>
            <option value="Explorers">Explorers</option>
            <option value="Futures">Futures</option>
        </select>
        <button type="button" class="btn-remove" onclick="removeStudentInput(this)">×</button>
    `;
    studentInputs.appendChild(newInput);
}

function removeStudentInput(button) {
    const inputGroup = button.closest('.student-input-group');
    if (inputGroup) {
        inputGroup.remove();
    }
}

function clearAllStudents() {
    const studentInputs = document.getElementById('studentInputs');
    studentInputs.innerHTML = `
        <div class="student-input-group">
            <input type="text" placeholder="Student name" class="student-name-input">
            <select class="student-pathway-input">
                <option value="">Select ${adminSettings.pathwayLabel.toLowerCase()}</option>
                <option value="Preparations">Preparations</option>
                <option value="Horizons">Horizons</option>
                <option value="Explorers">Explorers</option>
                <option value="Futures">Futures</option>
            </select>
            <button type="button" class="btn-remove" onclick="removeStudentInput(this)">×</button>
        </div>
    `;
}

// Vehicle Management Functions
function loadVehicleManagementList() {
    const vehicleList = document.getElementById('vehicleManagementList');
    
    if (allVehicles.length === 0) {
        vehicleList.innerHTML = '<div class="empty-management-state">No vehicles found. Add some vehicles to get started.</div>';
        updateBulkVehicleActions();
        return;
    }
    
    // Always sort numerically for management list, regardless of current sorting setting
    const sortedVehicles = [...allVehicles].sort((a, b) => {
        // Sort by vehicle type first (Bus < Taxi < Parent), then by number
        if (a.type !== b.type) {
            const typeOrder = { 'bus': 0, 'taxi': 1, 'parent': 2 };
            return typeOrder[a.type] - typeOrder[b.type];
        }
        return parseInt(a.number) - parseInt(b.number);
    });
    
    displayVehicleManagementList(sortedVehicles);
    updateBulkVehicleActions();
}

function displayVehicleManagementList(vehicles) {
    const vehicleList = document.getElementById('vehicleManagementList');
    
    vehicleList.innerHTML = vehicles.map(vehicle => {
        const vehicleTypeIcon = vehicle.type === 'bus' ? '🚌' : vehicle.type === 'taxi' ? '🚕' : '🚗';
        const studentCount = vehicle.students.length;
        
        return `
            <div class="vehicle-item" data-vehicle-id="${vehicle.id}">
                <div class="item-checkbox">
                    <input type="checkbox" onchange="updateBulkVehicleActions()" data-vehicle-id="${vehicle.id}">
                </div>
                <div class="vehicle-info">
                    <div class="vehicle-name">${vehicleTypeIcon} ${vehicle.type === 'parent' ? 'Parent Drop-off' : vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)} ${vehicle.number}</div>
                    <div class="vehicle-details">
                        ${studentCount} student${studentCount !== 1 ? 's' : ''} • Status: ${getStatusText(vehicle.status)}
                        ${vehicle.students.length > 0 ? `<br>Students: ${vehicle.students.map(s => s.name).slice(0, 3).join(', ')}${vehicle.students.length > 3 ? ` +${vehicle.students.length - 3} more` : ''}` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editVehicle(${vehicle.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteVehicle(${vehicle.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterVehicleList() {
    const searchTerm = document.getElementById('vehicleSearchInput').value.toLowerCase();
    const typeFilter = document.getElementById('vehicleTypeFilter').value;
    
    let filtered = allVehicles.filter(vehicle => {
        const matchesSearch = vehicle.number.toString().toLowerCase().includes(searchTerm) ||
                            vehicle.students.some(student => student.name.toLowerCase().includes(searchTerm));
        const matchesType = !typeFilter || vehicle.type === typeFilter;
        
        return matchesSearch && matchesType;
    });
    
    displayVehicleManagementList(filtered);
}

async function deleteVehicle(vehicleId) {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const vehicleName = vehicle.type === 'parent' ? 'Parent Drop-off' : `${vehicle.type} ${vehicle.number}`;
    
    if (!confirm(`Are you sure you want to delete ${vehicleName}? This will remove all ${vehicle.students.length} students assigned to this vehicle.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast(`${vehicleName} deleted successfully`);
            await loadAllVehicles();
            loadVehicleManagementList();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to delete vehicle', 'error');
        }
    } catch (error) {
        showToast('Error deleting vehicle', 'error');
    }
}

function editVehicle(vehicleId) {
    showVehicleEditModal(vehicleId);
}

async function saveVehicleEdit() {
    if (!currentEditingVehicleId) return;
    
    const newType = document.getElementById('editVehicleType').value;
    const newNumber = document.getElementById('editVehicleNumber').value.trim();
    
    if (!newNumber) {
        showToast('Vehicle number cannot be empty', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicles/${currentEditingVehicleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: newType,
                number: newNumber
            })
        });
        
        if (response.ok) {
            showToast('Vehicle updated successfully');
            hideVehicleEditModal();
            await loadAllVehicles();
            loadVehicleManagementList();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update vehicle', 'error');
        }
    } catch (error) {
        showToast('Error updating vehicle', 'error');
    }
}

// Student Management Functions
function loadStudentManagementList() {
    const studentList = document.getElementById('studentManagementList');
    
    // Collect all students from all vehicles
    const allStudents = [];
    allVehicles.forEach(vehicle => {
        vehicle.students.forEach((student, index) => {
            allStudents.push({
                ...student,
                vehicleId: vehicle.id,
                studentIndex: index,
                vehicleType: vehicle.type,
                vehicleNumber: vehicle.number
            });
        });
    });
    
    if (allStudents.length === 0) {
        studentList.innerHTML = '<div class="empty-management-state">No students found. Add some students to vehicles to get started.</div>';
        updateBulkStudentActions();
        return;
    }
    
    displayStudentManagementList(allStudents);
    updateBulkStudentActions();
}

function displayStudentManagementList(students) {
    const studentList = document.getElementById('studentManagementList');
    
    studentList.innerHTML = students.map(student => {
        const vehicleTypeIcon = student.vehicleType === 'bus' ? '🚌' : student.vehicleType === 'taxi' ? '🚕' : '🚗';
        const vehicleName = student.vehicleType === 'parent' ? 'Parent Drop-off' : `${student.vehicleType} ${student.vehicleNumber}`;
        
        return `
            <div class="student-item-management" data-vehicle-id="${student.vehicleId}" data-student-index="${student.studentIndex}">
                <div class="item-checkbox">
                    <input type="checkbox" onchange="updateBulkStudentActions()" data-vehicle-id="${student.vehicleId}" data-student-index="${student.studentIndex}">
                </div>
                <div class="student-info-management">
                    <div class="vehicle-name">${student.name}</div>
                    <div class="student-details">
                        Pathway: ${student.pathway} • Vehicle: ${vehicleTypeIcon} ${vehicleName} • Status: ${getStatusText(student.status || 'not-arrived')}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-edit" onclick="editStudent(${student.vehicleId}, ${student.studentIndex})">Edit</button>
                    <button class="btn-delete" onclick="deleteStudent(${student.vehicleId}, ${student.studentIndex})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function filterStudentList() {
    const searchTerm = document.getElementById('studentSearchInput').value.toLowerCase();
    const pathwayFilter = document.getElementById('studentPathwayFilter').value;
    
    // Collect all students with filters
    const allStudents = [];
    allVehicles.forEach(vehicle => {
        vehicle.students.forEach((student, index) => {
            const matchesSearch = student.name.toLowerCase().includes(searchTerm);
            const matchesPathway = !pathwayFilter || student.pathway === pathwayFilter;
            
            if (matchesSearch && matchesPathway) {
                allStudents.push({
                    ...student,
                    vehicleId: vehicle.id,
                    studentIndex: index,
                    vehicleType: vehicle.type,
                    vehicleNumber: vehicle.number
                });
            }
        });
    });
    
    displayStudentManagementList(allStudents);
}

async function deleteStudent(vehicleId, studentIndex) {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle || !vehicle.students[studentIndex]) return;
    
    const student = vehicle.students[studentIndex];
    
    if (!confirm(`Are you sure you want to remove ${student.name} from this vehicle?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}/students/${studentIndex}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast(`${student.name} removed successfully`);
            await loadAllVehicles();
            loadStudentManagementList();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to remove student', 'error');
        }
    } catch (error) {
        showToast('Error removing student', 'error');
    }
}

function editStudent(vehicleId, studentIndex) {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle || !vehicle.students[studentIndex]) return;
    
    const student = vehicle.students[studentIndex];
    const studentItem = document.querySelector(`[data-vehicle-id="${vehicleId}"][data-student-index="${studentIndex}"]`);
    const originalContent = studentItem.innerHTML;
    
    studentItem.innerHTML = `
        <div class="edit-form">
            <div class="edit-form-row">
                <label>Name:</label>
                <input type="text" id="editStudentName_${vehicleId}_${studentIndex}" value="${student.name}">
                
                <label>Pathway:</label>
                <select id="editStudentPathway_${vehicleId}_${studentIndex}">
                    <option value="Preparations" ${student.pathway === 'Preparations' ? 'selected' : ''}>Preparations</option>
                    <option value="Horizons" ${student.pathway === 'Horizons' ? 'selected' : ''}>Horizons</option>
                    <option value="Explorers" ${student.pathway === 'Explorers' ? 'selected' : ''}>Explorers</option>
                    <option value="Futures" ${student.pathway === 'Futures' ? 'selected' : ''}>Futures</option>
                </select>
            </div>
            
            <div class="edit-form-actions">
                <button class="btn-edit" onclick="saveStudentEdit(${vehicleId}, ${studentIndex})">Save</button>
                <button class="btn btn-secondary" onclick="cancelStudentEdit(${vehicleId}, ${studentIndex}, \`${escapeHtml(originalContent)}\`)">Cancel</button>
            </div>
        </div>
    `;
}

async function saveStudentEdit(vehicleId, studentIndex) {
    const newName = document.getElementById(`editStudentName_${vehicleId}_${studentIndex}`).value.trim();
    const newPathway = document.getElementById(`editStudentPathway_${vehicleId}_${studentIndex}`).value;
    
    if (!newName) {
        showToast('Student name cannot be empty', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}/students/${studentIndex}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newName,
                pathway: newPathway
            })
        });
        
        if (response.ok) {
            showToast('Student updated successfully');
            await loadAllVehicles();
            loadStudentManagementList();
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update student', 'error');
        }
    } catch (error) {
        showToast('Error updating student', 'error');
    }
}

function cancelStudentEdit(vehicleId, studentIndex, originalContent) {
    const studentItem = document.querySelector(`[data-vehicle-id="${vehicleId}"][data-student-index="${studentIndex}"]`);
    studentItem.innerHTML = originalContent;
}

// Integrated Add Vehicle Functions
function addNewVehicleStudentInput() {
    const studentInputs = document.getElementById('newVehicleStudentInputs');
    const newInput = document.createElement('div');
    newInput.className = 'student-input-group';
    newInput.innerHTML = `
        <input type="text" placeholder="Student name" class="student-name-input">
        <select class="student-pathway-input">
            <option value="">Select ${adminSettings.pathwayLabel.toLowerCase()}</option>
            <option value="Preparations">Preparations</option>
            <option value="Horizons">Horizons</option>
            <option value="Explorers">Explorers</option>
            <option value="Futures">Futures</option>
        </select>
        <button type="button" class="btn-remove" onclick="removeNewVehicleStudentInput(this)">×</button>
    `;
    studentInputs.appendChild(newInput);
}

function removeNewVehicleStudentInput(button) {
    const inputGroup = button.closest('.student-input-group');
    if (inputGroup && document.querySelectorAll('#newVehicleStudentInputs .student-input-group').length > 1) {
        inputGroup.remove();
    }
}

function clearNewVehicleStudents() {
    const studentInputs = document.getElementById('newVehicleStudentInputs');
    studentInputs.innerHTML = `
        <div class="student-input-group">
            <input type="text" placeholder="Student name" class="student-name-input">
            <select class="student-pathway-input">
                <option value="">Select ${adminSettings.pathwayLabel.toLowerCase()}</option>
                <option value="Preparations">Preparations</option>
                <option value="Horizons">Horizons</option>
                <option value="Explorers">Explorers</option>
                <option value="Futures">Futures</option>
            </select>
            <button type="button" class="btn-remove" onclick="removeNewVehicleStudentInput(this)">×</button>
        </div>
    `;
}

function clearBulkForm() {
    document.getElementById('bulkStudents').value = '';
    document.getElementById('defaultPathway').value = '';
}

function clearNewVehicleForm() {
    document.getElementById('newVehicleType').value = '';
    document.getElementById('newVehicleNumber').value = '';
    clearNewVehicleStudents();
}

async function createNewVehicle() {
    const vehicleType = document.getElementById('newVehicleType').value;
    const vehicleNumber = document.getElementById('newVehicleNumber').value.trim();
    
    if (!vehicleType || !vehicleNumber) {
        showToast('Please fill in vehicle type and number', 'error');
        return;
    }
    
    // Parse students from input groups
    const students = [];
    const studentInputGroups = document.querySelectorAll('#newVehicleStudentInputs .student-input-group');
    
    studentInputGroups.forEach(group => {
        const nameInput = group.querySelector('.student-name-input');
        const pathwayInput = group.querySelector('.student-pathway-input');
        
        if (nameInput && nameInput.value.trim()) {
            students.push({
                name: nameInput.value.trim(),
                pathway: pathwayInput.value || 'Unassigned',
                status: 'not-arrived'
            });
        }
    });
    
    try {
        const response = await fetch('/api/vehicles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: vehicleType,
                number: vehicleNumber,
                students: students
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(result.message, 'success');
            clearNewVehicleForm();
            await loadAllVehicles();
            loadVehicleManagementList();
            // Switch to current vehicles sub-tab to see the new vehicle
            switchSubTab('vehicles', 'current');
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to add vehicle', 'error');
        }
    } catch (error) {
        console.error('Error adding vehicle:', error);
        showToast('Error adding vehicle', 'error');
    }
}

// Bulk Actions Functions
function toggleSelectAllVehicles() {
    const selectAllCheckbox = document.getElementById('selectAllVehicles');
    const vehicleCheckboxes = document.querySelectorAll('#vehicleManagementList input[type="checkbox"]');
    
    vehicleCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkVehicleActions();
}

function updateBulkVehicleActions() {
    const checkedBoxes = document.querySelectorAll('#vehicleManagementList input[type="checkbox"]:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteVehiclesBtn');
    
    bulkDeleteBtn.disabled = checkedBoxes.length === 0;
}

async function bulkDeleteVehicles() {
    const checkedBoxes = document.querySelectorAll('#vehicleManagementList input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === 0) {
        showToast('No vehicles selected', 'error');
        return;
    }
    
    const vehicleIds = Array.from(checkedBoxes).map(checkbox => 
        parseInt(checkbox.getAttribute('data-vehicle-id'))
    );
    
    const vehicleNames = vehicleIds.map(id => {
        const vehicle = allVehicles.find(v => v.id === id);
        return vehicle ? `${vehicle.type} ${vehicle.number}` : `Vehicle ${id}`;
    });
    
    if (!confirm(`Are you sure you want to delete ${vehicleIds.length} vehicle(s)?\n\n${vehicleNames.join('\n')}\n\nThis action cannot be undone.`)) {
        return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const vehicleId of vehicleIds) {
        try {
            const response = await fetch(`/api/vehicles/${vehicleId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            errorCount++;
        }
    }
    
    if (successCount > 0) {
        showToast(`${successCount} vehicle(s) deleted successfully`, 'success');
        await loadAllVehicles();
        loadVehicleManagementList();
    }
    
    if (errorCount > 0) {
        showToast(`Failed to delete ${errorCount} vehicle(s)`, 'error');
    }
}

function toggleSelectAllStudents() {
    const selectAllCheckbox = document.getElementById('selectAllStudents');
    const studentCheckboxes = document.querySelectorAll('#studentManagementList input[type="checkbox"]');
    
    studentCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateBulkStudentActions();
}

function updateBulkStudentActions() {
    const checkedBoxes = document.querySelectorAll('#studentManagementList input[type="checkbox"]:checked');
    const bulkDeleteBtn = document.getElementById('bulkDeleteStudentsBtn');
    
    bulkDeleteBtn.disabled = checkedBoxes.length === 0;
}

async function bulkDeleteStudents() {
    const checkedBoxes = document.querySelectorAll('#studentManagementList input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === 0) {
        showToast('No students selected', 'error');
        return;
    }
    
    const selectedStudents = Array.from(checkedBoxes).map(checkbox => ({
        vehicleId: parseInt(checkbox.getAttribute('data-vehicle-id')),
        studentIndex: parseInt(checkbox.getAttribute('data-student-index'))
    }));
    
    const studentNames = selectedStudents.map(({vehicleId, studentIndex}) => {
        const vehicle = allVehicles.find(v => v.id === vehicleId);
        return vehicle && vehicle.students[studentIndex] ? vehicle.students[studentIndex].name : 'Unknown Student';
    });
    
    if (!confirm(`Are you sure you want to remove ${selectedStudents.length} student(s)?\n\n${studentNames.join('\n')}\n\nThis action cannot be undone.`)) {
        return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const {vehicleId, studentIndex} of selectedStudents) {
        try {
            const response = await fetch(`/api/vehicles/${vehicleId}/students/${studentIndex}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            errorCount++;
        }
    }
    
    if (successCount > 0) {
        showToast(`${successCount} student(s) removed successfully`, 'success');
        await loadAllVehicles();
        loadStudentManagementList();
    }
    
    if (errorCount > 0) {
        showToast(`Failed to remove ${errorCount} student(s)`, 'error');
    }
}