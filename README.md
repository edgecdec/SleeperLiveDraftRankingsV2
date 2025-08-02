# 🏈 Fantasy Football Draft Assistant V2

A single executable fantasy football draft assistant with embedded web server and real-time Sleeper API integration.

## ✨ Features

- **🎯 Single Executable**: One file, no installation required
- **🌐 Embedded Web Server**: Modern responsive web interface  
- **🔌 Zero Dependencies**: Everything bundled, works out of the box
- **📱 Cross-Platform**: Windows, macOS, and Linux support
- **⚡ Real-time Data**: Live Sleeper API integration
- **🎨 Modern UI**: Responsive design that works on all devices
- **🏈 Complete Workflow**: Username → Leagues → Drafts → Rankings

## 🚀 Quick Start

### Download & Run
1. **Download** the executable for your platform from [Releases](../../releases)
2. **Run** the executable (double-click or from terminal)
3. **Wait** ~15 seconds for startup
4. **Use** the web interface that opens automatically

### Command Line Options
```bash
./FantasyFootballDraftAssistant --help
./FantasyFootballDraftAssistant --port 8080
./FantasyFootballDraftAssistant --no-browser
./FantasyFootballDraftAssistant --debug
```

## 📦 Downloads

| Platform | File | Size | Status |
|----------|------|------|--------|
| **macOS** | `FantasyFootballDraftAssistant-v2.0.0-darwin-x64` | ~6MB | ✅ Available |
| **Windows** | `FantasyFootballDraftAssistant-v2.0.0-windows-x64.exe` | ~6MB | 🔨 Build from source |
| **Linux** | `FantasyFootballDraftAssistant-v2.0.0-linux-x64` | ~6MB | 🔨 Build from source |

## 🛠️ Building from Source

### Prerequisites
- Python 3.8+ 
- Git

### Quick Build
```bash
git clone https://github.com/edgecdec/SleeperLiveDraftRankingsV2.git
cd SleeperLiveDraftRankingsV2
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/build.py --release
```

### Platform-Specific Builds
```bash
# Windows
scripts\platform\build_windows.bat

# Linux  
chmod +x scripts/platform/build_linux.sh
./scripts/platform/build_linux.sh

# macOS
python scripts/build.py --release
```

See [BUILD_GUIDE.md](docs/BUILD_GUIDE.md) for detailed instructions.

## 🎯 What's New in V2

This is a complete rewrite from the ground up:

### Before (V1)
- Multiple Python files to manage
- Required Python installation  
- Complex setup process
- Platform-specific issues

### After (V2)
- Single executable file
- Zero dependencies
- One-click experience
- Cross-platform compatibility

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Single Executable (6MB)                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ Python + Flask Backend (Embedded)                      │
│  ✅ Static HTML/CSS/JS Files (Embedded)                    │
│  ✅ Rankings Data Files (Embedded)                         │
│  ✅ All Dependencies Bundled                               │
│  ✅ Auto Port Detection                                     │
│  ✅ Browser Auto-Launch                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Web Interface

The application provides a modern web interface with:

- **User Management**: Enter Sleeper username to load leagues
- **League Selection**: Choose from your fantasy leagues  
- **Draft Selection**: Pick active or completed drafts
- **Draft Interface**: View picks, available players, and rankings
- **Real-time Updates**: Live data from Sleeper API
- **Responsive Design**: Works on desktop, tablet, and mobile

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Application health check |
| `GET /api/info` | API information and endpoints |
| `GET /api/user/{username}` | Get user information |
| `GET /api/user/{username}/leagues` | Get user's leagues |
| `GET /api/user/{username}/leagues/{league_id}/drafts` | Get league drafts |
| `GET /api/draft/{draft_id}` | Get draft information |
| `GET /api/draft/{draft_id}/picks` | Get draft picks |
| `GET /api/league/{league_id}` | Get league information |

## 🔧 Technical Details

- **Backend**: Flask with embedded static files
- **Frontend**: Modern HTML/CSS/JavaScript
- **Build System**: PyInstaller with custom scripts
- **API Integration**: Sleeper Fantasy Football API
- **Architecture**: Modular service-based design
- **File Size**: ~6MB (includes Python interpreter)
- **Startup Time**: ~15 seconds first launch, ~3-5 seconds subsequent
- **Memory Usage**: ~50MB runtime

## 📖 Documentation

- [🏗️ Architecture Guide](docs/ARCHITECTURE.md) - System design and components
- [🔧 Build Guide](docs/BUILD_GUIDE.md) - Building executables for all platforms
- [💻 Development Guide](docs/DEVELOPMENT_GUIDE.md) - Contributing and development setup
- [📡 API Reference](docs/API_REFERENCE.md) - Complete API documentation
- [📁 Project Structure](docs/PROJECT_STRUCTURE.md) - Codebase organization

## 🐛 Known Issues

- **Startup Time**: First launch takes ~15 seconds (normal for PyInstaller)
- **File Size**: ~6MB (includes Python interpreter and all dependencies)
- **Antivirus**: Some antivirus software may flag the executable (false positive)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) for detailed contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Sleeper](https://sleeper.app/) for the excellent fantasy football API
- [PyInstaller](https://pyinstaller.org/) for making single-file executables possible
- [Flask](https://flask.palletsprojects.com/) for the lightweight web framework
- The fantasy football community for inspiration and feedback

## 📊 Project Stats

- **Language**: Python 3.9+
- **Framework**: Flask
- **Build Tool**: PyInstaller  
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **API**: Sleeper Fantasy Football API
- **Platforms**: Windows, macOS, Linux
- **License**: MIT

---

**Ready to dominate your fantasy draft? Download the executable and get started in seconds!** 🏆
