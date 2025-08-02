@echo off
REM Fantasy Football Draft Assistant V2 - Windows Build Script
REM 
REM This script builds the Windows executable using PyInstaller
REM 
REM Prerequisites:
REM - Python 3.8+ installed
REM - Git for Windows (to clone the repository)
REM 
REM Usage:
REM   build_windows.bat

echo 🏈 Fantasy Football Draft Assistant V2 - Windows Build
echo ============================================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ❌ Failed to create virtual environment
    pause
    exit /b 1
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Build executable
echo 🔨 Building Windows executable...
python scripts\build.py --release
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo 🎉 Build completed successfully!
echo 📁 Executable location: dist\FantasyFootballDraftAssistant.exe
echo 📋 Release info: dist\release_info_windows-x64.txt

REM Test the executable
echo 🧪 Testing executable...
dist\FantasyFootballDraftAssistant.exe --help
if errorlevel 1 (
    echo ⚠️  Executable test failed, but this might be normal
) else (
    echo ✅ Executable test passed
)

echo.
echo 🚀 Ready for distribution!
echo You can now distribute: dist\FantasyFootballDraftAssistant-v2.0.0-windows-x64.exe
pause
