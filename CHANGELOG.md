# Changelog

All notable changes to the Arrival & Dismissal System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-03-25

### Added
- **Server-Sent Events (SSE)** — Real-time push updates to display pages, replacing heavy polling
- **Server-side UI Settings API** — Theme, school name, dark mode, and pathway label stored on server instead of localStorage
- **HTTP Request Logging** — Morgan middleware for request monitoring in container logs
- **API Test Suite** — Automated tests using Node.js built-in test runner covering health, vehicles, auth, and settings
- **Keyboard Shortcuts** — Alt+R (Refresh), Alt+D (Display view), Alt+A (Admin view), Alt+M (Management modal), Escape (close modals)
- **User-facing Error Notifications** — All API errors now shown to users via toast/notification instead of silent console logs
- **SSE Connection Status** — Display page shows reconnection notices when live updates disconnect/reconnect
- **Reset PIN Function** — Admin can now reset/remove the PIN from the security settings panel
- **Loading Feedback** — Confirm Changes button shows processing state during batch operations

### Changed
- **Modular Server Architecture** — Split 1088-line monolith into 7 focused modules (data, SSE, middleware, scheduler, routes/vehicles, routes/students, routes/admin)
- **Replaced alert() with showToast()** — All browser alerts replaced with consistent toast notification system
- **Reduced Polling** — Display page reduced from 10s polling to 30s fallback (SSE handles real-time)

### Fixed
- **Data Loss on Power Outage** — Atomic writes with temp file + rename prevent corruption; data saved immediately after every mutation
- **Data Not Persisting After Restart** — All vehicle, student, and settings changes saved to disk immediately
- **Service Worker Caching** — Corrected cached file list and bumped cache version

### Security
- **Bcrypt PIN Hashing** — Admin PIN stored as bcrypt hash instead of plaintext; automatic migration of existing PINs
- **Rate Limiting** — PIN verification limited to 10 attempts per 15 minutes
- **Authentication Middleware** — All mutation API routes require authenticated session
- **CORS Removed** — Unnecessary permissive CORS headers removed
- **Session Secret** — Configurable via SESSION_SECRET environment variable

### Improved
- **Accessibility** — Semantic HTML elements (header, main, section, nav), ARIA roles, aria-live regions for dynamic content, aria-labels on interactive elements
- **Automated Backups** — Timestamped backups created before resets, keeps last 10
- **Graceful Shutdown** — Data saved on SIGINT/SIGTERM before process exits
- **Auto-save Interval** — Background save every 5 minutes as safety net
- **Docker Compose** — Removed obsolete `version` key

## [1.0.0] - 2025-11-05

### Added
- **Display Page Dark Mode Toggle** - Added dark mode toggle directly to the display interface side menu
- **Grid Space Optimization** - Significantly improved space utilization across all grids (admin bus/taxi grids, display bus/taxi grids)
- **Complete Arrival & Dismissal System** - Full-featured vehicle and student management application
- **Progressive Web App (PWA)** - Installable on mobile devices and tablets with offline capabilities
- **Docker Deployment** - Containerized application with volume persistence for data
- **Dual Interface System**:
  - Admin interface for comprehensive management
  - Display interface optimized for tablets and TVs
- **Theme System** - Complete dark/light mode support with automatic system preference detection
- **Real-time Updates** - Live status updates and auto-refresh capabilities
- **Vehicle Management** - CRUD operations for buses, taxis, and parent drop-offs
- **Student Management** - Individual student tracking with pathway assignments
- **Configurable Pathway Labels** - Customizable grouping labels throughout the UI
- **Data Persistence** - JSON file storage with Docker volume mounts
- **Responsive Design** - Optimized for tablets (768px-1024px), large tablets/TVs (1025px-1440px), and large displays (1441px+)

### Fixed
- **Vehicle Creation Error** - Fixed JavaScript error in `switchSubTab` function when adding new vehicles programmatically
- **CSV Import Error** - Fixed 'pathwayHeader is not defined' error in CSV import functionality
- **Data Persistence** - Fixed data file path to save to mounted volume directory instead of container filesystem
- **PWA Navigation** - Fixed navigation issues in installed PWA applications
- **Theme Backgrounds** - Ensured all UI elements properly theme in dark mode
- **Timer Emojis** - Removed cluttering timer emojis from bus containers
- **Security Cleanup** - Removed sensitive student data from GitHub repository history

### Technical Features
- **Node.js/Express Backend** - RESTful API with comprehensive CRUD operations
- **CSS Variable Theming** - Dynamic theme switching with complete coverage
- **Service Worker** - Offline caching and PWA functionality
- **Web App Manifest** - iOS and Android PWA support
- **Automated Scheduling** - Daily data resets and maintenance
- **Migration Logic** - Data structure updates with backward compatibility
- **Health Checks** - Docker container monitoring
- **Volume Persistence** - Data survives container restarts

### Deployment
- **GitHub Repository** - Clean repository with secure commit history
- **Docker Compose** - Single-command deployment
- **Volume Mounts** - Persistent data storage
- **Health Monitoring** - Container status checks

---

## Types of changes
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities