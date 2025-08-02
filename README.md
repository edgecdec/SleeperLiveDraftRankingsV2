# Fantasy Football Draft Assistant V2

A simple, single-executable fantasy football draft assistant that runs locally with zero dependencies.

## 🎯 Design Philosophy

This application follows the **"Single Executable, Zero Dependencies"** principle:
- One file to distribute
- No installation required
- Works on Windows, macOS, and Linux
- Opens automatically in browser
- All dependencies bundled

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Single EXE    │───▶│  Embedded Flask  │───▶│  Static Files   │
│                 │    │     Backend      │    │   (HTML/CSS/JS) │
│  - Auto-launch  │    │                  │    │                 │
│  - Port finder  │    │  - API Routes    │    │  - Vanilla JS   │
│  - Browser open │    │  - Business Logic│    │  - No frameworks│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### For Users
1. Download the executable for your platform
2. Double-click to run
3. Browser opens automatically to the app

### For Developers
```bash
# Clone and setup
git clone <repository-url>
cd SleeperLiveDraftRankingsV2

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
# OR use the dev script
python scripts/dev.py run
```

## 📁 Project Structure

```
SleeperLiveDraftRankingsV2/
├── 📄 main.py                    # Single entry point
├── 📄 requirements.txt           # Dependencies
├── 📁 src/                      # Source code
│   ├── 📁 backend/              # Flask backend
│   │   ├── 📄 app.py            # Flask app factory
│   │   ├── 📁 api/              # API routes (future)
│   │   ├── 📁 services/         # Business logic (future)
│   │   └── 📁 utils/            # Utilities
│   └── 📁 frontend/             # Static files
│       ├── 📄 index.html        # Main HTML
│       ├── 📄 style.css         # Styles
│       └── 📄 app.js            # JavaScript app
├── 📁 scripts/                  # Build scripts
│   ├── 📄 build.py              # Build executable
│   └── 📄 dev.py                # Development tools
└── 📁 docs/                     # Documentation
    ├── 📄 PROJECT_STRUCTURE.md  # Detailed structure
    ├── 📄 DEVELOPMENT_GUIDE.md  # Dev guidelines
    ├── 📄 BUILD_GUIDE.md        # Build instructions
    ├── 📄 ARCHITECTURE.md       # Architecture decisions
    └── 📄 API_REFERENCE.md      # API documentation
```

## 🔧 Development Commands

```bash
# Development server
python scripts/dev.py run [--port 8080] [--no-browser]

# Install dependencies
python scripts/dev.py install [--dev]

# Check project info
python scripts/dev.py info

# Build executable
python scripts/build.py [--debug] [--icon path/to/icon.ico]

# Run tests (when implemented)
python scripts/dev.py test
```

## 🎨 Technology Stack

### Backend
- **Python 3.8+**: Core runtime
- **Flask**: Web framework and API server
- **Requests**: HTTP client for external APIs
- **PyInstaller**: Single executable creation

### Frontend
- **Vanilla JavaScript**: No frameworks, modern ES6+
- **CSS Grid/Flexbox**: Responsive layout
- **Fetch API**: HTTP requests to backend

### Build Tools
- **PyInstaller**: Primary build tool
- **UPX**: Executable compression (optional)

## 🌟 Key Features

### Current (v2.0.0)
- ✅ Single executable distribution
- ✅ Auto port detection and browser launch
- ✅ Modern responsive UI
- ✅ Health check and API info endpoints
- ✅ Cross-platform support (Windows/macOS/Linux)
- ✅ Zero external dependencies for users

### Planned
- 🔄 Sleeper API integration
- 🔄 Player rankings management
- 🔄 Draft tracking and filtering
- 🔄 League format auto-detection
- 🔄 Real-time draft updates

## 📖 Documentation

- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - Detailed code organization
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Coding standards and practices
- **[Build Guide](docs/BUILD_GUIDE.md)** - How to build executables
- **[Architecture](docs/ARCHITECTURE.md)** - Design decisions and patterns
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation

## 🧪 Testing

The application includes comprehensive testing:

```bash
# Check if everything is working
python scripts/dev.py info

# Run the application
python main.py --no-browser

# Test API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/info
```

## 🔨 Building

Create a single executable for distribution:

```bash
# Build for current platform
python scripts/build.py

# Build with debug info
python scripts/build.py --debug

# Build with custom icon
python scripts/build.py --icon assets/icon.ico

# Output will be in dist/
```

## 🎯 Design Principles

1. **Simplicity First**: Minimal dependencies, clear code structure
2. **Single Executable**: One file distribution, no installation
3. **Cross-Platform**: Works on Windows, macOS, and Linux
4. **Modern Web Tech**: Vanilla JS, CSS Grid, ES6+ features
5. **Developer Friendly**: Clear documentation, easy to extend
6. **Performance**: Fast startup, low memory usage

## 🤝 Contributing

1. Read the [Development Guide](docs/DEVELOPMENT_GUIDE.md)
2. Follow the coding standards
3. Add tests for new features
4. Update documentation
5. Submit pull requests

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` folder
- **Issues**: Create GitHub issues for bugs
- **Development**: See [Development Guide](docs/DEVELOPMENT_GUIDE.md)

---

**🏈 Ready to build your fantasy football draft assistant? Start with `python main.py` and begin developing!**
