// Global variables
let allVehicles = [];
let buses = [];
let taxis = [];
let currentTime = new Date();
let connectionLost = false;

// Audio alert system
let audioEnabled = localStorage.getItem('audioEnabled') !== 'false'; // default on
let ttsEnabled = localStorage.getItem('ttsEnabled') === 'true';       // default off
let previousVehicleStates = new Map(); // track status changes for audio triggers

function playChime() {
    if (!audioEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        // Pleasant two-tone chime
        osc.frequency.setValueAtTime(880, ctx.currentTime);       // A5
        osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.15); // C#6
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.warn('Audio chime failed:', e);
    }
}

function speakArrival(vehicleName) {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(`${vehicleName} has arrived`);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
}

function getSelectedVehicleTypes() {
    return Array.from(document.querySelectorAll('[data-vehicle-type-filter]'))
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function getAllVehicleTypeOptions() {
    return Array.from(document.querySelectorAll('[data-vehicle-type-filter]'))
        .map(cb => cb.value);
}

function isVehicleTypeFilterActive(selectedTypes) {
    const allTypes = getAllVehicleTypeOptions();
    return selectedTypes.length > 0 && selectedTypes.length < allTypes.length;
}

function vehicleMatchesTypeFilter(vehicleType, selectedTypes) {
    if (!isVehicleTypeFilterActive(selectedTypes)) {
        return true;
    }
    if (vehicleType === 'adhoc') {
        return selectedTypes.includes('taxi');
    }
    return selectedTypes.includes(vehicleType);
}

function restoreVehicleTypeFilters() {
    const checkboxes = document.querySelectorAll('[data-vehicle-type-filter]');
    const savedMulti = localStorage.getItem('vehicleTypeFilterMulti');
    const savedLegacy = localStorage.getItem('vehicleTypeFilter');

    if (savedMulti !== null) {
        const types = JSON.parse(savedMulti);
        checkboxes.forEach(cb => {
            cb.checked = types.includes(cb.value);
        });
    } else if (savedLegacy) {
        checkboxes.forEach(cb => {
            cb.checked = cb.value === savedLegacy;
        });
    }
}

function persistVehicleTypeFilters() {
    localStorage.setItem('vehicleTypeFilterMulti', JSON.stringify(getSelectedVehicleTypes()));
}

function detectArrivals(newVehicles) {
    // Read active filters so alerts only fire for visible vehicles
    const selectedTypes = getSelectedVehicleTypes();
    const pathwayFilter = document.getElementById('pathwayFilter')?.value || '';

    const arrivals = [];
    for (const vehicle of newVehicles) {
        const prevStatus = previousVehicleStates.get(vehicle.id);
        if (prevStatus && prevStatus !== 'arrived' && vehicle.status === 'arrived') {
            const isBus = vehicle.type === 'bus';

            if (!vehicleMatchesTypeFilter(vehicle.type, selectedTypes)) {
                continue;
            }

            // Pathway filter: skip taxis that don't carry a student on the selected pathway
            if (pathwayFilter && !isBus) {
                const hasMatch = vehicle.students &&
                    vehicle.students.some(s => s.pathway === pathwayFilter);
                if (!hasMatch) continue;
            }

            const name = isBus ? `Bus ${vehicle.number}` :
                         vehicle.type === 'adhoc' ? vehicle.description :
                         vehicle.description || `Taxi ${vehicle.number}`;
            arrivals.push(name);
        }
    }
    // Update stored states (always, regardless of filters)
    for (const v of newVehicles) {
        previousVehicleStates.set(v.id, v.status);
    }
    return arrivals;
}

function handleArrivals(arrivals) {
    if (arrivals.length === 0) return;
    playChime();
    for (const name of arrivals) {
        speakArrival(name);
    }
    // Scroll to the taxi section so the new arrival is visible
    const taxiSection = document.querySelector('.taxi-section');
    if (taxiSection) {
        taxiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
    updateFullscreenUI();
}

function updateFullscreenUI() {
    const btn = document.getElementById('fullscreenIcon');
    if (btn) btn.textContent = document.fullscreenElement ? '⬜' : '⛶';
}

function updateAudioToggleUI() {
    const audioIcon = document.getElementById('audioToggleIcon');
    const ttsToggle = document.getElementById('ttsToggle');
    if (audioIcon) audioIcon.textContent = audioEnabled ? '🔊' : '🔇';
    if (ttsToggle) ttsToggle.checked = ttsEnabled;
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    localStorage.setItem('audioEnabled', audioEnabled);
    if (!audioEnabled) {
        ttsEnabled = false;
        localStorage.setItem('ttsEnabled', 'false');
    }
    updateAudioToggleUI();
}

function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    localStorage.setItem('ttsEnabled', ttsEnabled);
    if (ttsEnabled && !audioEnabled) {
        audioEnabled = true;
        localStorage.setItem('audioEnabled', 'true');
    }
    updateAudioToggleUI();
}

// Lightweight status notification for display page
function showDisplayNotification(message, type = 'info') {
    let notification = document.getElementById('displayNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'displayNotification';
        notification.style.cssText = 'position:fixed;bottom:1rem;right:1rem;padding:0.75rem 1.25rem;border-radius:0.5rem;font-size:0.9rem;z-index:1000;transition:opacity 0.3s;opacity:0;pointer-events:none;';
        document.body.appendChild(notification);
    }
    const colors = { error: '#ef4444', info: '#3b82f6', success: '#10b981' };
    notification.style.background = colors[type] || colors.info;
    notification.style.color = '#fff';
    notification.textContent = message;
    notification.style.opacity = '1';
    setTimeout(() => { notification.style.opacity = '0'; }, 4000);
}
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

// Load and apply theme settings from server
async function loadDisplayTheme() {
    let theme = 'blue';
    let darkMode = false;
    
    try {
        const response = await fetch('/api/ui-settings');
        if (response.ok) {
            const settings = await response.json();
            theme = settings.theme || 'blue';
            darkMode = settings.darkMode || false;
            pathwayLabel = settings.pathwayLabel || 'Pathway';
        }
    } catch (error) {
        console.error('Error loading settings from server:', error);
    }
    
    // If darkMode was never explicitly set, use system preference
    if (darkMode === null || darkMode === undefined) {
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
    
    // Listen for system theme changes
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            if (e.matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            // Update toggle state
            const toggle = document.getElementById('displayDarkModeToggle');
            if (toggle) toggle.checked = e.matches;
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
    const isDark = document.body.classList.contains('dark-mode');
    darkModeToggle.checked = isDark;
    
    // Add event listener for toggle changes
    darkModeToggle.addEventListener('change', function() {
        const isDark = this.checked;
        
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
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    registerServiceWorker();

    // Setup side menu
    setupSideMenu();
    
    // Load and apply theme settings
    await loadDisplayTheme();
    
    // Update time display
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Load initial data
    loadAllVehicles();
    
    // Set up filter functionality
    const pathwayFilter = document.getElementById('pathwayFilter');
    const arrivedOnlyFilter = document.getElementById('arrivedOnlyFilter');
    const vehicleTypeCheckboxes = document.querySelectorAll('[data-vehicle-type-filter]');
    
    // Restore saved filter preferences
    restoreVehicleTypeFilters();
    const savedPathway = localStorage.getItem('pathwayFilter');
    const savedArrivedOnly = localStorage.getItem('arrivedOnlyFilter');
    if (savedPathway !== null) pathwayFilter.value = savedPathway;
    if (savedArrivedOnly !== null) arrivedOnlyFilter.checked = savedArrivedOnly === 'true';
    
    vehicleTypeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    pathwayFilter.addEventListener('change', applyFilters);
    arrivedOnlyFilter.addEventListener('change', applyFilters);
    
    // Apply restored filters immediately
    applyFilters();
    
    // Connect to SSE for real-time updates
    connectSSE();
    
    // Initialize audio controls
    updateAudioToggleUI();
    
    // Load smart announcements
    loadSmartAnnouncements();
    setInterval(loadSmartAnnouncements, 5 * 60 * 1000); // refresh every 5 min

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.matches('input, textarea, select')) return;
        if (e.altKey && e.key === 'r') { e.preventDefault(); refreshDisplay(); }
        if (e.altKey && e.key === 'a') { e.preventDefault(); openAdminView(); }
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
    });
    
    // Update fullscreen button on fullscreen change
    document.addEventListener('fullscreenchange', updateFullscreenUI);
    
    // Fallback polling every 30 seconds (in case SSE disconnects)
    setInterval(() => {
        loadAllVehicles();
    }, 30000);
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
            
            // Seed previous states on first load (don't trigger audio for existing arrivals)
            if (previousVehicleStates.size === 0) {
                for (const v of allVehicles) {
                    previousVehicleStates.set(v.id, v.status);
                }
            }
            
            // Separate buses and taxis
            buses = allVehicles.filter(vehicle => vehicle.type === 'bus');
            taxis = allVehicles.filter(vehicle => vehicle.type === 'taxi' || vehicle.type === 'parent' || vehicle.type === 'adhoc');
            
            // Display vehicles
            displayBuses();
            updateStats();
            applyFilters();
        } else {
            console.error('Failed to load vehicles');
            showDisplayNotification('Failed to load vehicle data', 'error');
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showDisplayNotification('Connection error — retrying...', 'error');
    }
}

// Connect to Server-Sent Events for real-time updates
function connectSSE() {
    const evtSource = new EventSource('/api/events');

    evtSource.addEventListener('vehicles', (event) => {
        try {
            const newVehicles = JSON.parse(event.data);
            const arrivals = detectArrivals(newVehicles);
            allVehicles = newVehicles;
            buses = allVehicles.filter(v => v.type === 'bus');
            taxis = allVehicles.filter(v => v.type === 'taxi' || v.type === 'parent' || v.type === 'adhoc');
            displayBuses();
            updateStats();
            applyFilters();
            showRefreshIndicator();
            handleArrivals(arrivals);
        } catch (e) {
            console.error('SSE vehicles parse error:', e);
        }
    });

    evtSource.addEventListener('settings', (event) => {
        try {
            const settings = JSON.parse(event.data);
            pathwayLabel = settings.pathwayLabel || 'Pathway';
            applyDisplayTheme(settings.theme || 'blue');
            if (settings.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            const toggle = document.getElementById('displayDarkModeToggle');
            if (toggle) toggle.checked = settings.darkMode;
            updateDisplayPathwayLabels();
        } catch (e) {
            console.error('SSE settings parse error:', e);
        }
    });

    evtSource.onerror = () => {
        console.warn('SSE connection lost, will retry automatically');
        if (!connectionLost) {
            connectionLost = true;
            showDisplayNotification('Live updates disconnected — reconnecting...', 'error');
        }
    };

    evtSource.onopen = () => {
        if (connectionLost) {
            connectionLost = false;
            showDisplayNotification('Live updates reconnected', 'success');
        }
    };
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

// Render taxis in the main grid
function renderTaxiGrid(taxiList, emptyState = {}) {
    const taxiGrid = document.getElementById('taxiGrid');
    const {
        icon = '🔍',
        title = 'No vehicles match filters',
        message = 'Try adjusting your filter settings'
    } = emptyState;
    
    if (taxiList.length === 0) {
        taxiGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <div class="empty-state-title">${title}</div>
                <div class="empty-state-message">${message}</div>
            </div>
        `;
        return;
    }
    
    const sortedTaxis = [...taxiList].sort((a, b) => {
        const aTime = new Date(a.lastModified || 0);
        const bTime = new Date(b.lastModified || 0);
        return bTime - aTime;
    });
    
    taxiGrid.innerHTML = sortedTaxis.map(taxi => {
        const statusBadge = getStatusBadge(taxi.status);
        const vehicleTypeIcon = taxi.type === 'parent' ? '🚗' : taxi.type === 'adhoc' ? '📝' : '🚕';
        const vehicleName = taxi.description ? taxi.description :
                           (taxi.type === 'parent' ? 'Parent Drop-off' :
                           `Taxi ${taxi.number || 'Unknown'}`);
        
        return `
            <div class="taxi-card ${taxi.status} ${taxi.note ? 'has-note' : ''}" data-vehicle-id="${taxi.id}">
                <div class="taxi-header">
                    <div class="taxi-name">${vehicleTypeIcon} ${escapeHtml(vehicleName)}</div>
                    <div class="taxi-status-badge ${taxi.status}">${statusBadge}</div>
                </div>
                
                ${taxi.note ? `<div class="vehicle-note-display">📌 ${escapeHtml(taxi.note)}</div>` : ''}
                
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
    const selectedTypes = getSelectedVehicleTypes();
    const pathwayFilter = document.getElementById('pathwayFilter').value;
    const arrivedOnlyFilter = document.getElementById('arrivedOnlyFilter').checked;
    
    // Persist filter preferences
    persistVehicleTypeFilters();
    localStorage.setItem('pathwayFilter', pathwayFilter);
    localStorage.setItem('arrivedOnlyFilter', arrivedOnlyFilter);
    
    // Show/hide sections based on selected types
    const busSection = document.querySelector('.bus-section');
    const taxiSection = document.querySelector('.taxi-section');
    busSection.style.display = selectedTypes.includes('bus') ? 'block' : 'none';
    taxiSection.style.display = selectedTypes.some(type => ['taxi', 'parent'].includes(type)) ? 'block' : 'none';
    
    // Filter and display taxis
    let filteredTaxis = [...taxis];
    
    // Apply vehicle type filter
    if (isVehicleTypeFilterActive(selectedTypes)) {
        filteredTaxis = filteredTaxis.filter(taxi => vehicleMatchesTypeFilter(taxi.type, selectedTypes));
    } else if (selectedTypes.length === 0) {
        filteredTaxis = [];
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
    let emptyState;
    if (taxis.length === 0) {
        emptyState = {
            icon: '🚕',
            title: 'No taxis/drop-offs configured',
            message: 'Add vehicles in the admin interface'
        };
    } else if (arrivedOnlyFilter && filteredTaxis.length === 0) {
        emptyState = {
            icon: '🔍',
            title: 'No arrived taxis to display',
            message: 'Uncheck "Show Only Arrived Taxis" to see all taxis'
        };
    }
    renderTaxiGrid(filteredTaxis, emptyState);
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

// Smart Announcements — pulls alerts/warnings from insights
async function loadSmartAnnouncements() {
    const banner = document.getElementById('announcementBanner');
    if (!banner) return;
    
    try {
        const response = await fetch('/api/log/insights/public?days=14');
        if (!response.ok) {
            banner.classList.add('hidden');
            return;
        }
        const data = await response.json();
        
        // Pick display-worthy insights: alerts and warnings only
        const displayMessages = (data.insights || [])
            .filter(i => i.type === 'alert' || i.type === 'warning')
            .map(i => `${i.icon} ${i.title}: ${i.detail}`)
            .slice(0, 5);
        
        if (displayMessages.length === 0) {
            banner.classList.add('hidden');
            return;
        }
        
        const track = banner.querySelector('.announcement-track');
        if (track) {
            track.innerHTML = displayMessages.map(msg => 
                `<span class="announcement-item">${escapeHtml(msg)}</span>`
            ).join('');
            // Duplicate for seamless loop
            track.innerHTML += track.innerHTML;
        }
        banner.classList.remove('hidden');
    } catch (e) {
        console.warn('Smart announcements unavailable:', e);
        if (banner) banner.classList.add('hidden');
    }
}