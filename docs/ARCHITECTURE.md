# Architecture Documentation

This document explains the architectural decisions, design patterns, and technical choices for the Fantasy Football Draft Assistant V2.

## 🎯 Design Goals

### Primary Goals
1. **Single Executable Distribution** - One file, no installation
2. **Zero Dependencies** - Everything bundled, works offline
3. **Cross-Platform** - Windows, macOS, Linux support
4. **Fast Startup** - Quick launch and response times
5. **Simple Maintenance** - Easy to understand and modify

### Secondary Goals
1. **Small File Size** - Reasonable download size (<100MB)
2. **Low Memory Usage** - Efficient resource utilization
3. **Responsive UI** - Smooth user experience
4. **Extensible** - Easy to add new features

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Single Executable                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Main.py   │  │    Flask     │  │   Static Files      │ │
│  │             │  │   Backend    │  │   (HTML/CSS/JS)     │ │
│  │ - Port Find │  │              │  │                     │ │
│  │ - Browser   │  │ - API Routes │  │ - Embedded in EXE   │ │
│  │ - Lifecycle │  │ - Services   │  │ - Served by Flask   │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Web Browser   │
                    │                 │
                    │ - User Interface│
                    │ - API Calls     │
                    │ - State Mgmt    │
                    └─────────────────┘
```

## 🔧 Technical Stack

### Backend
- **Python 3.8+**: Core runtime
- **Flask**: Web framework and API server
- **Requests**: HTTP client for external APIs
- **PyInstaller**: Single executable creation

### Frontend
- **Vanilla JavaScript**: No frameworks, modern ES6+
- **CSS Grid/Flexbox**: Responsive layout
- **Fetch API**: HTTP requests to backend
- **Web Components**: Reusable UI elements (optional)

### Build Tools
- **PyInstaller**: Primary build tool
- **UPX**: Executable compression (optional)
- **GitHub Actions**: CI/CD (future)

## 📦 Component Architecture

### 1. Application Entry Point (`main.py`)

```python
"""
Single entry point that orchestrates the entire application.
Responsibilities:
- Find available port
- Start Flask server
- Open browser
- Handle shutdown
"""

def main():
    port = find_available_port()
    app = create_flask_app()
    
    # Start browser in separate thread
    threading.Timer(1.0, lambda: webbrowser.open(f'http://localhost:{port}')).start()
    
    # Start Flask server
    app.run(host='localhost', port=port, debug=False)
```

### 2. Flask Application (`src/backend/app.py`)

```python
"""
Flask application factory with embedded static file serving.
Responsibilities:
- Configure Flask app
- Register API blueprints
- Serve embedded static files
- Handle CORS for local development
"""

def create_app():
    app = Flask(__name__)
    
    # Register API blueprints
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(draft_bp, url_prefix='/api')
    app.register_blueprint(rankings_bp, url_prefix='/api')
    
    # Serve static files from embedded location
    @app.route('/')
    def serve_index():
        return send_from_directory(get_static_path(), 'index.html')
    
    return app
```

### 3. Service Layer (`src/backend/services/`)

```python
"""
Business logic services that handle external APIs and data processing.
Each service has a single responsibility and clear interface.
"""

class SleeperAPI:
    """Handles all Sleeper API interactions"""
    
class RankingsService:
    """Manages player rankings and format detection"""
    
class DraftService:
    """Processes draft data and filters players"""
```

### 4. API Routes (`src/backend/api/`)

```python
"""
Thin route handlers that delegate to services.
Responsibilities:
- Request validation
- Service orchestration
- Response formatting
- Error handling
"""

@draft_bp.route('/draft/<draft_id>')
def get_draft_data(draft_id):
    try:
        data = draft_service.get_draft_data(draft_id)
        return jsonify(data)
    except ServiceError as e:
        return jsonify({'error': str(e)}), 500
```

### 5. Frontend Application (`src/frontend/`)

```javascript
/**
 * Single-page application using vanilla JavaScript.
 * Responsibilities:
 * - User interface rendering
 * - API communication
 * - Client-side routing
 * - State management
 */

class DraftApp {
    constructor() {
        this.state = new AppState();
        this.api = new APIClient();
        this.router = new Router();
    }
    
    async init() {
        await this.loadInitialData();
        this.setupEventListeners();
        this.render();
    }
}
```

## 🔄 Data Flow

### Request Flow
```
User Action → Frontend JS → Fetch API → Flask Route → Service Layer → External API
                                                                            │
User Interface ← Frontend JS ← JSON Response ← Flask Route ← Service Layer ←┘
```

### Detailed Flow Example
1. **User clicks "Load Draft"**
2. **Frontend**: `loadDraft(draftId)` function called
3. **API Call**: `fetch('/api/draft/123456')`
4. **Flask Route**: `/api/draft/<draft_id>` receives request
5. **Service**: `draft_service.get_draft_data(draft_id)` called
6. **External API**: Multiple calls to Sleeper API
7. **Data Processing**: Filter players, apply rankings
8. **Response**: JSON data returned to frontend
9. **UI Update**: DOM updated with new player data

## 🎨 Frontend Architecture

### No-Framework Approach
We deliberately chose vanilla JavaScript for several reasons:

#### Benefits
- **Zero Build Process**: No webpack, babel, or npm required
- **Smaller Bundle**: No framework overhead (~50KB vs 500KB+)
- **Faster Startup**: No framework initialization
- **Direct Debugging**: Browser dev tools work perfectly
- **Future Proof**: No framework version dependencies
- **Learning**: Better understanding of web fundamentals

#### Modern JavaScript Features Used
```javascript
// ES6 Modules
import { APIClient } from './api-client.js';

// Async/Await
async function loadDraftData(draftId) {
    try {
        const response = await fetch(`/api/draft/${draftId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to load draft:', error);
        throw error;
    }
}

// Destructuring
const { available_players, positions, total_available } = draftData;

// Template Literals
const html = `
    <div class="player-card">
        <h3>${player.name}</h3>
        <span class="position">${player.position}</span>
        <span class="rank">#${player.rank}</span>
    </div>
`;

// Arrow Functions
const sortByRank = (a, b) => a.rank - b.rank;
```

### State Management
```javascript
/**
 * Simple state management without external libraries
 */
class AppState {
    constructor() {
        this.data = {
            currentDraft: null,
            availablePlayers: [],
            selectedFormat: null,
            loading: false
        };
        this.listeners = [];
    }
    
    setState(updates) {
        this.data = { ...this.data, ...updates };
        this.notifyListeners();
    }
    
    subscribe(listener) {
        this.listeners.push(listener);
    }
    
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.data));
    }
}
```

### Component Pattern
```javascript
/**
 * Reusable component pattern without frameworks
 */
class PlayerCard {
    constructor(player, container) {
        this.player = player;
        this.container = container;
        this.element = null;
    }
    
    render() {
        this.element = document.createElement('div');
        this.element.className = 'player-card';
        this.element.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.container.appendChild(this.element);
        return this.element;
    }
    
    getHTML() {
        return `
            <div class="player-info">
                <h3>${this.player.name}</h3>
                <span class="position">${this.player.position}</span>
                <span class="team">${this.player.team}</span>
            </div>
            <div class="player-stats">
                <span class="rank">#${this.player.rank}</span>
                <span class="tier">Tier ${this.player.tier}</span>
            </div>
        `;
    }
    
    attachEventListeners() {
        this.element.addEventListener('click', () => {
            this.onPlayerClick(this.player);
        });
    }
}
```

## 🔐 Security Considerations

### Local Application Security
Since this runs locally, security concerns are different from web applications:

#### What We Don't Need
- **Authentication**: Single user, local access
- **CSRF Protection**: No cross-site requests
- **SQL Injection**: No database queries
- **XSS Protection**: Trusted local content

#### What We Do Need
- **Input Validation**: Validate API responses
- **Error Handling**: Don't expose internal errors
- **Resource Limits**: Prevent memory/CPU abuse
- **Safe File Handling**: Validate embedded files

```python
# Input validation example
def validate_draft_id(draft_id: str) -> bool:
    """Validate draft ID format"""
    if not isinstance(draft_id, str):
        return False
    if len(draft_id) < 10 or len(draft_id) > 20:
        return False
    if not draft_id.isdigit():
        return False
    return True

# Safe error handling
@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Unhandled error: {error}")
    return jsonify({'error': 'Internal server error'}), 500
```

## 📊 Performance Considerations

### Startup Performance
```python
# Lazy imports to reduce startup time
def get_pandas():
    """Import pandas only when needed"""
    import pandas as pd
    return pd

# Minimize main.py imports
import os
import sys
import threading
import webbrowser
from src.backend.app import create_app  # Heavy imports in submodules
```

### Memory Management
```python
# Use generators for large datasets
def get_available_players(all_players, drafted_players):
    """Generator to avoid loading all players in memory"""
    for player in all_players:
        if not is_drafted(player, drafted_players):
            yield player

# Clear caches periodically
import gc
from functools import lru_cache

@lru_cache(maxsize=100)
def get_league_info(league_id):
    """Cache league info with size limit"""
    return fetch_league_info(league_id)

# Periodic cleanup
def cleanup_caches():
    get_league_info.cache_clear()
    gc.collect()
```

### Network Performance
```python
# Connection pooling
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class SleeperAPI:
    def __init__(self):
        self.session = requests.Session()
        
        # Configure retries
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    def make_request(self, url):
        return self.session.get(url, timeout=10)
```

## 🧪 Testing Strategy

### Testing Pyramid
```
    ┌─────────────────┐
    │   E2E Tests     │  ← Few, high-value tests
    │   (Manual)      │
    ├─────────────────┤
    │ Integration     │  ← API endpoint tests
    │ Tests           │
    ├─────────────────┤
    │   Unit Tests    │  ← Many, fast tests
    │   (Services)    │
    └─────────────────┘
```

### Test Categories
1. **Unit Tests**: Service layer methods
2. **Integration Tests**: API endpoints
3. **Build Tests**: Executable functionality
4. **Manual Tests**: User interface

## 🚀 Deployment Architecture

### Build Process
```
Source Code → PyInstaller → Single Executable → Distribution
     │              │              │                  │
     ├─ Python      ├─ Bundle      ├─ Platform       ├─ GitHub
     ├─ Static      ├─ Compress    ├─ Specific       ├─ Releases
     └─ Data        └─ Optimize    └─ Tested         └─ Downloads
```

### Distribution Strategy
1. **GitHub Releases**: Primary distribution method
2. **Direct Download**: Simple HTTP download
3. **Checksums**: Verify file integrity
4. **Multiple Platforms**: Windows, macOS, Linux builds

## 🔮 Future Considerations

### Scalability
While designed for single-user desktop use, the architecture supports:
- **Multi-user**: Flask handles concurrent requests
- **Database**: Easy to add SQLite for persistence
- **Caching**: Redis or in-memory caching
- **Configuration**: Environment-based settings

### Technology Evolution
- **Python 4.0**: Architecture is version-agnostic
- **WebAssembly**: Could compile Python to WASM
- **Progressive Web App**: Easy conversion to PWA
- **Native Mobile**: React Native or Flutter wrapper

### Feature Extensions
- **Plugin System**: Dynamic module loading
- **Custom Rankings**: User-defined ranking algorithms
- **League Integration**: Multiple platform support
- **Advanced Analytics**: Statistical analysis features

This architecture provides a solid foundation for a maintainable, distributable desktop application while keeping complexity minimal and performance optimal.
