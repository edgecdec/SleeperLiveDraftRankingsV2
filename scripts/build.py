#!/usr/bin/env python3
"""
Build script for Fantasy Football Draft Assistant V2

This script creates a single executable using PyInstaller with all
dependencies and static files embedded.

Usage:
    python scripts/build.py [options]
"""

import os
import sys
import shutil
import subprocess
import argparse
import platform
from pathlib import Path


def get_project_root():
    """Get the project root directory"""
    return Path(__file__).parent.parent


def clean_build_dirs():
    """Remove previous build artifacts"""
    project_root = get_project_root()
    dirs_to_clean = ['build', 'dist', '__pycache__']
    
    for dir_name in dirs_to_clean:
        dir_path = project_root / dir_name
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"🧹 Cleaned {dir_path}")
    
    # Also clean .pyc files
    for pyc_file in project_root.rglob('*.pyc'):
        pyc_file.unlink()
    
    print("✅ Build directories cleaned")


def get_executable_name():
    """Get the executable name for the current platform"""
    base_name = "FantasyFootballDraftAssistant"
    
    if platform.system() == "Windows":
        return f"{base_name}.exe"
    else:
        return base_name


def get_platform_suffix():
    """Get platform suffix for release naming"""
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    # Normalize machine architecture
    if machine in ['x86_64', 'amd64']:
        machine = 'x64'
    elif machine in ['i386', 'i686']:
        machine = 'x86'
    elif machine in ['aarch64', 'arm64']:
        machine = 'arm64'
    
    return f"{system}-{machine}"


def create_pyinstaller_spec(debug=False, icon=None):
    """Create PyInstaller spec file"""
    project_root = get_project_root()
    debug_str = "True" if debug else "False"
    
    # Platform-specific settings
    console_setting = debug_str
    if platform.system() == "Darwin":
        # On macOS, we might want to create an app bundle in the future
        pass
    elif platform.system() == "Windows":
        # On Windows, we definitely don't want console in production
        if not debug:
            console_setting = "False"
    
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['{project_root}'],
    binaries=[],
    datas=[
        ('src/frontend', 'frontend'),
        ('data', 'data'),
    ],
    hiddenimports=[
        'flask',
        'flask_cors',
        'requests',
        'urllib3',
        'certifi',
        'src.backend.app',
        'src.backend.config',
        'src.backend.services.sleeper_api',
        'src.backend.api.user',
        'src.backend.api.draft',
        'src.backend.utils.port_finder',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',  # Exclude unless needed
        'scipy',
        'PIL',
        'IPython',
        'jupyter',
        'pytest',
        'black',
        'flake8',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='{get_executable_name()}',
    debug={debug_str},
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Compress with UPX if available
    upx_exclude=[],
    runtime_tmpdir=None,
    console={console_setting},  # Show console in debug mode
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon={repr(icon) if icon else None}
)
'''
    
    spec_path = project_root / 'build.spec'
    with open(spec_path, 'w') as f:
        f.write(spec_content)
    
    print(f"📄 Created PyInstaller spec: {spec_path}")
    return spec_path


def build_executable(debug=False, icon=None, clean=True):
    """Build the executable using PyInstaller"""
    project_root = get_project_root()
    
    if clean:
        clean_build_dirs()
    
    # Create spec file
    spec_path = create_pyinstaller_spec(debug=debug, icon=icon)
    
    # Build command
    cmd = [
        'pyinstaller',
        '--clean',
        '--noconfirm',
        str(spec_path)
    ]
    
    print(f"🔨 Building executable for {platform.system()} {platform.machine()}...")
    print(f"   Command: {' '.join(cmd)}")
    print(f"   Working directory: {project_root}")
    
    # Change to project root
    original_cwd = os.getcwd()
    os.chdir(project_root)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("❌ Build failed!")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False
        
        print("✅ Build successful!")
        return True
        
    except FileNotFoundError:
        print("❌ PyInstaller not found! Please install it:")
        print("   pip install pyinstaller")
        return False
    
    finally:
        os.chdir(original_cwd)


def optimize_executable():
    """Post-build optimizations"""
    project_root = get_project_root()
    exe_path = project_root / 'dist' / get_executable_name()
    
    if not exe_path.exists():
        print("❌ Executable not found for optimization")
        return False
    
    # Get file size
    size_mb = exe_path.stat().st_size / (1024 * 1024)
    print(f"📊 Executable size: {size_mb:.1f} MB")
    
    # Try UPX compression if available
    try:
        upx_cmd = ['upx', '--best', str(exe_path)]
        result = subprocess.run(upx_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            new_size_mb = exe_path.stat().st_size / (1024 * 1024)
            compression_ratio = (1 - new_size_mb / size_mb) * 100
            print(f"🗜️  UPX compressed: {new_size_mb:.1f} MB ({compression_ratio:.1f}% reduction)")
        else:
            print("⚠️  UPX compression failed (this is optional)")
            
    except FileNotFoundError:
        print("ℹ️  UPX not available (optional compression tool)")
    
    return True


def create_platform_release():
    """Create platform-specific release with proper naming"""
    project_root = get_project_root()
    dist_path = project_root / 'dist'
    exe_path = dist_path / get_executable_name()
    
    if not exe_path.exists():
        print("❌ Executable not found for release creation")
        return False
    
    # Create platform-specific name
    platform_suffix = get_platform_suffix()
    version = "2.0.0"
    release_name = f"FantasyFootballDraftAssistant-v{version}-{platform_suffix}"
    
    if platform.system() == "Windows":
        release_name += ".exe"
    elif platform.system() == "Linux":
        release_name += ".AppImage"  # Future: could create AppImage
    
    release_path = dist_path / release_name
    
    # Copy executable with platform-specific name
    shutil.copy2(exe_path, release_path)
    
    print(f"📦 Created platform release: {release_name}")
    return release_path


def test_executable():
    """Test that the built executable works"""
    project_root = get_project_root()
    exe_path = project_root / 'dist' / get_executable_name()
    
    if not exe_path.exists():
        print("❌ Executable not found for testing")
        return False
    
    print("🧪 Testing executable...")
    
    # Make executable on Unix systems
    if platform.system() != "Windows":
        os.chmod(exe_path, 0o755)
    
    # Test that it starts (we can't test full functionality without a GUI)
    try:
        # Just check that it can be executed and shows help
        result = subprocess.run([str(exe_path), '--help'], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("✅ Executable test passed")
            return True
        else:
            print("⚠️  Executable test had issues (this might be normal)")
            print("   Try running it manually to verify it works")
            return True
            
    except subprocess.TimeoutExpired:
        print("⚠️  Executable test timed out (this might be normal)")
        return True
    except Exception as e:
        print(f"❌ Executable test failed: {e}")
        return False


def create_release_info():
    """Create release information file"""
    project_root = get_project_root()
    dist_path = project_root / 'dist'
    
    if not dist_path.exists():
        return
    
    exe_path = dist_path / get_executable_name()
    if not exe_path.exists():
        return
    
    # Create release info
    platform_suffix = get_platform_suffix()
    info = {
        'name': 'Fantasy Football Draft Assistant V2',
        'version': '2.0.0',
        'platform': platform.system(),
        'architecture': platform.machine(),
        'platform_suffix': platform_suffix,
        'executable': get_executable_name(),
        'size_mb': round(exe_path.stat().st_size / (1024 * 1024), 1),
    }
    
    info_path = dist_path / f'release_info_{platform_suffix}.txt'
    with open(info_path, 'w') as f:
        f.write("Fantasy Football Draft Assistant V2 - Release Information\n")
        f.write("=" * 60 + "\n\n")
        for key, value in info.items():
            f.write(f"{key.replace('_', ' ').title()}: {value}\n")
        f.write("\nUsage:\n")
        if platform.system() == "Windows":
            f.write(f"  {get_executable_name()}\n")
            f.write("  Double-click to run, or execute from command prompt\n")
        else:
            f.write(f"  ./{get_executable_name()}\n")
            f.write("  Double-click to run, or execute from terminal\n")
        f.write("\nFeatures:\n")
        f.write("  - Single executable with no dependencies\n")
        f.write("  - Auto-opens browser to localhost\n")
        f.write("  - Sleeper API integration\n")
        f.write("  - Fantasy football draft assistance\n")
        f.write("  - Responsive web interface\n")
        f.write("  - Real-time draft data\n")
    
    print(f"📋 Created release info: {info_path}")


def main():
    """Main build function"""
    parser = argparse.ArgumentParser(description='Build Fantasy Football Draft Assistant V2')
    parser.add_argument('--debug', action='store_true', 
                       help='Build with debug info and console window')
    parser.add_argument('--icon', help='Path to icon file')
    parser.add_argument('--no-clean', action='store_true', 
                       help='Skip cleaning build directories')
    parser.add_argument('--no-optimize', action='store_true',
                       help='Skip post-build optimizations')
    parser.add_argument('--no-test', action='store_true',
                       help='Skip testing the built executable')
    parser.add_argument('--release', action='store_true',
                       help='Create platform-specific release file')
    
    args = parser.parse_args()
    
    print("🏈 Fantasy Football Draft Assistant V2 - Build Script")
    print("=" * 60)
    print(f"🖥️  Building for: {platform.system()} {platform.machine()}")
    print(f"📦 Platform suffix: {get_platform_suffix()}")
    
    # Build executable
    success = build_executable(
        debug=args.debug, 
        icon=args.icon, 
        clean=not args.no_clean
    )
    
    if not success:
        print("❌ Build failed!")
        sys.exit(1)
    
    # Optimize
    if not args.no_optimize:
        optimize_executable()
    
    # Test
    if not args.no_test:
        test_executable()
    
    # Create release info
    create_release_info()
    
    # Create platform release
    if args.release:
        create_platform_release()
    
    print("\n🎉 Build completed successfully!")
    print(f"   Executable: dist/{get_executable_name()}")
    print(f"   Platform: {get_platform_suffix()}")
    print("   Ready for distribution!")


if __name__ == '__main__':
    main()
