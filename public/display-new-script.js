// Global variables
let allVehicles = [];
let buses = [];
let taxis = [];
let currentTime = new Date();
let pathwayLabel = 'Pathway';

// Setup side menu functionality
function setupSideMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const mainContainer = document.getElementById('mainContainer');
    
    menuToggle.addEventListener('click', function() {
        sideMenu.classList.toggle('open');
        mainContainer.classList.toggle('menu-open');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!sideMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            sideMenu.classList.remove('open');
            mainContainer.classList.remove('menu-open');
        }
    });
    
    // Close menu with escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            sideMenu.classList.remove('open');
            mainContainer.classList.remove('menu-open');
        }
    });
}

// Load and apply theme settings from localStorage
function loadDisplayTheme() {
    const theme = localStorage.getItem('theme') || 'blue';
    pathwayLabel = localStorage.getItem('pathwayLabel') || 'Pathway';
    
    // Check for stored dark mode preference, otherwise use system preference
    const storedDarkMode = localStorage.getItem('darkMode');
    let darkMode;
    if (storedDarkMode !== null) {
        darkMode = storedDarkMode === 'true';
    } else {
        // Use system preference if no stored preference
        darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply theme
    applyDisplayTheme(theme);
    
    // Apply dark mode
    if (darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Set dark mode toggle state
    const darkModeToggle = document.getElementById('displayDarkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = darkMode;
    }
    
    // Listen for system theme changes (only if no stored preference)
    if (storedDarkMode === null && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (localStorage.getItem('darkMode') === null) {
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
                // Update toggle state
                const toggle = document.getElementById('displayDarkModeToggle');
                if (toggle) toggle.checked = e.matches;
            }
        });
    }
    
    // Update pathway labels
    updateDisplayPathwayLabels();
    
    // Set up dark mode toggle
    setupDarkModeToggle();
}

function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('displayDarkModeToggle');
    if (!darkModeToggle) return;
    
    // Set initial state based on current dark mode
    const storedDarkMode = localStorage.getItem('darkMode');
    let darkMode;
    if (storedDarkMode !== null) {
        darkMode = storedDarkMode === 'true';
    } else {
        darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    darkModeToggle.checked = darkMode;
    
    // Add event listener for toggle changes
    darkModeToggle.addEventListener('change', function() {
        const isDark = this.checked;
        
        // Save preference to localStorage
        localStorage.setItem('darkMode', isDark.toString());
        
        // Apply dark mode
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });
}

function applyDisplayTheme(theme) {
    // Remove existing theme classes
    document.body.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange');
    
    // Apply new theme
    document.body.classList.add(`theme-${theme}`);
}

// Update pathway labels in the display interface
function updateDisplayPathwayLabels() {
    const label = pathwayLabel;
    
    // Update filter label
    const pathwayFilterLabel = document.getElementById('pathwayFilterLabel');
    if (pathwayFilterLabel) {
        pathwayFilterLabel.textContent = `Filter by ${label}:`;
    }
    
    // Update "All Pathways" option
    const allPathwaysOption = document.querySelector('#pathwayFilter option[value=""]');
    if (allPathwaysOption) {
        allPathwaysOption.textContent = `All ${label}s`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Setup side menu
    setupSideMenu();
    
    // Load and apply theme settings
    loadDisplayTheme();
    
    // Update time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Load initial data
    loadAllVehicles();
    
    // Set up filter functionality
    const vehicleTypeFilter = document.getElementById('vehicleTypeFilter');
    const pathwayFilter = document.getElementById('pathwayFilter');
    const arrivedOnlyFilter = document.getElementById('arrivedOnlyFilter');
    vehicleTypeFilter.addEventListener('change', applyFilters);
    pathwayFilter.addEventListener('change', applyFilters);
    arrivedOnlyFilter.addEventListener('change', applyFilters);
    
    // Auto-refresh every 10 seconds
    setInterval(() => {
        loadAllVehicles();
        showRefreshIndicator();
    }, 10000);
});

// Update current time display
function updateCurrentTime() {
    currentTime = new Date();
    const timeString = currentTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('currentTime').textContent = timeString;
}

// Load all vehicles from API
async function loadAllVehicles() {
    try {
        const response = await fetch('/api/vehicles');
        if (response.ok) {
            allVehicles = await response.json();
            
            // Separate buses and taxis
            buses = allVehicles.filter(vehicle => vehicle.type === 'bus');
            taxis = allVehicles.filter(vehicle => vehicle.type === 'taxi' || vehicle.type === 'parent' || vehicle.type === 'adhoc');
            
            // Display vehicles
            displayBuses();
            displayTaxis();
            updateStats();
            applyFilters();
        } else {
            console.error('Failed to load vehicles');
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

// Display buses in the top row
function displayBuses() {
    const busRow = document.getElementById('busRow');
    
    if (buses.length === 0) {
        busRow.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚌</div>
                <div class="empty-state-title">No buses configured</div>
                <div class="empty-state-message">Add buses in the admin interface</div>
            </div>
        `;
        return;
    }
    
    // Sort buses by number
    const sortedBuses = [...buses].sort((a, b) => parseInt(a.number) - parseInt(b.number));
    
    busRow.innerHTML = sortedBuses.map(bus => {
        const statusText = getStatusText(bus.status);
        const studentCount = bus.students.length;
        
        return `
            <div class="bus-card ${bus.status}" data-vehicle-id="${bus.id}">
                <div class="bus-number">Bus ${escapeHtml(bus.number)}</div>
                <div class="bus-status">${statusText}</div>
                <div class="bus-student-count">${studentCount} student${studentCount !== 1 ? 's' : ''}</div>
                ${bus.arrivalTime ? `<div class="bus-arrival-time">${formatTime(bus.arrivalTime)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Display taxis in the main grid
function displayTaxis() {
    const taxiGrid = document.getElementById('taxiGrid');
    const arrivedOnlyFilter = document.getElementById('arrivedOnlyFilter').checked;
    
    if (taxis.length === 0) {
        taxiGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚕</div>
                <div class="empty-state-title">No taxis/drop-offs configured</div>
                <div class="empty-state-message">Add vehicles in the admin interface</div>
            </div>
        `;
        return;
    }
    
    // Apply arrived-only filter if enabled
    let displayTaxis = arrivedOnlyFilter ? taxis.filter(taxi => taxi.status === 'arrived') : taxis;
    
    if (displayTaxis.length === 0) {
        taxiGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No arrived taxis to display</div>
                <div class="empty-state-message">Uncheck "Show Only Arrived Taxis" to see all taxis</div>
            </div>
        `;
        return;
    }
    
    // Sort taxis purely by latest modified (most recent first)
    const sortedTaxis = [...displayTaxis].sort((a, b) => {
        // Sort by lastModified (most recent first) - no other sorting criteria
        const aTime = new Date(a.lastModified || 0);
        const bTime = new Date(b.lastModified || 0);
        return bTime - aTime; // b - a for descending order (newest first)
    });
    
    taxiGrid.innerHTML = sortedTaxis.map(taxi => {
        const statusBadge = getStatusBadge(taxi.status);
        const vehicleTypeIcon = taxi.type === 'parent' ? '🚗' : '🚕';
        const vehicleName = taxi.type === 'parent' ? 'Parent Drop-off' : `Taxi ${taxi.number}`;
        
        return `
            <div class="taxi-card ${taxi.status}" data-vehicle-id="${taxi.id}">
                <div class="taxi-header">
                    <div class="taxi-name">${vehicleTypeIcon} ${escapeHtml(vehicleName)}</div>
                    <div class="taxi-status-badge ${taxi.status}">${statusBadge}</div>
                </div>
                
                <div class="taxi-students">
                    ${taxi.students.map(student => `
                        <div class="student-item">
                            <div>
                                <div class="student-name">${escapeHtml(student.name)}</div>
                                <div class="student-pathway">${escapeHtml(student.pathway)}</div>
                            </div>
                            <div class="student-status ${student.status || 'not-arrived'}">${getStatusText(student.status || 'not-arrived')}</div>
                        </div>
                    `).join('')}
                </div>
                
                ${taxi.arrivalTime ? `<div class="taxi-arrival-time">Arrived: ${formatTime(taxi.arrivalTime)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Get status icon for vehicles
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
        case 'absent': return 'Absent';
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

// Apply filters
function applyFilters() {
    const vehicleTypeFilter = document.getElementById('vehicleTypeFilter').value;
    const pathwayFilter = document.getElementById('pathwayFilter').value;
    const arrivedOnlyFilter = document.getElementById('arrivedOnlyFilter').checked;
    
    // Show/hide bus section
    const busSection = document.querySelector('.bus-section');
    if (vehicleTypeFilter === '' || vehicleTypeFilter === 'bus') {
        busSection.style.display = 'block';
    } else {
        busSection.style.display = 'none';
    }
    
    // Filter and display taxis
    let filteredTaxis = [...taxis];
    
    // Apply vehicle type filter
    if (vehicleTypeFilter && vehicleTypeFilter !== 'bus') {
        filteredTaxis = filteredTaxis.filter(taxi => taxi.type === vehicleTypeFilter);
    }
    
    // Apply pathway filter
    if (pathwayFilter) {
        filteredTaxis = filteredTaxis.filter(taxi => 
            taxi.students.some(student => student.pathway === pathwayFilter)
        );
    }
    
    // Apply arrived-only filter (default: true)
    if (arrivedOnlyFilter) {
        filteredTaxis = filteredTaxis.filter(taxi => taxi.status === 'arrived');
    }
    
    // Update taxi display with filtered results
    displayFilteredTaxis(filteredTaxis);
}

// Display filtered taxis
function displayFilteredTaxis(filteredTaxis) {
    const taxiGrid = document.getElementById('taxiGrid');
    
    if (filteredTaxis.length === 0) {
        taxiGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">No vehicles match filters</div>
                <div class="empty-state-message">Try adjusting your filter settings</div>
            </div>
        `;
        return;
    }
    
    // Sort taxis purely by latest modified (most recent first)
    const sortedTaxis = [...filteredTaxis].sort((a, b) => {
        // Sort by lastModified (most recent first) - no other sorting criteria
        const aTime = new Date(a.lastModified || 0);
        const bTime = new Date(b.lastModified || 0);
        return bTime - aTime; // b - a for descending order (newest first)
    });
    
    taxiGrid.innerHTML = sortedTaxis.map(taxi => {
        const statusBadge = getStatusBadge(taxi.status);
        const vehicleTypeIcon = taxi.type === 'parent' ? '🚗' : '🚕';
        const vehicleName = taxi.type === 'parent' ? 'Parent Drop-off' : `Taxi ${taxi.number}`;
        
        return `
            <div class="taxi-card ${taxi.status}" data-vehicle-id="${taxi.id}">
                <div class="taxi-header">
                    <div class="taxi-name">${vehicleTypeIcon} ${escapeHtml(vehicleName)}</div>
                    <div class="taxi-status-badge ${taxi.status}">${statusBadge}</div>
                </div>
                
                <div class="taxi-students">
                    ${taxi.students.map(student => `
                        <div class="student-item">
                            <div>
                                <div class="student-name">${escapeHtml(student.name)}</div>
                                <div class="student-pathway">${escapeHtml(student.pathway)}</div>
                            </div>
                            <div class="student-status ${student.status || 'not-arrived'}">${getStatusText(student.status || 'not-arrived')}</div>
                        </div>
                    `).join('')}
                </div>
                
                ${taxi.arrivalTime ? `<div class="taxi-arrival-time">Arrived: ${formatTime(taxi.arrivalTime)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Update statistics display
function updateStats() {
    const totalVehicles = allVehicles.length;
    const arrivedVehicles = allVehicles.filter(v => v.status === 'arrived').length;
    
    // Count students
    let totalStudents = 0;
    let arrivedStudents = 0;
    
    allVehicles.forEach(vehicle => {
        if (vehicle.type === 'bus') {
            totalStudents += vehicle.students.length;
            if (vehicle.status === 'arrived') {
                arrivedStudents += vehicle.students.length;
            }
        } else {
            // For taxis/parent drops, count individual student statuses
            vehicle.students.forEach(student => {
                totalStudents++;
                if (student.status === 'arrived') {
                    arrivedStudents++;
                }
            });
        }
    });
    
    document.getElementById('arrivedVehicles').textContent = arrivedVehicles;
    document.getElementById('totalVehicles').textContent = totalVehicles;
    document.getElementById('arrivedStudents').textContent = arrivedStudents;
}

// Show refresh indicator
function showRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    indicator.style.color = '#10b981';
    indicator.style.transform = 'scale(1.2)';
    
    setTimeout(() => {
        indicator.style.color = '#60a5fa';
        indicator.style.transform = 'scale(1)';
    }, 500);
}

// Open admin view in same window
function openAdminView() {
    window.location.href = '/admin';
}

// Refresh display data
async function refreshDisplay() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.remove('hidden');
    
    try {
        await loadAllVehicles();
        showRefreshIndicator();
    } catch (error) {
        console.error('Error refreshing display:', error);
    } finally {
        setTimeout(() => {
            loadingIndicator.classList.add('hidden');
        }, 500);
    }
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