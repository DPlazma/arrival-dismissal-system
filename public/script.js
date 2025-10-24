// Global variables
let records = [];
let currentTime = new Date();

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
    
    // Initialize app
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    loadRecords();
    
    // Add enter key support for input
    const studentInput = document.getElementById('studentName');
    studentInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            // Focus on arrival button by default
            document.querySelector('.btn-arrival').focus();
        }
    });
    
    // Add keyboard shortcuts (including Android TV remote)
    document.addEventListener('keydown', function(e) {
        // Alt + A for arrival
        if (e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            recordAction('arrival');
        }
        // Alt + D for dismissal
        if (e.altKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            recordAction('dismissal');
        }
        // Alt + R for refresh
        if (e.altKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            refreshRecords();
        }
        
        // Android TV D-pad navigation
        handleTVRemoteNavigation(e);
    });
    
    // Handle orientation changes on mobile devices
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    });
    
    // Prevent iOS bounce scrolling
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('.records-container')) {
            return; // Allow scrolling in records area
        }
        e.preventDefault();
    }, { passive: false });
});

// Android TV remote control navigation
function handleTVRemoteNavigation(e) {
    const focusableElements = document.querySelectorAll('button, input[type="text"]');
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
    
    switch(e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
            e.preventDefault();
            if (currentIndex > 0) {
                focusableElements[currentIndex - 1].focus();
            }
            break;
        case 'ArrowDown':
        case 'ArrowRight':
            e.preventDefault();
            if (currentIndex < focusableElements.length - 1) {
                focusableElements[currentIndex + 1].focus();
            }
            break;
        case 'Enter':
            e.preventDefault();
            if (document.activeElement) {
                document.activeElement.click();
            }
            break;
    }
}

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
        statusElement.style.display = 'none';
    }, 3000);
}

// Record an action (arrival or dismissal)
async function recordAction(type) {
    const nameInput = document.getElementById('studentName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showStatus('Please enter a student name', 'error');
        nameInput.focus();
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/${type === 'arrival' ? 'arrive' : 'dismiss'}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                time: currentTime.toISOString()
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(`${type === 'arrival' ? 'Arrival' : 'Dismissal'} recorded for ${name}`, 'success');
            nameInput.value = '';
            nameInput.focus();
            await loadRecords();
        } else {
            showStatus(data.error || 'An error occurred', 'error');
        }
    } catch (error) {
        console.error('Error recording action:', error);
        showStatus('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Load and display records
async function loadRecords() {
    try {
        const response = await fetch('/records');
        const data = await response.json();
        
        if (response.ok) {
            records = data;
            displayRecords();
        } else {
            console.error('Error loading records:', data);
        }
    } catch (error) {
        console.error('Error loading records:', error);
    }
}

// Display records in the grid
function displayRecords() {
    const recordsGrid = document.getElementById('recordsGrid');
    
    if (records.length === 0) {
        recordsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #718096;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                <div style="font-size: 1.2rem; font-weight: 500;">No records yet today</div>
                <div style="font-size: 1rem; margin-top: 0.5rem;">Start by recording an arrival or dismissal</div>
            </div>
        `;
        return;
    }
    
    // Sort records by time (most recent first)
    const sortedRecords = [...records].sort((a, b) => new Date(b.time) - new Date(a.time));
    
    recordsGrid.innerHTML = sortedRecords.map(record => {
        const recordTime = new Date(record.time);
        const timeString = recordTime.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <div class="record-card ${record.type}">
                <div class="record-name">${escapeHtml(record.name)}</div>
                <div class="record-time">${timeString}</div>
                <span class="record-type ${record.type}">${record.type}</span>
            </div>
        `;
    }).join('');
}

// Refresh records
async function refreshRecords() {
    showLoading();
    try {
        await loadRecords();
        showStatus('Records refreshed', 'success');
    } catch (error) {
        showStatus('Error refreshing records', 'error');
    } finally {
        hideLoading();
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

// Add touch event handlers for better mobile/tablet experience
document.addEventListener('DOMContentLoaded', function() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .btn {
            position: relative;
            overflow: hidden;
        }
    `;
    document.head.appendChild(style);
});

// Prevent zoom on double tap for iOS devices
document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - this.lastTouch <= 300) {
        event.preventDefault();
    }
    this.lastTouch = now;
}, false);

// Add focus management for better keyboard navigation
document.addEventListener('DOMContentLoaded', function() {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const modal = document.querySelector('.container');
    const firstFocusableElement = modal.querySelectorAll(focusableElements)[0];
    const focusableContent = modal.querySelectorAll(focusableElements);
    const lastFocusableElement = focusableContent[focusableContent.length - 1];
    
    document.addEventListener('keydown', function(e) {
        const isTabPressed = e.key === 'Tab' || e.keyCode === 9;
        
        if (!isTabPressed) {
            return;
        }
        
        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
            }
        }
    });
    
    // Focus on name input when page loads
    setTimeout(() => {
        document.getElementById('studentName').focus();
    }, 100);
});