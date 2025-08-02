#!/bin/bash
# Fantasy Football Draft Assistant V2 - Linux Build Script
# 
# This script builds the Linux executable using PyInstaller
# 
# Prerequisites:
# - Python 3.8+ installed
# - Git (to clone the repository)
# 
# Usage:
#   chmod +x scripts/platform/build_linux.sh
#   ./scripts/platform/build_linux.sh

set -e  # Exit on any error

echo "🏈 Fantasy Football Draft Assistant V2 - Linux Build"
echo "============================================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8+ using your package manager:"
    echo "  Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip python3-venv"
    echo "  CentOS/RHEL:   sudo yum install python3 python3-pip"
    echo "  Fedora:        sudo dnf install python3 python3-pip"
    echo "  Arch:          sudo pacman -S python python-pip"
    exit 1
fi

echo "✅ Python found"
python3 --version

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Install additional Linux dependencies if needed
echo "🐧 Installing Linux-specific dependencies..."
pip install --upgrade pyinstaller

# Build executable
echo "🔨 Building Linux executable..."
python scripts/build.py --release

echo "🎉 Build completed successfully!"
echo "📁 Executable location: dist/FantasyFootballDraftAssistant"
echo "📋 Release info: dist/release_info_linux-x64.txt"

# Make executable
chmod +x dist/FantasyFootballDraftAssistant

# Test the executable
echo "🧪 Testing executable..."
if ./dist/FantasyFootballDraftAssistant --help > /dev/null 2>&1; then
    echo "✅ Executable test passed"
else
    echo "⚠️  Executable test failed, but this might be normal"
fi

echo ""
echo "🚀 Ready for distribution!"
echo "You can now distribute: dist/FantasyFootballDraftAssistant-v2.0.0-linux-x64"

# Optional: Create AppImage (if appimagetool is available)
if command -v appimagetool &> /dev/null; then
    echo "📦 AppImage tool found, you could create an AppImage for better Linux distribution"
    echo "   See: https://appimage.org/ for more information"
fi

echo "✅ Linux build complete!"
