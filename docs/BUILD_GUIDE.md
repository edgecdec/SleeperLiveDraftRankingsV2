# Build Guide

This guide covers how to build the Fantasy Football Draft Assistant V2 into a single executable for distribution across Windows, macOS, and Linux.

## 🎯 Build Goals

Our build process creates:
- **Single executable file** - No installation required
- **Zero dependencies** - Everything bundled
- **Cross-platform** - Windows, macOS, Linux
- **Small size** - Optimized for distribution (~6MB)
- **Fast startup** - Quick launch time

## 🛠️ Build Tools

### Primary: PyInstaller
We use PyInstaller because it:
- Creates true single-file executables
- Handles Python dependencies automatically
- Supports all major platforms
- Has excellent Flask support
- Can embed static files

**Important**: PyInstaller can only build for the current platform. You need to build on each target platform separately.

## 📋 Prerequisites

### All Platforms
- Python 3.8+ (3.9+ recommended)
- Git (to clone the repository)
- Internet connection (for downloading dependencies)

### Platform-Specific Requirements

#### Windows
- Windows 10+ (recommended)
- Python from [python.org](https://python.org) (not Microsoft Store version)
- Git for Windows

#### macOS
- macOS 10.15+ (recommended)
- Xcode Command Line Tools: `xcode-select --install`
- Homebrew (optional): `brew install python3`

#### Linux
- Ubuntu 20.04+, CentOS 8+, or equivalent
- Build essentials: `sudo apt-get install build-essential` (Ubuntu/Debian)
- Python 3.8+: `sudo apt-get install python3 python3-pip python3-venv`

## 🏗️ Build Process

### Quick Build (Any Platform)

```bash
# Clone the repository
git clone <repository-url>
cd SleeperLiveDraftRankingsV2

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Build executable
python scripts/build.py --release
```

### Platform-Specific Build Scripts

#### Windows
```batch
# Use the provided Windows build script
scripts\platform\build_windows.bat
```

#### Linux
```bash
# Use the provided Linux build script
chmod +x scripts/platform/build_linux.sh
./scripts/platform/build_linux.sh
```

#### macOS
```bash
# Use the main build script
python scripts/build.py --release
```

## 📦 Build Output

After building, you'll find in the `dist/` directory:

### Files Created
- `FantasyFootballDraftAssistant` (or `.exe` on Windows) - Main executable
- `FantasyFootballDraftAssistant-v2.0.0-{platform}-{arch}` - Release-named executable
- `release_info_{platform}-{arch}.txt` - Build information

### Platform Naming Convention
- **Windows**: `FantasyFootballDraftAssistant-v2.0.0-windows-x64.exe`
- **macOS**: `FantasyFootballDraftAssistant-v2.0.0-darwin-x64`
- **Linux**: `FantasyFootballDraftAssistant-v2.0.0-linux-x64`

## 🧪 Testing Builds

### Automated Testing
```bash
# Test during build (included by default)
python scripts/build.py --release

# Manual test after build
./dist/FantasyFootballDraftAssistant --help
```

### Manual Testing Checklist
- [ ] Executable starts without errors
- [ ] Help message displays correctly
- [ ] Web server starts on specified port
- [ ] Browser opens automatically (when not using --no-browser)
- [ ] All API endpoints respond correctly
- [ ] Static files (HTML/CSS/JS) load properly
- [ ] Sleeper API integration works
- [ ] Application shuts down cleanly

### Web Interface Testing
```bash
# Start the application
./dist/FantasyFootballDraftAssistant --no-browser --port 5000 &

# Wait for startup (15 seconds)
sleep 15

# Test endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/info
curl http://localhost:5000/

# Stop application
pkill FantasyFootballDraftAssistant
```

## 🚀 Distribution

### File Preparation
1. **Build on each target platform**
2. **Test thoroughly on each platform**
3. **Create checksums for verification**
4. **Package for distribution**

### Creating Checksums
```bash
# Windows (PowerShell)
Get-FileHash FantasyFootballDraftAssistant-v2.0.0-windows-x64.exe -Algorithm SHA256

# macOS/Linux
sha256sum FantasyFootballDraftAssistant-v2.0.0-darwin-x64
sha256sum FantasyFootballDraftAssistant-v2.0.0-linux-x64
```

### GitHub Releases
```bash
# Create release with GitHub CLI
gh release create v2.0.0 \
  --title "Fantasy Football Draft Assistant v2.0.0" \
  --notes "Single executable release for Windows, macOS, and Linux" \
  dist/FantasyFootballDraftAssistant-v2.0.0-*
```

## 🔧 Build Options

### Available Build Flags
```bash
python scripts/build.py --help

Options:
  --debug          Build with debug info and console window
  --icon PATH      Path to icon file
  --no-clean       Skip cleaning build directories
  --no-optimize    Skip post-build optimizations
  --no-test        Skip testing the built executable
  --release        Create platform-specific release file
```

### Debug Builds
```bash
# Build with debug information
python scripts/build.py --debug --release

# Useful for troubleshooting build issues
# Shows console window and detailed error messages
```

### Production Builds
```bash
# Optimized production build
python scripts/build.py --release

# No console window, optimized for distribution
```

## 🐛 Troubleshooting

### Common Build Issues

#### Missing Dependencies
```bash
# Error: ModuleNotFoundError during build
# Solution: Add to hiddenimports in build.py
```

#### Large File Size
```bash
# Install UPX for compression (optional)
# Windows: Download from https://upx.github.io/
# macOS: brew install upx
# Linux: sudo apt-get install upx-ucl

# UPX will be used automatically if available
```

#### Slow Startup
```bash
# Normal for PyInstaller executables
# First startup: ~15 seconds (extracting files)
# Subsequent startups: ~3-5 seconds
```

#### Permission Issues (Linux/macOS)
```bash
# Make executable
chmod +x dist/FantasyFootballDraftAssistant

# If still issues, check file permissions
ls -la dist/
```

### Platform-Specific Issues

#### Windows
- **Antivirus false positives**: Submit to antivirus vendors for whitelisting
- **DLL issues**: Ensure Visual C++ redistributables are available
- **Console window**: Use `--debug` flag only for debugging

#### macOS
- **Gatekeeper warnings**: Right-click → Open, or use `xattr -d com.apple.quarantine`
- **Permission issues**: Ensure executable permissions are set
- **Code signing**: Required for distribution outside development

#### Linux
- **Missing libraries**: Install build-essential and python3-dev
- **Permission issues**: Ensure executable permissions
- **Distribution**: Consider creating AppImage for better compatibility

## 📊 Build Performance

### Typical Build Times
- **Windows**: 2-3 minutes
- **macOS**: 2-3 minutes  
- **Linux**: 2-4 minutes (depending on system)

### File Sizes
- **All platforms**: ~6MB (compressed with UPX: ~4MB)
- **Startup time**: 15 seconds first run, 3-5 seconds subsequent runs
- **Memory usage**: ~50MB runtime

## 🔄 Continuous Integration

### GitHub Actions (Future)
```yaml
# .github/workflows/build.yml
name: Build Executables
on: [push, release]
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: pip install -r requirements.txt
      - run: python scripts/build.py --release
      - uses: actions/upload-artifact@v3
        with:
          name: executables
          path: dist/FantasyFootballDraftAssistant-*
```

## 📝 Release Checklist

- [ ] Build on all target platforms (Windows, macOS, Linux)
- [ ] Test each executable thoroughly
- [ ] Verify all API endpoints work
- [ ] Test web interface functionality
- [ ] Create checksums for all executables
- [ ] Update version numbers
- [ ] Create GitHub release
- [ ] Upload all platform executables
- [ ] Update documentation
- [ ] Announce release

This build guide ensures you can create reliable, distributable executables for all major platforms while maintaining consistent functionality and user experience.
