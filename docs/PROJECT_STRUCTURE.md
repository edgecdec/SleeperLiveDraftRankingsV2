# Project Structure

This document explains the organization and purpose of each directory and file in the Fantasy Football Draft Assistant V2.

## 📁 Directory Overview

```
SleeperLiveDraftRankingsV2/
├── 📄 main.py                    # Single entry point for the application
├── 📄 requirements.txt           # Python dependencies
├── 📄 .gitignore                # Git ignore patterns
├── 📄 README.md                 # Main project documentation
│
├── 📁 src/                      # Source code
│   ├── 📁 backend/              # Backend Python code
│   │   ├── 📄 __init__.py       # Package marker
│   │   ├── 📄 app.py            # Flask application setup
│   │   ├── 📄 config.py         # Configuration settings
│   │   ├── 📁 api/              # API route handlers
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 draft.py      # Draft-related endpoints
│   │   │   ├── 📄 rankings.py   # Rankings endpoints
│   │   │   └── 📄 health.py     # Health check endpoints
│   │   ├── 📁 services/         # Business logic services
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 sleeper_api.py    # Sleeper API integration
│   │   │   ├── 📄 rankings_service.py # Rankings management
│   │   │   └── 📄 draft_service.py   # Draft processing
│   │   └── 📁 utils/            # Utility functions
│   │       ├── 📄 __init__.py
│   │       ├── 📄 port_finder.py    # Find available ports
│   │       └── 📄 browser_launcher.py # Launch browser
│   │
│   └── 📁 frontend/             # Frontend static files
│       ├── 📄 index.html        # Main HTML file
│       ├── 📄 style.css         # Styles
│       ├── 📄 app.js            # Main JavaScript application
│       └── 📁 assets/           # Images, icons, etc.
│
├── 📁 data/                     # Data files
│   ├── 📁 rankings/             # Player rankings CSV files
│   └── 📁 cache/                # Cached API responses
│
├── 📁 build/                    # Build artifacts
│   ├── 📁 dist/                 # PyInstaller output
│   └── 📁 temp/                 # Temporary build files
│
├── 📁 scripts/                  # Build and utility scripts
│   ├── 📄 build.py              # Build executable script
│   ├── 📄 dev.py                # Development server script
│   └── 📄 test.py               # Test runner script
│
└── 📁 docs/                     # Documentation
    ├── 📄 PROJECT_STRUCTURE.md  # This file
    ├── 📄 DEVELOPMENT_GUIDE.md  # Development guidelines
    ├── 📄 BUILD_GUIDE.md        # Build instructions
    ├── 📄 API_REFERENCE.md      # API documentation
    └── 📄 ARCHITECTURE.md       # Architecture decisions
```

## 🎯 Design Principles

### 1. **Single Entry Point**
- `main.py` is the only file users need to run
- All imports and dependencies are handled internally
- Auto-detects available ports and launches browser

### 2. **Embedded Static Files**
- Frontend files are embedded in the Python executable
- No external file dependencies at runtime
- All assets bundled together

### 3. **Service-Oriented Backend**
- Clear separation between API routes and business logic
- Services handle all external API calls and data processing
- Easy to test and maintain

### 4. **Minimal Frontend**
- Vanilla JavaScript (no frameworks)
- Modern ES6+ features for clean code
- CSS Grid/Flexbox for responsive layout
- No build process required

## 📄 Key Files Explained

### `main.py`
The single entry point that:
- Finds an available port
- Starts the Flask server
- Opens the browser automatically
- Handles graceful shutdown

### `src/backend/app.py`
Flask application factory that:
- Configures the Flask app
- Registers API blueprints
- Sets up static file serving
- Configures CORS for local development

### `src/frontend/index.html`
Single-page application that:
- Loads all necessary CSS and JavaScript
- Provides the main UI structure
- Handles routing client-side

### `src/backend/services/`
Business logic services:
- **sleeper_api.py**: Handles all Sleeper API interactions
- **rankings_service.py**: Manages player rankings and format detection
- **draft_service.py**: Processes draft data and filters players

## 🔧 Build Process

### Development Mode
```bash
python main.py
```
- Runs Flask in debug mode
- Serves files from `src/frontend/`
- Hot reload for backend changes

### Production Build
```bash
python scripts/build.py
```
- Creates single executable with PyInstaller
- Embeds all static files
- Optimizes for size and startup time

## 📦 Dependencies

### Runtime (Embedded)
- **Flask**: Web server and API framework
- **requests**: HTTP client for external APIs
- **pandas**: Data processing (if needed)

### Build-time Only
- **PyInstaller**: Creates single executable
- **pytest**: Testing framework

## 🎨 Frontend Architecture

### No Framework Approach
We deliberately chose vanilla JavaScript because:
- **Zero build process**: No webpack, babel, or npm
- **Smaller bundle size**: No framework overhead
- **Faster startup**: No framework initialization
- **Easier debugging**: Direct browser debugging
- **Future-proof**: No framework version dependencies

### Modern JavaScript Features
- ES6 modules for code organization
- Fetch API for HTTP requests
- CSS Grid and Flexbox for layout
- Web Components for reusable UI elements

## 🔄 Data Flow

```
User Request → Flask Route → Service Layer → External API → Service Layer → JSON Response → Frontend → DOM Update
```

1. **User Interaction**: Click, form submit, etc.
2. **Frontend**: JavaScript makes fetch request to API
3. **Flask Route**: Receives request, validates input
4. **Service Layer**: Handles business logic, external API calls
5. **Response**: JSON data returned to frontend
6. **UI Update**: JavaScript updates DOM with new data

## 🧪 Testing Strategy

### Backend Testing
- Unit tests for each service
- Integration tests for API endpoints
- Mock external API calls

### Frontend Testing
- Manual testing in browser
- Automated UI tests with Playwright (optional)

### Build Testing
- Test executable on each platform
- Verify all static files are embedded
- Check startup time and memory usage

## 📈 Scalability Considerations

While this is designed as a single-user desktop application, the architecture supports:
- **Multiple users**: Flask can handle concurrent requests
- **Caching**: Service layer can cache API responses
- **Database**: Easy to add SQLite for persistent data
- **Configuration**: Environment-based configuration system

This structure provides a solid foundation for a maintainable, distributable desktop application while keeping complexity minimal.
