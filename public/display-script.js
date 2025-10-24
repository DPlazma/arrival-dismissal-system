// Global variables
let arrivedStudents = [];
let allStudents = [];
let filteredStudents = [];
let currentTime = new Date();

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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Setup side menu
    setupSideMenu();
    
    // Update time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Load initial data
    loadArrivedStudents();
    loadAllStudents();
    
    // Set up filter functionality
    const transportFilter = document.getElementById('transportFilter');
    const pathwayFilter = document.getElementById('pathwayFilter');
    transportFilter.addEventListener('change', handleFilters);
    pathwayFilter.addEventListener('change', handleFilters);
    
    // Auto-refresh every 10 seconds (more frequent for display)
    setInterval(() => {
        loadArrivedStudents();
        showRefreshIndicator();
    }, 10000);
    
    // Also refresh all students every 30 seconds to update filters
    setInterval(loadAllStudents, 30000);
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

// Load arrived students from API
async function loadArrivedStudents() {
    try {
        const response = await fetch('/api/students/arrived');
        if (response.ok) {
            arrivedStudents = await response.json();
            filteredStudents = [...arrivedStudents];
            handleFilters(); // Apply current filters
            updateStats();
        } else {
            console.error('Failed to load arrived students');
        }
    } catch (error) {
        console.error('Error loading arrived students:', error);
    }
}

// Load all students for statistics and filters
async function loadAllStudents() {
    try {
        const response = await fetch('/api/students');
        if (response.ok) {
            allStudents = await response.json();
            updateFilters();
            updateStats();
        } else {
            console.error('Failed to load all students');
        }
    } catch (error) {
        console.error('Error loading all students:', error);
    }
}

// Update filter options
function updateFilters() {
    updateTransportFilter();
    updatePathwayFilter();
}

// Update transport filter options
function updateTransportFilter() {
    const transportFilter = document.getElementById('transportFilter');
    const transports = [...new Set(allStudents.map(s => s.transport))].sort();
    
    // Store current selection
    const currentValue = transportFilter.value;
    
    // Clear and rebuild options
    transportFilter.innerHTML = '<option value="">All Transport</option>';
    
    transports.forEach(transport => {
        const option = document.createElement('option');
        option.value = transport;
        option.textContent = transport;
        transportFilter.appendChild(option);
    });
    
    // Restore selection if still valid
    if (transports.includes(currentValue)) {
        transportFilter.value = currentValue;
    }
}

// Update pathway filter options
function updatePathwayFilter() {
    const pathwayFilter = document.getElementById('pathwayFilter');
    const pathways = [...new Set(allStudents.map(s => s.pathway))].sort();
    
    // Store current selection
    const currentValue = pathwayFilter.value;
    
    // Clear and rebuild options
    pathwayFilter.innerHTML = '<option value="">All Pathways</option>';
    
    pathways.forEach(pathway => {
        const option = document.createElement('option');
        option.value = pathway;
        option.textContent = pathway;
        pathwayFilter.appendChild(option);
    });
    
    // Restore selection if still valid
    if (pathways.includes(currentValue)) {
        pathwayFilter.value = currentValue;
    }
}

// Handle filter changes
function handleFilters() {
    const transportFilter = document.getElementById('transportFilter').value;
    const pathwayFilter = document.getElementById('pathwayFilter').value;
    
    let filtered = [...arrivedStudents];
    
    // Apply transport filter
    if (transportFilter) {
        filtered = filtered.filter(student => student.transport === transportFilter);
    }
    
    // Apply pathway filter
    if (pathwayFilter) {
        filtered = filtered.filter(student => student.pathway === pathwayFilter);
    }
    
    filteredStudents = filtered;
    displayStudents();
}

// Display arrived students
function displayStudents() {
    const studentsGrid = document.getElementById('studentsGrid');
    
    if (filteredStudents.length === 0) {
        studentsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">No students arrived yet</div>
                <div class="empty-state-message">Students will appear here as they arrive</div>
            </div>
        `;
        return;
    }
    
    // Sort students by arrival time (most recent first) then by name
    const sortedStudents = [...filteredStudents].sort((a, b) => {
        const timeA = new Date(a.arrivalTime);
        const timeB = new Date(b.arrivalTime);
        
        // Sort by arrival time first (most recent first)
        if (timeA !== timeB) {
            return timeB - timeA;
        }
        
        // Then by name
        return a.name.localeCompare(b.name);
    });
    
    studentsGrid.innerHTML = sortedStudents.map(student => {
        const arrivalTime = new Date(student.arrivalTime).toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Determine transport icon
        let transportIcon = '🚌';
        if (student.transport.toLowerCase().includes('taxi')) {
            transportIcon = '🚕';
        } else if (student.transport.toLowerCase().includes('parent') || student.transport.toLowerCase().includes('drop')) {
            transportIcon = '🚗';
        }
        
        return `
            <div class="student-card">
                <div class="student-name">${escapeHtml(student.name)}</div>
                <div class="student-details">
                    <div class="student-transport">
                        ${transportIcon} ${escapeHtml(student.transport)}
                    </div>
                    <div class="student-pathway">${escapeHtml(student.pathway)}</div>
                </div>
                <div class="arrival-info">
                    <span class="arrival-badge">Arrived</span>
                    <span class="arrival-time">${arrivalTime}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update statistics display
function updateStats() {
    const arrivedCount = arrivedStudents.length;
    const totalCount = allStudents.length;
    const percentage = totalCount > 0 ? Math.round((arrivedCount / totalCount) * 100) : 0;
    
    document.getElementById('arrivedCount').textContent = arrivedCount;
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('percentageCount').textContent = `${percentage}%`;
}

// Show refresh indicator
function showRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    indicator.style.color = '#38a169';
    indicator.style.transform = 'scale(1.2)';
    
    setTimeout(() => {
        indicator.style.color = '#48bb78';
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
        await Promise.all([
            loadArrivedStudents(),
            loadAllStudents()
        ]);
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
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // R for refresh
    if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        refreshDisplay();
    }
    
    // A for admin view
    if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        openAdminView();
    }
    
    // F for fullscreen toggle
    if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
    }
});

// Fullscreen functionality for displays
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Handle visibility change (when tab becomes active/inactive)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Tab became active, refresh data
        refreshDisplay();
    }
});

// Add visual feedback for new arrivals
let lastArrivedCount = 0;

function checkForNewArrivals() {
    if (arrivedStudents.length > lastArrivedCount && lastArrivedCount > 0) {
        // New arrival detected, add visual feedback
        const newCount = arrivedStudents.length - lastArrivedCount;
        showNewArrivalNotification(newCount);
    }
    lastArrivedCount = arrivedStudents.length;
}

function showNewArrivalNotification(count) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #48bb78;
        color: white;
        padding: 2rem 3rem;
        border-radius: 20px;
        font-size: 1.5rem;
        font-weight: 600;
        box-shadow: 0 20px 40px rgba(72, 187, 120, 0.4);
        z-index: 2000;
        animation: slideIn 0.5s ease-out;
    `;
    
    notification.textContent = `${count} new arrival${count > 1 ? 's' : ''}! 🎉`;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
    }
`;
document.head.appendChild(style);

// Override the loadArrivedStudents function to check for new arrivals
const originalLoadArrivedStudents = loadArrivedStudents;
loadArrivedStudents = async function() {
    await originalLoadArrivedStudents();
    checkForNewArrivals();
};