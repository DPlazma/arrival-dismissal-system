# Changelog

All notable changes to the Arrival & Dismissal System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-11-05

### Added
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