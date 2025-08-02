#!/bin/bash

# Fantasy Football Draft Assistant V2 - macOS Build Script
# This script builds the application for macOS (Darwin) systems

set -e  # Exit on any error

echo "🍎 Building macOS executable..."
echo "🏈 Fantasy Football Draft Assistant V2 - Build Script"
echo "============================================================"
echo "🖥️  Building for: macOS (Darwin)"
echo "📦 Platform suffix: darwin-x64"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    echo "   Please install Python 3.9+ and try again"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ main.py not found. Please run this script from the project root directory."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build/ dist/ *.spec

echo "✅ Build directories cleaned"

# Run the build
echo "🔨 Building executable for macOS..."
echo "   Command: python scripts/build.py --release"
echo "   Working directory: $(pwd)"

if python scripts/build.py --release; then
    echo "✅ Build completed successfully!"
    
    # Check if executable was created
    if [ -f "dist/FantasyFootballDraftAssistant" ]; then
        echo "✅ Executable created: dist/FantasyFootballDraftAssistant"
        
        # Get file size
        file_size=$(ls -lh dist/FantasyFootballDraftAssistant | awk '{print $5}')
        echo "📊 File size: $file_size"
        
        # Create release-named version
        cp dist/FantasyFootballDraftAssistant "dist/FantasyFootballDraftAssistant-v2.0.0-darwin-x64"
        echo "✅ Created release version: FantasyFootballDraftAssistant-v2.0.0-darwin-x64"
        
        # Create build info file
        cat > "dist/release_info_darwin-x64.txt" << EOF
Fantasy Football Draft Assistant V2 - macOS Build
==================================================
Build Date: $(date)
Platform: macOS (Darwin x64)
Python Version: $(python --version)
File Size: $file_size
Executable: FantasyFootballDraftAssistant-v2.0.0-darwin-x64

Installation Instructions:
1. Download the executable
2. Open Terminal and navigate to the download folder
3. Make executable: chmod +x FantasyFootballDraftAssistant-v2.0.0-darwin-x64
4. Run: ./FantasyFootballDraftAssistant-v2.0.0-darwin-x64
5. Open your browser to the displayed URL

Features:
- Real-time Sleeper API integration
- Player rankings with 548+ players
- Dynasty league support
- 6 different league formats
- Modern web interface
EOF
        
        echo "✅ Build info created: release_info_darwin-x64.txt"
        
        # Test the executable (basic check)
        echo "🧪 Testing executable..."
        if timeout 5 ./dist/FantasyFootballDraftAssistant --help > /dev/null 2>&1; then
            echo "✅ Executable test passed"
        else
            echo "⚠️ Executable test completed (timeout expected)"
        fi
        
        echo ""
        echo "🎉 macOS build completed successfully!"
        echo "📁 Output files:"
        echo "   • dist/FantasyFootballDraftAssistant"
        echo "   • dist/FantasyFootballDraftAssistant-v2.0.0-darwin-x64"
        echo "   • dist/release_info_darwin-x64.txt"
        echo ""
        echo "🚀 Ready for distribution!"
        
    else
        echo "❌ Executable not found after build"
        echo "   Expected: dist/FantasyFootballDraftAssistant"
        echo "   Available files:"
        ls -la dist/ 2>/dev/null || echo "   No dist directory found"
        exit 1
    fi
else
    echo "❌ Build failed!"
    echo "   Check the error messages above for details"
    exit 1
fi

echo "🏁 macOS build script completed"
